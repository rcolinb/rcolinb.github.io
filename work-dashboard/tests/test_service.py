"""Private phone-access configuration without touching the real login service."""
import importlib.util
import io
from pathlib import Path
import plistlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("dashboard_service", Path(__file__).resolve().parents[1] / "scripts" / "manage_service.py")
service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(service)


class ServiceConfigurationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        (root / "dist").mkdir()
        (root / "dist" / "index.html").write_text("fixture")
        self.config = root / "data" / "service-config.json"
        self.root = root
        self.plist = root / "LaunchAgents" / "dashboard.plist"
        patches = [patch.object(service, "ROOT", root), patch.object(service, "CONFIG", self.config),
                   patch.object(service, "PLIST", self.plist), patch.object(service, "installed", return_value=False),
                   patch.object(service, "run", return_value=subprocess.CompletedProcess([], 0, "", "")),
                   patch("sys.stdout", new_callable=io.StringIO)]
        for replacement in patches:
            replacement.start()
            self.addCleanup(replacement.stop)

    def test_private_host_needs_owner_before_install(self):
        with self.assertRaises(SystemExit):
            service.install("mac.example.ts.net")
        self.assertFalse(self.config.exists())
        self.assertFalse(self.plist.exists())

    def test_owner_survives_later_service_restart(self):
        service.install("mac.example.ts.net", "owner@example.com")
        service.install()
        environment = plistlib.loads(self.plist.read_bytes())["EnvironmentVariables"]
        self.assertEqual(environment["DASHBOARD_ALLOWED_HOSTS"], "mac.example.ts.net")
        self.assertEqual(environment["DASHBOARD_ALLOWED_TAILSCALE_LOGIN"], "owner@example.com")
        self.assertEqual(self.config.stat().st_mode & 0o777, 0o600)

    def test_invalid_identity_is_not_persisted(self):
        with self.assertRaises(SystemExit):
            service.install("mac.example.ts.net", "owner@example.com\nother@example.com")
        self.assertFalse(self.config.exists())

    def test_local_service_needs_no_tailscale_account(self):
        service.install()
        environment = plistlib.loads(self.plist.read_bytes())["EnvironmentVariables"]
        self.assertNotIn("DASHBOARD_ALLOWED_HOSTS", environment)
        self.assertNotIn("DASHBOARD_ALLOWED_TAILSCALE_LOGIN", environment)

    def cloudflare_settings(self):
        return dict(cloudflare_host='dashboard.example.com',
                    cloudflare_issuer='https://owner.cloudflareaccess.com',
                    cloudflare_audience='a' * 64, cloudflare_email='owner@example.com')

    def fake_virtual_environment(self):
        python = self.root / '.venv' / 'bin' / 'python'
        python.parent.mkdir(parents=True)
        python.touch()
        return python

    def test_cloudflare_configuration_is_all_or_none(self):
        with self.assertRaises(SystemExit):
            service.install(cloudflare_host='dashboard.example.com')
        self.assertFalse(self.config.exists())
        self.assertFalse(self.plist.exists())

    def test_cloudflare_uses_isolated_runtime_and_preserves_tailscale(self):
        python = self.fake_virtual_environment()
        service.install('mac.example.ts.net', 'owner@example.com', **self.cloudflare_settings())
        service.install()
        manifest = plistlib.loads(self.plist.read_bytes())
        environment = manifest['EnvironmentVariables']
        self.assertEqual(manifest['ProgramArguments'][0], str(python))
        self.assertEqual(environment['DASHBOARD_CLOUDFLARE_HOST'], 'dashboard.example.com')
        self.assertEqual(environment['DASHBOARD_CLOUDFLARE_ISSUER'], 'https://owner.cloudflareaccess.com')
        self.assertEqual(environment['DASHBOARD_CLOUDFLARE_AUDIENCE'], 'a' * 64)
        self.assertEqual(environment['DASHBOARD_CLOUDFLARE_EMAIL'], 'owner@example.com')
        self.assertEqual(environment['DASHBOARD_ALLOWED_HOSTS'], 'mac.example.ts.net')
        self.assertEqual(environment['DASHBOARD_ALLOWED_TAILSCALE_LOGIN'], 'owner@example.com')

    def test_missing_cloudflare_dependencies_leave_existing_config_untouched(self):
        service.install('mac.example.ts.net', 'owner@example.com')
        previous_config, previous_plist = self.config.read_bytes(), self.plist.read_bytes()
        with self.assertRaises(SystemExit):
            service.install(**self.cloudflare_settings())
        self.assertEqual(self.config.read_bytes(), previous_config)
        self.assertEqual(self.plist.read_bytes(), previous_plist)

    def test_cloudflare_can_be_disabled_without_losing_tailscale(self):
        self.fake_virtual_environment()
        service.install('mac.example.ts.net', 'owner@example.com', **self.cloudflare_settings())
        service.install(disable_cloudflare=True)
        environment = plistlib.loads(self.plist.read_bytes())['EnvironmentVariables']
        self.assertFalse(any(key.startswith('DASHBOARD_CLOUDFLARE_') for key in environment))
        self.assertEqual(environment['DASHBOARD_ALLOWED_TAILSCALE_LOGIN'], 'owner@example.com')
