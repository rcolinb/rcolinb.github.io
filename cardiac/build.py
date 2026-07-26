#!/usr/bin/env python3
"""Concatenate src/ into one self-contained HTML file.

No dependencies, no toolchain. Files are emitted in lexical order:
  *.html  -> written through verbatim
  *.css   -> wrapped in <style>
  *.js    -> wrapped in <script>

Run:  python3 build.py
Out:  index.html   (open it directly, or serve it, or email it)
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
OUT = os.path.join(HERE, "index.html")


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def check(name, text):
    """Cheap guards against the two mistakes that would break a single-file build."""
    problems = []
    if name.endswith(".js"):
        # A literal </script> anywhere in JS would close the tag early.
        if "</script" in text.lower():
            problems.append("contains a literal </script> sequence")
        if re.search(r"^\s*(import|export)\s", text, re.M):
            problems.append("uses ES module syntax, which will not run inline")
    return problems


def main():
    if not os.path.isdir(SRC):
        sys.exit("no src/ directory next to build.py")

    names = sorted(os.listdir(SRC))
    parts = []
    styles = []
    failures = []
    counts = {"html": 0, "css": 0, "js": 0}

    for name in names:
        if name.startswith(".") or name.startswith("_"):
            continue
        path = os.path.join(SRC, name)
        if not os.path.isfile(path):
            continue
        text = read(path)

        problems = check(name, text)
        if problems:
            failures.append("%s: %s" % (name, "; ".join(problems)))
            continue

        if name.endswith(".html"):
            parts.append(text)
            counts["html"] += 1
        elif name.endswith(".css"):
            # Stylesheets are hoisted into <head> so the page never flashes
            # unstyled; everything else stays in source order.
            styles.append("<style>\n/* %s */\n%s\n</style>\n" % (name, text))
            counts["css"] += 1
        elif name.endswith(".js"):
            parts.append("<script>\n/* %s */\n%s\n</script>\n" % (name, text))
            counts["js"] += 1

    if failures:
        sys.exit("build aborted:\n  " + "\n  ".join(failures))

    out = "".join(parts)
    if "<!--STYLES-->" not in out:
        sys.exit("build aborted: no <!--STYLES--> marker in the document head")
    out = out.replace("<!--STYLES-->", "".join(styles), 1)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(out)

    kb = len(out.encode("utf-8")) / 1024.0
    print("wrote %s" % os.path.relpath(OUT, HERE))
    print("  %d html, %d css, %d js  ->  %.0f KB, no external requests" %
          (counts["html"], counts["css"], counts["js"], kb))


if __name__ == "__main__":
    main()
