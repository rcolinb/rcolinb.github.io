#!/usr/bin/env python3
"""Manage this dashboard's guarded, per-user Cloudflare Tunnel login service.

Configure Access and the remotely managed route separately before installing.
This helper never creates accounts, DNS records, routes, or quick tunnels.
"""
import argparse
import json
import os
from pathlib import Path
import plistlib
import re
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server.cloudflare_access import validate_config

LABEL = "com.colinblenis.work-dashboard-tunnel"
PLIST = Path.home() / "Library" / "LaunchAgents" / (LABEL + ".plist")
CONFIG = ROOT / "data" / "service-config.json"
DOMAIN = "gui/" + str(os.getuid())
LAUNCHCTL = "/bin/launchctl"
CONFIG_KEYS = ("cloudflareHost", "cloudflareIssuer", "cloudflareAudience", "cloudflareEmail")


def fail(message):
    raise SystemExit(message)


def regular_owned_file(path, description, *, private=False, executable=False):
    """Use lstat so a symlink is never accepted as a trusted file."""
    try:
        info = path.lstat()
    except OSError:
        fail(description + " is missing or cannot be inspected.")
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid():
        fail(description + " must be a regular, non-symlink file owned by this user.")
    mode = stat.S_IMODE(info.st_mode)
    if private and mode != 0o600:
        fail(description + " must have permissions 0600.")
    if mode & 0o022:
        fail(description + " must not be writable by other users.")
    if executable and not os.access(path, os.X_OK):
        fail(description + " is not executable.")
    return info


def check_local_parents(path):
    """Reject substituted directories between the checkout and a local file."""
    if not path.is_relative_to(ROOT):
        fail("Tunnel files must stay inside this dashboard checkout.")
    for parent in path.parents:
        try:
            info = parent.lstat()
        except OSError:
            fail("A required tunnel directory is missing or cannot be inspected.")
        if (not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid()
                or stat.S_IMODE(info.st_mode) & 0o022):
            fail("Tunnel directories must be owned by this user, non-symlink, and not writable by others.")
        if parent == ROOT:
            break


def readiness():
    """Validate without reading or printing the tunnel token."""
    check_local_parents(CONFIG)
    regular_owned_file(CONFIG, "Dashboard service configuration")
    try:
        if CONFIG.stat().st_size > 65536:
            fail("Dashboard service configuration is unexpectedly large.")
        saved = json.loads(CONFIG.read_text())
        if not isinstance(saved, dict):
            raise ValueError()
        configured = validate_config(*(saved.get(key, "") for key in CONFIG_KEYS))
    except (OSError, ValueError, TypeError):
        fail("Save a valid Cloudflare host, issuer, audience, and exact owner email in data/service-config.json first.")
    if not configured:
        fail("Cloudflare Access is not configured. Configure all four Cloudflare service settings before starting the tunnel.")
    if "*" in configured["email"]:
        fail("Cloudflare Access must name the exact owner email, not a wildcard.")

    binary = ROOT / ".tools" / "cloudflared"
    check_local_parents(binary)
    regular_owned_file(binary, "Bundled cloudflared", executable=True)
    token = ROOT / "data" / "cloudflare" / "tunnel.token"
    check_local_parents(token)
    info = regular_owned_file(token, "Tunnel token", private=True)
    if not 0 < info.st_size <= 16384 or info.st_nlink != 1:
        fail("Tunnel token must be nonempty, bounded, and not hard-linked.")
    return binary, token


def connector_arguments(binary, token):
    return [str(binary), "tunnel", "--config", "/dev/null", "--no-autoupdate",
            "--metrics", "127.0.0.1:0", "--loglevel", "warn", "run",
            "--token-file", str(token), "--disable-path-normalization=false"]


def execute_connector():
    """Private launchd entrypoint: repeat guards on every restart."""
    binary, token = readiness()
    environment = {"HOME": str(Path.home()), "PATH": "/usr/bin:/bin", "LANG": "en_US.UTF-8"}
    try:
        os.execve(binary, connector_arguments(binary, token), environment)
    except OSError:
        fail("Could not start the verified cloudflared binary.")


def program_arguments():
    return [str(Path(sys.executable).resolve()), "-I", str(ROOT / "scripts" / "manage_tunnel.py"), "_run"]


