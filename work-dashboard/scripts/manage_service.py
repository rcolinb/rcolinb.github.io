#!/usr/bin/env python3
"""Install, inspect, or stop this dashboard's per-user macOS login service."""
import argparse
import json
import os
from pathlib import Path
import plistlib
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
LABEL = 'com.colinblenis.work-dashboard'
PLIST = Path.home() / 'Library' / 'LaunchAgents' / (LABEL + '.plist')
DOMAIN = 'gui/' + str(os.getuid())
CONFIG = ROOT / 'data' / 'service-config.json'


def run(args, check=True):
    return subprocess.run(args, check=check, text=True, capture_output=True)


def installed():
    return run(['launchctl', 'print', DOMAIN + '/' + LABEL], check=False).returncode == 0


def install(host=None, login=None, *, cloudflare_host=None, cloudflare_issuer=None,
            cloudflare_audience=None, cloudflare_email=None, disable_cloudflare=False):
    if not (ROOT / 'dist' / 'index.html').exists():
        raise SystemExit('Build the dashboard before installing the service.')
    data = ROOT / 'data'
    data.mkdir(mode=0o700, exist_ok=True)
    data.chmod(0o700)
    logs = data / 'logs'
    logs.mkdir(mode=0o700, exist_ok=True)
    saved = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    if host is not None:
        if not host.endswith('.ts.net') or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-.' for c in host):
            raise SystemExit('Use the exact lowercase Tailscale DNS hostname, without scheme or path.')
        saved['tailscaleHost'] = host
    if login is not None:
        if not login or len(login) > 320 or any(ord(c) < 33 or ord(c) > 126 for c in login):
            raise SystemExit('Use the exact Tailscale account login, without spaces or control characters.')
        saved['tailscaleLogin'] = login
    if saved.get('tailscaleHost') and not saved.get('tailscaleLogin'):
        raise SystemExit('Private phone access also requires --tailscale-login for the account allowed to use this dashboard.')
    cloudflare_values = {
        'cloudflareHost': cloudflare_host, 'cloudflareIssuer': cloudflare_issuer,
        'cloudflareAudience': cloudflare_audience, 'cloudflareEmail': cloudflare_email,
    }
    if disable_cloudflare and any(value is not None for value in cloudflare_values.values()):
        raise SystemExit('Do not combine --disable-cloudflare with Cloudflare configuration.')
    if disable_cloudflare:
        for key in cloudflare_values:
            saved.pop(key, None)
    else:
        saved.update({key: value for key, value in cloudflare_values.items() if value is not None})
    from server.cloudflare_access import validate_config
    try:
        cloudflare = validate_config(
            host=saved.get('cloudflareHost', ''), issuer=saved.get('cloudflareIssuer', ''),
            audience=saved.get('cloudflareAudience', ''), email=saved.get('cloudflareEmail', ''),
        )
    except ValueError as exc:
        raise SystemExit(str(exc))
    python = str(ROOT / '.venv' / 'bin' / 'python') if cloudflare else sys.executable
    if cloudflare:
        if not Path(python).is_file():
            raise SystemExit('Install requirements.txt into the project .venv before enabling Cloudflare.')
        dependency_check = run([python, '-c', 'import jwt, cryptography'], check=False)
        if dependency_check.returncode:
            raise SystemExit('Install requirements.txt into the project .venv before enabling Cloudflare.')
    environment = {'PYTHONUNBUFFERED': '1', 'LANG': 'en_US.UTF-8'}
    if saved.get('tailscaleHost'):
        environment['DASHBOARD_ALLOWED_HOSTS'] = saved['tailscaleHost']
        environment['DASHBOARD_ALLOWED_TAILSCALE_LOGIN'] = saved['tailscaleLogin']
    if cloudflare:
        for key, value in cloudflare.items():
            environment['DASHBOARD_CLOUDFLARE_' + key.upper()] = value
    manifest = {
        'Label': LABEL,
        'ProgramArguments': [python, '-m', 'server.app', '--port', '8767'],
        'WorkingDirectory': str(ROOT),
        'EnvironmentVariables': environment,
        'RunAtLoad': True,
        'KeepAlive': {'SuccessfulExit': False},
        'ThrottleInterval': 15,
        'Umask': 0o077,
        'StandardOutPath': str(logs / 'dashboard.out.log'),
        'StandardErrorPath': str(logs / 'dashboard.err.log'),
    }
    PLIST.parent.mkdir(parents=True, exist_ok=True)
    if PLIST.exists():
        existing = plistlib.loads(PLIST.read_bytes())
        if existing.get('Label') != LABEL or existing.get('WorkingDirectory') != str(ROOT):
            raise SystemExit('A different service already uses this label. No changes made.')
    # Validate all configuration and runtime dependencies before replacing a
    # working service or persisting an incomplete authentication configuration.
    if host is not None or login is not None or disable_cloudflare or any(value is not None for value in cloudflare_values.values()):
        CONFIG.write_text(json.dumps(saved, indent=2) + '\n')
        CONFIG.chmod(0o600)
    if installed():
        run(['launchctl', 'bootout', DOMAIN + '/' + LABEL])
    PLIST.write_bytes(plistlib.dumps(manifest))
    PLIST.chmod(0o600)
    result = run(['launchctl', 'bootstrap', DOMAIN, str(PLIST)], check=False)
    if result.returncode:
        raise SystemExit(result.stderr.strip() or 'Could not start the dashboard login service.')
    print('Dashboard service installed. Local address: http://127.0.0.1:8767')


def stop(remove=False):
    if installed():
        run(['launchctl', 'bootout', DOMAIN + '/' + LABEL])
    if remove and PLIST.exists():
        manifest = plistlib.loads(PLIST.read_bytes())
        if manifest.get('WorkingDirectory') != str(ROOT):
            raise SystemExit('Service path differs; leaving its file untouched.')
        PLIST.unlink()
    print('Dashboard service stopped.' + (' Login startup removed.' if remove else ''))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['install', 'status', 'stop', 'remove'])
    parser.add_argument('--tailscale-host')
    parser.add_argument('--tailscale-login')
    parser.add_argument('--cloudflare-host')
    parser.add_argument('--cloudflare-issuer')
    parser.add_argument('--cloudflare-audience')
    parser.add_argument('--cloudflare-email')
    parser.add_argument('--disable-cloudflare', action='store_true', help='Remove Cloudflare access configuration while retaining local/Tailscale access.')
    args = parser.parse_args()
    if args.action == 'install':
        install(args.tailscale_host, args.tailscale_login, cloudflare_host=args.cloudflare_host,
                cloudflare_issuer=args.cloudflare_issuer, cloudflare_audience=args.cloudflare_audience,
                cloudflare_email=args.cloudflare_email, disable_cloudflare=args.disable_cloudflare)
    elif args.action in ('stop', 'remove'):
        stop(args.action == 'remove')
    else:
        print('Login service: ' + ('running' if installed() else 'not running'))
        try:
            with urllib.request.urlopen('http://127.0.0.1:8767/api/health', timeout=3) as response:
                print('Local server: reachable (' + str(response.status) + ')')
        except (OSError, urllib.error.URLError):
            print('Local server: not reachable')


if __name__ == '__main__':
    main()
