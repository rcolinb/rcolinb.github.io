import http.client
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from server.app import create_server
from server.cloudflare_access import (
    AccessDenied, AccessUnavailable, CloudflareAccess, ENV_NAMES, validate_config,
)

try:
    import jwt
    from cryptography.hazmat.primitives.asymmetric import rsa
except ImportError:
    jwt = None
    rsa = None


CONFIG = {"host": "dashboard.example.com", "issuer": "https://example.cloudflareaccess.com",
          "audience": "test-application-audience", "email": "owner@example.com"}


class ConfigurationTests(unittest.TestCase):
    def test_disabled_configuration_does_not_load_optional_libraries(self):
        with patch("server.cloudflare_access.importlib.import_module", side_effect=ImportError("not installed")) as load:
            self.assertEqual(validate_config(), {})
            access = CloudflareAccess.from_env({})
            self.assertEqual(access.host, "")
            with self.assertRaises(AccessDenied):
                access.verify("a.b.c")
            load.assert_not_called()

    def test_all_or_none_and_exact_host_validation(self):
        self.assertEqual(validate_config(**CONFIG), CONFIG)
        for field in CONFIG:
            with self.subTest(missing=field), self.assertRaises(ValueError):
                validate_config(**dict(CONFIG, **{field: ""}))
        for host in ("localhost", "thing.localhost", "127.0.0.1", "::1", "*.example.com",
                     "https://dashboard.example.com", "dashboard.example.com:443", "dashboard.example.com/",
                     "dashboard.example.com.", "dashboard.example.com?query", "-invalid.example.com"):
            with self.subTest(host=host), self.assertRaises(ValueError):
                validate_config(**dict(CONFIG, host=host))
        for issuer in ("http://example.cloudflareaccess.com", "https://example.cloudflareaccess.com.evil.test",
                       "https://example.cloudflareaccess.com/path", "https://example.cloudflareaccess.com:443",
                       "https://owner@example.cloudflareaccess.com", "https://example.cloudflareaccess.com?x=1"):
            with self.subTest(issuer=issuer), self.assertRaises(ValueError):
                validate_config(**dict(CONFIG, issuer=issuer))
        self.assertEqual(validate_config(**dict(CONFIG, issuer=CONFIG["issuer"] + "/")), CONFIG)
        with self.assertRaises(ValueError):
            validate_config(**dict(CONFIG, audience="two audiences"))
        with self.assertRaises(ValueError):
            validate_config(**dict(CONFIG, email="not an address"))

    def test_environment_names_and_startup_failure_precede_database_creation(self):
        environment = {ENV_NAMES[key]: value for key, value in CONFIG.items()}
        self.assertEqual(CloudflareAccess.from_env(environment).config, CONFIG)
        with tempfile.TemporaryDirectory() as folder:
            data = Path(folder) / "not-created"
            with patch.dict(os.environ, {ENV_NAMES["host"]: CONFIG["host"]}, clear=True):
                with self.assertRaises(ValueError):
                    create_server(port=0, data_dir=data, start_sync=False)
            self.assertFalse(data.exists())


class _SignedTokenFixture:
    @classmethod
    def setUpClass(cls):
        cls.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.jwk = dict(jwt.algorithms.RSAAlgorithm.to_jwk(cls.key.public_key(), as_dict=True), kid="current-key", alg="RS256", use="sig")
        cls.other_jwk = dict(jwt.algorithms.RSAAlgorithm.to_jwk(cls.other_key.public_key(), as_dict=True), kid="new-key", alg="RS256", use="sig")

    def setUp(self):
        self.client = jwt.PyJWKClient(CONFIG["issuer"] + "/cdn-cgi/access/certs", cache_keys=False, timeout=5)
        self.fetch_patch = patch.object(self.client, "fetch_data", return_value={"keys": [self.jwk]})
        self.fetch = self.fetch_patch.start()
        self.addCleanup(self.fetch_patch.stop)
        self.access = CloudflareAccess(**CONFIG, jwks_client=self.client)

    def claims(self, **updates):
        now = int(time.time())
        values = {"iss": CONFIG["issuer"], "aud": [CONFIG["audience"]], "email": CONFIG["email"],
                  "sub": "test-owner-id", "iat": now - 10, "exp": now + 300}
        values.update(updates)
        return values

    def token(self, claims=None, key=None, headers=None):
        return jwt.encode(claims or self.claims(), key or self.key, algorithm="RS256",
                          headers=headers or {"kid": "current-key"})