def manifest():
    return {
        "Label": LABEL,
        "ProgramArguments": program_arguments(),
        "WorkingDirectory": str(ROOT),
        "RunAtLoad": True,
        "KeepAlive": {"SuccessfulExit": False},
        "ThrottleInterval": 30,
        "Umask": 0o077,
        # Token-related errors must never enter persistent service logs.
        "StandardOutPath": "/dev/null",
        "StandardErrorPath": "/dev/null",
    }


def run(arguments):
    try:
        return subprocess.run([LAUNCHCTL, *arguments], text=True, capture_output=True,
                              timeout=10, check=False, env={"PATH": "/usr/bin:/bin"})
    except (OSError, subprocess.TimeoutExpired):
        fail("launchctl was unavailable or timed out; no further service changes were attempted.")


def owned_state():
    """Check ownership before any bootout or replacement of an existing label."""
    existing = None
    if PLIST.exists() or PLIST.is_symlink():
        info = regular_owned_file(PLIST, "Tunnel launch agent", private=True)
        if info.st_size > 65536:
            fail("Existing tunnel launch agent is unexpectedly large; leaving it untouched.")
        try:
            existing = plistlib.loads(PLIST.read_bytes())
        except (OSError, ValueError, plistlib.InvalidFileException):
            fail("Existing tunnel launch agent could not be validated; leaving it untouched.")
        expected = manifest()
        if not isinstance(existing, dict) or any(existing.get(key) != expected[key] for key in
                                                ("Label", "WorkingDirectory", "ProgramArguments")):
            fail("A different service uses this launch-agent path or label; leaving it untouched.")

    result = run(["print", DOMAIN + "/" + LABEL])
    if result.returncode:
        return None
    path = re.search(r"^\s*path = (.+)$", result.stdout, re.MULTILINE)
    if existing is None or not path or path.group(1).strip() != str(PLIST):
        fail("The loaded label cannot be verified as this dashboard's service; leaving it untouched.")
    return result.stdout


def install():
    readiness()
    loaded = owned_state()
    if PLIST.parent.is_symlink():
        fail("The LaunchAgents directory must not be a symlink.")
    PLIST.parent.mkdir(parents=True, exist_ok=True)
    info = PLIST.parent.stat()
    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o022:
        fail("The LaunchAgents directory must be owned by this user and not writable by others.")
    if loaded is not None and run(["bootout", DOMAIN + "/" + LABEL]).returncode:
        fail("Could not stop the existing tunnel service; its launch agent was not changed.")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=PLIST.parent, prefix=".dashboard-tunnel-", delete=False) as output:
            temporary = Path(output.name)
            os.fchmod(output.fileno(), 0o600)
            output.write(plistlib.dumps(manifest()))
        os.replace(temporary, PLIST)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    if run(["bootstrap", DOMAIN, str(PLIST)]).returncode:
        fail("The tunnel launch agent was saved, but launchctl could not load it. Run status to inspect readiness.")
    print("Tunnel login service installed. Remote connectivity and Access protection still require verification.")


def stop(remove=False):
    loaded = owned_state()
    if loaded is not None and run(["bootout", DOMAIN + "/" + LABEL]).returncode:
        fail("Could not stop the tunnel service; its launch agent was not removed.")
    if remove and PLIST.exists():
        PLIST.unlink()
    print("Tunnel service stopped." + (" Login startup removed; token retained." if remove else ""))


def status():
    loaded = owned_state()
    if loaded is None:
        print("Tunnel login service: not loaded")
    elif re.search(r"^\s*state = running\s*$", loaded, re.MULTILINE):
        print("Tunnel login service: process running (remote connectivity not checked)")
    else:
        print("Tunnel login service: loaded, process not running")
    try:
        readiness()
    except SystemExit as error:
        print("Startup readiness: " + str(error))
    else:
        print("Startup readiness: local guards passed (remote Access policy not checked)")


def main():
    if sys.argv[1:] == ["_run"]:
        execute_connector()
        return
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install", "status", "stop", "remove"])
    args = parser.parse_args()
    if args.action == "install":
        install()
    elif args.action == "status":
        status()
    else:
        stop(remove=args.action == "remove")


if __name__ == "__main__":
    main()
