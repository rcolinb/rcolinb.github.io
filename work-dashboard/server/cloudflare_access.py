"""Validate Cloudflare Access application tokens for one configured owner.

Cloudflare's email header and token-supplied key URLs are never trusted. Signing
keys come only from the configured team's HTTPS JWKS endpoint. Dependencies are
loaded lazily so local and Tailscale-only installations remain stdlib-only.
"""

import importlib
import os
import re
import threading


MAX_ASSERTION_LENGTH = 16384
DNS_LABEL = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
HOST_PATTERN = re.compile(r"^(?:" + DNS_LABEL + r"\.)+" + DNS_LABEL + r"$")
ISSUER_PATTERN = re.compile(r"^https://" + DNS_LABEL + r"\.cloudflareaccess\.com/?$")
ASSERTION_PATTERN = re.compile(r"^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$")
ENV_NAMES = {
    "host": "DASHBOARD_CLOUDFLARE_HOST",
    "issuer": "DASHBOARD_CLOUDFLARE_ISSUER",
    "audience": "DASHBOARD_CLOUDFLARE_AUDIENCE",
    "email": "DASHBOARD_CLOUDFLARE_EMAIL",
}


class AccessDenied(Exception):
    status = 403
    code = "untrusted_identity"

    def __init__(self):
        super().__init__("Sign in with the account allowed to use this dashboard.")


class AccessUnavailable(AccessDenied):
    status = 503
    code = "access_unavailable"

    def __init__(self):
        Exception.__init__(self, "Identity verification is temporarily unavailable. Try again shortly.")


def validate_config(host="", issuer="", audience="", email=""):
    """Return normalized config, or {} when absent; reject partial settings."""
    values = {"host": host, "issuer": issuer, "audience": audience, "email": email}
    if any(not isinstance(value, str) for value in values.values()):
        raise ValueError("Cloudflare Access configuration values must be text.")
    values = {key: value.strip() for key, value in values.items()}
    if not any(values.values()):
        return {}
    if not all(values.values()):
        raise ValueError("Cloudflare Access requires host, issuer, audience, and owner email together.")
    values["host"] = values["host"].lower()
    host = values["host"]
    if (len(host) > 253 or not HOST_PATTERN.fullmatch(host)
            or host.endswith(".localhost") or all(part.isdigit() for part in host.split("."))):
        raise ValueError("Cloudflare Access host must be an exact nonlocal DNS hostname, without a scheme, port, or path.")
    if not ISSUER_PATTERN.fullmatch(values["issuer"]):
        raise ValueError("Cloudflare Access issuer must be https://TEAM.cloudflareaccess.com.")
    values["issuer"] = values["issuer"].rstrip("/")
    if len(values["audience"]) > 256 or any(ord(c) < 33 or ord(c) > 126 for c in values["audience"]):
        raise ValueError("Cloudflare Access audience must be a single application AUD without whitespace.")
    email = values["email"]
    if (len(email) > 320 or email.count("@") != 1 or not all(email.split("@"))
            or any(ord(c) < 33 or ord(c) > 126 for c in email)):
        raise ValueError("Cloudflare Access owner must be an exact email address without whitespace.")
    return values


class CloudflareAccess:
    def __init__(self, host="", issuer="", audience="", email="", jwks_client=None):
        self.config = validate_config(host, issuer, audience, email)
        self.host = self.config.get("host", "")
        self._jwt = None
        self._jwks_client = jwks_client
        self._lock = threading.RLock()

    @classmethod
    def from_env(cls, environment=None):
        environment = os.environ if environment is None else environment
        return cls(**{key: environment.get(name, "") for key, name in ENV_NAMES.items()})

    def _libraries(self):
        with self._lock:
            if self._jwt is None:
                try:
                    jwt = importlib.import_module("jwt")
                    importlib.import_module("cryptography")
                    if self._jwks_client is None:
                        self._jwks_client = jwt.PyJWKClient(
                            self.config["issuer"] + "/cdn-cgi/access/certs",
                            cache_keys=False, cache_jwk_set=True, lifespan=300, timeout=5,
                        )
                except Exception:
                    raise AccessUnavailable() from None
                self._jwt = jwt
            return self._jwt

    def verify(self, assertion):
        """Return verified claims or raise a safe error without disclosing tokens."""
        if (not self.config or not isinstance(assertion, str)
                or len(assertion) > MAX_ASSERTION_LENGTH
                or not ASSERTION_PATTERN.fullmatch(assertion)):
            raise AccessDenied()
        jwt = self._libraries()
        try:
            # Reading the header is only a bounded preflight; it grants no trust.
            header = jwt.get_unverified_header(assertion)
            kid = header.get("kid")
            if (header.get("alg") != "RS256" or not isinstance(kid, str)
                    or not kid or len(kid) > 256 or header.get("crit")):
                raise AccessDenied()
            with self._lock:
                signing_key = self._jwks_client.get_signing_key_from_jwt(assertion)
            if signing_key.algorithm_name != "RS256":
                raise AccessDenied()
            claims = jwt.decode(
                assertion, signing_key.key, algorithms=["RS256"],
                issuer=self.config["issuer"], audience=self.config["audience"],
                leeway=0,
                options={"require": ["iss", "aud", "exp", "email"],
                         "verify_signature": True, "verify_iss": True,
                         "verify_aud": True, "verify_exp": True,
                         "verify_nbf": True, "verify_iat": True},
            )
            if claims.get("email") != self.config["email"]:
                raise AccessDenied()
            return claims
        except AccessDenied:
            raise
        except jwt.PyJWKClientConnectionError:
            raise AccessUnavailable() from None
        except Exception:
            # Malformed claims, unknown keys, invalid signatures, and unexpected
            # validation errors all fail closed with no token or diagnostic echo.
            raise AccessDenied() from None
