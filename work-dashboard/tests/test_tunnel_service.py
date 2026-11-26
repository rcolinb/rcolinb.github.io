"""Tunnel launchd guards using temporary files and mocked process execution."""
import importlib.util
import io
import json
import os
from pathlib import Path
import plistlib
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("dashboard_tunnel_service", Path(__file__).resolve().parents[1] / "scripts" / "manage_tunnel.py")
tunnel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tunnel)


class TunnelServiceTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.config = self.root / "data" / "service-config.json"
        self.token = self.root / "data" / "cloudflare" / "tunnel.token"
        self.binary = self.root / ".tools" / "cloudflared"
        self.plist = self.root / "LaunchAgents" / (tunnel.LABEL + ".plist")
        self.token.parent.mkdir(parents=True, mode=0o700)
        self.binary.parent.mkdir(mode=0o700)
        self.binary.write_text("fixture binary, never executed")
        self.binary.chmod(0o700)
        self.secret = "private-fixture-token-must-never-be-disclosed"
        self.token.write_text(self.secret)
        self.token.chmod(0o600)
        self.settings = {"cloudflareHost": "dashboard.example.com",
                         "cloudflareIssuer": "https://team.cloudflareaccess.com",
                         "cloudflareAudience": "fixture-audience", "cloudflareEmail": "owner@example.com"}
        self.save_config()
        for name, value in [("ROOT", self.root), ("CONFIG", self.config), ("PLIST", self.plist)]:
            replacement = patch.object(tunnel, name, value)
            replacement.start()
            self.addCleanup(replacement.stop)
        mock_run = patch.object(tunnel, "run", side_effect=self.launchctl)
        self.run = mock_run.start()
        self.mock_run_patch = mock_run
        self.addCleanup(mock_run.stop)
        output = patch("sys.stdout", new_callable=io.StringIO)
        self.output = output.start()
        self.addCleanup(output.stop)
        self.loaded = False
        self.loaded_path = self.plist

    def save_config(self):
        self.config.write_text(json.dumps(self.settings))
        self.config.chmod(0o600)

    def launchctl(self, args):
        if args[0] == "print":
            return subprocess.CompletedProcess(args, 0 if self.loaded else 113,
                                               f"service = {{\n path = {self.loaded_path}\n state = running\n}}", "")
        return subprocess.CompletedProcess(args, 0, "", "")

    def save_manifest(self, overrides=None):
        self.plist.parent.mkdir(exist_ok=True)
        self.plist.write_bytes(plistlib.dumps({**tunnel.manifest(), **(overrides or {})}))
        self.plist.chmod(0o600)

    def assert_no_mutation(self):
        self.assertFalse(any(call.args[0][0] in ("bootstrap", "bootout") for call in self.run.call_args_list))

    def test_missing_or_partial_access_settings_prevent_install(self):
        for key in tunnel.CONFIG_KEYS:
            with self.subTest(key=key):
                saved = self.settings.pop(key)
                self.save_config()
                with self.assertRaises(SystemExit):
                    tunnel.install()
                self.settings[key] = saved
        self.assertFalse(self.plist.exists())
        self.assert_no_mutation()

    def test_invalid_access_settings_prevent_install(self):
        for key, value in [("cloudflareHost", "localhost"), ("cloudflareIssuer", "https://other.example.com"),
                           ("cloudflareEmail", "*@example.com"), ("cloudflareEmail", "owner@example.com\nother@example.com"),
                           ("cloudflareAudience", "two audiences")]:
            with self.subTest(key=key):
                original = self.settings[key]
                self.settings[key] = value
                self.save_config()
                with self.assertRaises(SystemExit):
                    tunnel.install()
                self.settings[key] = original
        self.assert_no_mutation()

    def test_token_permissions_and_symlinks_are_rejected(self):
        self.token.chmod(0o644)
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.token.chmod(0o600)
        real = self.token.with_suffix(".real")
        self.token.rename(real)
        self.token.symlink_to(real)
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.assert_no_mutation()

    def test_token_directory_symlink_is_rejected(self):
        real = self.token.parent.with_name("other-private")
        self.token.parent.rename(real)
        self.token.parent.symlink_to(real, target_is_directory=True)
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.assert_no_mutation()

    def test_token_wrong_owner_and_hardlink_are_rejected(self):
        original = Path.lstat
        def wrong_owner(path, *args, **kwargs):
            result = original(path, *args, **kwargs)
            if path == self.token:
                values = list(result)
                values[4] = os.getuid() + 1
                return os.stat_result(values)
            return result
        with patch.object(Path, "lstat", wrong_owner), self.assertRaises(SystemExit):
            tunnel.install()
        os.link(self.token, self.token.with_suffix(".hardlink"))
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.assert_no_mutation()

    def test_empty_and_nonregular_tokens_are_rejected(self):
        self.token.write_text("")
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.token.unlink()
        self.token.mkdir(mode=0o600)
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.assert_no_mutation()

    def test_untrusted_binary_is_rejected(self):
        self.binary.chmod(0o777)
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.binary.chmod(0o700)
        real = self.binary.with_suffix(".real")
        self.binary.rename(real)
        self.binary.symlink_to(real)
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.assert_no_mutation()

    def test_install_saves_private_guarded_manifest_without_credentials(self):
        tunnel.install()
        manifest = plistlib.loads(self.plist.read_bytes())
        self.assertEqual(manifest["ProgramArguments"], tunnel.program_arguments())
        self.assertEqual(manifest["WorkingDirectory"], str(self.root))
        self.assertEqual(manifest["StandardErrorPath"], "/dev/null")
        self.assertEqual(stat.S_IMODE(self.plist.stat().st_mode), 0o600)
        self.assertNotIn(self.secret, self.plist.read_text())
        self.assertNotIn(self.secret, self.output.getvalue())
        self.assertIn(unittest.mock.call(["bootstrap", tunnel.DOMAIN, str(self.plist)]), self.run.call_args_list)

    def test_launch_revalidates_config_and_uses_clean_token_file_command(self):
        with patch.dict(os.environ, {"TUNNEL_TOKEN": "override", "TUNNEL_URL": "http://wrong"}), patch.object(os, "execve") as execute:
            tunnel.execute_connector()
        binary, args, environment = execute.call_args.args
        self.assertEqual(binary, self.binary)
        self.assertIn("--token-file", args)
        self.assertIn(str(self.token), args)
        self.assertIn("--disable-path-normalization=false", args)
        self.assertNotIn("--token", args)
        self.assertNotIn("--url", args)
        self.assertFalse(any(key.startswith("TUNNEL_") for key in environment))
        self.assertNotIn(self.secret, repr(execute.call_args))
        self.settings.pop("cloudflareAudience")
        self.save_config()
        with patch.object(os, "execve") as execute, self.assertRaises(SystemExit):
            tunnel.execute_connector()
        execute.assert_not_called()

    def test_foreign_plist_refuses_install_stop_and_remove(self):
        self.save_manifest({"WorkingDirectory": "/another/project"})
        before = self.plist.read_bytes()
        self.loaded = True
        for action in (tunnel.install, tunnel.stop, lambda: tunnel.stop(remove=True)):
            with self.assertRaises(SystemExit):
                action()
        self.assertEqual(self.plist.read_bytes(), before)
        self.assert_no_mutation()

    def test_foreign_loaded_label_is_not_stopped(self):
        self.save_manifest()
        self.loaded = True
        self.loaded_path = Path("/another/service.plist")
        with self.assertRaises(SystemExit):
            tunnel.stop(remove=True)
        self.assertTrue(self.plist.exists())
        self.assert_no_mutation()

    def test_foreign_command_in_own_directory_is_not_replaced(self):
        self.save_manifest({"ProgramArguments": ["/bin/echo", "unrelated"]})
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.assert_no_mutation()

    def test_loaded_label_without_owned_manifest_is_not_stopped(self):
        self.loaded = True
        with self.assertRaises(SystemExit):
            tunnel.install()
        self.assertFalse(self.plist.exists())
        self.assert_no_mutation()

    def test_remove_owned_service_keeps_token_and_configuration(self):
        self.save_manifest()
        self.loaded = True
        self.config.unlink()  # Stopping remains possible after configuration breaks.
        tunnel.stop(remove=True)
        self.assertFalse(self.plist.exists())
        self.assertEqual(self.token.read_text(), self.secret)
        self.assertIn(unittest.mock.call(["bootout", tunnel.DOMAIN + "/" + tunnel.LABEL]), self.run.call_args_list)

    def test_status_is_read_only_and_does_not_claim_remote_health(self):
        self.save_manifest()
        self.loaded = True
        tunnel.status()
        self.assertIn("remote connectivity not checked", self.output.getvalue())
        self.assertIn("remote Access policy not checked", self.output.getvalue())
        self.assert_no_mutation()

    def test_failed_bootout_preserves_manifest(self):
        self.save_manifest()
        before = self.plist.read_bytes()
        self.loaded = True
        def failure(args):
            return subprocess.CompletedProcess(args, 1, "", "private diagnostic") if args[0] == "bootout" else self.launchctl(args)
        self.run.side_effect = failure
        with self.assertRaises(SystemExit) as error:
            tunnel.stop(remove=True)
        self.assertNotIn("private diagnostic", str(error.exception))
        self.assertEqual(self.plist.read_bytes(), before)

    def test_failed_bootstrap_does_not_echo_process_diagnostics(self):
        def failure(args):
            return subprocess.CompletedProcess(args, 1, "", self.secret) if args[0] == "bootstrap" else self.launchctl(args)
        self.run.side_effect = failure
        with self.assertRaises(SystemExit) as error:
            tunnel.install()
        self.assertNotIn(self.secret, str(error.exception))
        self.assertNotIn(self.secret, self.output.getvalue())
        self.assertTrue(self.plist.exists())

    def test_launchctl_timeout_is_bounded_and_sanitized(self):
        self.mock_run_patch.stop()
        with patch.object(subprocess, "run", side_effect=subprocess.TimeoutExpired("launchctl", 10, output=self.secret)) as execute:
            with self.assertRaises(SystemExit) as error:
                tunnel.run(["print", "fixture"])
        self.assertEqual(execute.call_args.kwargs["timeout"], 10)
        self.assertNotIn(self.secret, str(error.exception))


if __name__ == "__main__":
    unittest.main()