@unittest.skipUnless(jwt is not None and rsa is not None, "Cloudflare tests require requirements.txt")
class SignedTokenTests(_SignedTokenFixture, unittest.TestCase):
    def test_valid_signature_and_exact_owner_are_accepted(self):
        claims = self.claims()
        self.assertEqual(self.access.verify(self.token(claims)), claims)
        self.fetch.assert_called()

    def test_expired_wrong_issuer_audience_owner_and_future_claims_are_rejected(self):
        invalid_claims = [self.claims(exp=int(time.time()) - 1),
                          self.claims(iss="https://other.cloudflareaccess.com"),
                          self.claims(aud=["other-application"]),
                          self.claims(email="other@example.com"),
                          self.claims(nbf=int(time.time()) + 300),
                          self.claims(iat=int(time.time()) + 300)]
        for claims in invalid_claims:
            with self.subTest(claims=claims), self.assertRaises(AccessDenied):
                self.access.verify(self.token(claims))

    def test_required_claims_and_valid_signature_are_enforced(self):
        for missing in ("iss", "aud", "exp", "email"):
            claims = self.claims()
            claims.pop(missing)
            with self.subTest(missing=missing), self.assertRaises(AccessDenied):
                self.access.verify(self.token(claims))
        with self.assertRaises(AccessDenied):
            self.access.verify(self.token(key=self.other_key))

    def test_missing_malformed_duplicate_and_unbounded_assertions_fail_closed(self):
        valid = self.token()
        for assertion in (None, "", "not-a-token", valid + "," + valid, "a" * 16385, "\u00e9.a.b"):
            with self.subTest(kind=type(assertion).__name__), self.assertRaises(AccessDenied):
                self.access.verify(assertion)

    def test_algorithm_confusion_and_missing_key_id_do_not_fetch_keys(self):
        tokens = [jwt.encode(self.claims(), "fixture-secret-longer-than-thirty-two-bytes", algorithm="HS256", headers={"kid": "current-key"}),
                  jwt.encode(self.claims(), None, algorithm="none", headers={"kid": "current-key"}),
                  self.token(headers={"typ": "JWT"}),
                  self.token(headers={"kid": "current-key", "crit": ["unexpected"]})]
        for token in tokens:
            with self.assertRaises(AccessDenied):
                self.access.verify(token)
        self.fetch.assert_not_called()

    def test_token_supplied_key_url_is_ignored_and_rotation_is_supported(self):
        token = self.token(headers={"kid": "current-key", "jku": "http://127.0.0.1/secrets"})
        self.assertEqual(self.access.verify(token)["email"], CONFIG["email"])
        self.assertEqual(self.client.uri, CONFIG["issuer"] + "/cdn-cgi/access/certs")
        self.fetch.return_value = {"keys": [self.jwk, self.other_jwk]}
        rotated = self.token(key=self.other_key, headers={"kid": "new-key"})
        self.assertEqual(self.access.verify(rotated)["email"], CONFIG["email"])

    def test_unknown_signing_key_fails_closed(self):
        with self.assertRaises(AccessDenied):
            self.access.verify(self.token(headers={"kid": "unknown-key"}))

    def test_unreachable_jwks_without_cached_keys_fails_closed(self):
        self.fetch.side_effect = jwt.PyJWKClientConnectionError("private diagnostic")
        with self.assertRaises(AccessUnavailable) as error:
            self.access.verify(self.token())
        self.assertNotIn("private diagnostic", str(error.exception))

    def test_missing_dependencies_fail_closed_only_for_cloudflare(self):
        access = CloudflareAccess(**CONFIG)
        with patch("server.cloudflare_access.importlib.import_module", side_effect=ImportError("missing")):
            with self.assertRaises(AccessUnavailable):
                access.verify(self.token())


