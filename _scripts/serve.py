#!/usr/bin/env python3
"""Minimal static dev server for local preview.

Serves the repository root on http://localhost:4173 without ever calling
os.getcwd(), so it runs even when spawned with an inaccessible working
directory (e.g. sandboxed preview harnesses). Usage:

    python3 _scripts/serve.py [port]
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Resolve the site root from this file's own path; fall back to a relative
# parent if __file__ is relative (avoids os.getcwd()-based abspath).
_here = os.path.dirname(__file__) or "."
ROOT = os.path.normpath(os.path.join(_here, ".."))

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_error(self, code, message=None, explain=None):
        # Serve the site's own 404 page for missing paths.
        if code == 404:
            try:
                with open(os.path.join(ROOT, "404.html"), "rb") as f:
                    body = f.read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            except OSError:
                pass
        super().send_error(code, message=message, explain=explain)


if __name__ == "__main__":
    ThreadingHTTPServer.allow_reuse_address = True
    with ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving {ROOT} on http://localhost:{PORT}", flush=True)
        httpd.serve_forever()
