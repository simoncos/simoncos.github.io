#!/usr/bin/env python3
"""Check an article's external links the way a reader's browser would.

    python3 check_links.py blogs/<slug>.md [blogs/<slug>.en.md ...]
    python3 check_links.py https://example.com/a https://example.com/b

For each distinct http(s) link, follows redirects with a browser user agent and
prints status, final URL and the page <title> (UTF-8, then GBK), one second
apart. Compare the title with the link text: a 200 that lands on a home page or
a login page is a dead link too. 403 from wikiwand or Medium is usually a bot
check, not a dead page; report it as unverified.
"""

import re
import subprocess
import sys
import time
from pathlib import Path

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")
LINK = re.compile(r"\]\((https?://[^)\s]+)\)|<(https?://[^>\s]+)>")


def links(args: list[str]) -> list[str]:
    seen: list[str] = []
    for arg in args:
        found = [arg] if arg.startswith("http") else [a or b for a, b in LINK.findall(Path(arg).read_text(encoding="utf-8"))]
        for url in found:
            if url not in seen:
                seen.append(url)
    return seen


def title_of(body: bytes) -> str:
    for enc in ("utf-8", "gbk"):
        try:
            text = body.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = body.decode("utf-8", "replace")
    m = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
    return re.sub(r"\s+", " ", m.group(1)).strip()[:80] if m else ""


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for i, url in enumerate(links(sys.argv[1:])):
        if i:
            time.sleep(1)
        r = subprocess.run(
            ["curl", "-s", "-L", "-m", "30", "-A", UA, "-w", "\n%{http_code}\t%{url_effective}", url],
            capture_output=True,
        )
        body, _, tail = r.stdout.rpartition(b"\n")
        status, _, final = tail.decode().partition("\t")
        moved = "" if final == url else f" -> {final}"
        print(f"{status}\t{title_of(body)}\t{url}{moved}")


if __name__ == "__main__":
    main()