@unittest.skipUnless(jwt is not None and rsa is not None, "Cloudflare tests require requirements.txt")
class CloudflareHTTPTests(_SignedTokenFixture, unittest.TestCase):
    def setUp(self):
        super().setUp()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        static = root / "dist"
        static.mkdir()
        (static / "index.html").write_text("<!doctype html><title>Private dashboard</title>")
        self.server = create_server(port=0, data_dir=root / "data", static_dir=static, start_sync=False,
                                    allowed_hosts=["work.example.ts.net"], allowed_tailscale_login=CONFIG["email"],
                                    cloudflare_access=self.access)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.close_server)

    def close_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(2)

    def request(self, headers, path="/api/health", method="GET", body=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        connection.putrequest(method, path, skip_host=True)
        for key, value in headers:
            connection.putheader(key, value)
        payload = json.dumps(body).encode() if body is not None else b""
        if body is not None:
            connection.putheader("Content-Length", str(len(payload)))
        connection.endheaders(payload)
        response = connection.getresponse()
        raw = response.read()
        result = (response.status, dict(response.getheaders()), raw)
        connection.close()
        return result

    def test_cloudflare_owner_can_read_and_mutate_with_existing_csrf(self):
        headers = [("Host", CONFIG["host"]), ("Cf-Access-Jwt-Assertion", self.token())]
        status, response_headers, payload = self.request(headers, "/api/state")
        self.assertEqual(status, 200)
        self.assertEqual(response_headers["Cache-Control"], "no-store")
        state = json.loads(payload)
        status, _, _ = self.request(headers, "/api/tasks", "POST", {"title": "Rejected without CSRF"})
        self.assertEqual(status, 403)
        authenticated = headers + [("Origin", "https://" + CONFIG["host"]), ("Content-Type", "application/json"),
                                   ("X-Dashboard-Token", state["csrfToken"])]
        status, _, _ = self.request(authenticated, "/api/tasks", "POST", {"title": "Owner's fixture idea"})
        self.assertEqual(status, 201)

    def test_missing_duplicate_spoofed_and_wrong_owner_identity_are_rejected(self):
        token = self.token()
        invalid = [[], [("Cf-Access-Authenticated-User-Email", CONFIG["email"])],
                   [("Tailscale-User-Login", CONFIG["email"])],
                   [("Cf-Access-Jwt-Assertion", "invalid")],
                   [("Cf-Access-Jwt-Assertion", token), ("Cf-Access-Jwt-Assertion", token)],
                   [("Cf-Access-Jwt-Assertion", self.token(self.claims(email="other@example.com"))),
                    ("Cf-Access-Authenticated-User-Email", CONFIG["email"])]]
        for extra in invalid:
            for path in ("/", "/api/state"):
                with self.subTest(path=path, headers=[key for key, _ in extra]):
                    status, headers, body = self.request([("Host", CONFIG["host"])] + extra, path)
                    self.assertEqual(status, 403)
                    self.assertEqual(headers["Cache-Control"], "no-store")
                    self.assertNotIn(CONFIG["email"].encode(), body)
                    self.assertNotIn(token.encode(), body)

    def test_exact_host_and_origin_and_authentication_modes_are_preserved(self):
        token = self.token()
        status, _, _ = self.request([("Host", "localhost")])
        self.assertEqual(status, 200)
        status, _, _ = self.request([("Host", "work.example.ts.net"), ("Tailscale-User-Login", CONFIG["email"])])
        self.assertEqual(status, 200)
        for host in ("dashboard.example.com.attacker.invalid", "example.com", "localhost", "work.example.ts.net"):
            headers = [("Host", host), ("Cf-Access-Jwt-Assertion", token), ("Tailscale-User-Login", CONFIG["email"])]
            status, _, _ = self.request(headers)
            self.assertEqual(status, 403, host)
        headers = [("Host", CONFIG["host"]), ("Cf-Access-Jwt-Assertion", token), ("Origin", "https://attacker.invalid")]
        self.assertEqual(self.request(headers)[0], 403)

    def test_dependency_failure_returns_safe_503_and_local_access_still_works(self):
        self.server.cloudflare_access = CloudflareAccess(**CONFIG)
        with patch("server.cloudflare_access.importlib.import_module", side_effect=ImportError("not installed")):
            status, _, payload = self.request([("Host", CONFIG["host"]), ("Cf-Access-Jwt-Assertion", self.token())])
            self.assertEqual(status, 503)
            self.assertEqual(json.loads(payload)["code"], "access_unavailable")
            self.assertEqual(self.request([("Host", "localhost")])[0], 200)


if __name__ == "__main__":
    unittest.main()
