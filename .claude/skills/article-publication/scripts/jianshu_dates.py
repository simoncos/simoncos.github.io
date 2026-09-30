#!/usr/bin/env python3
"""Look up when Che's posts were first published on Jianshu.

    python3 jianshu_dates.py list [title words ...]
    python3 jianshu_dates.py page <note id or /p/ URL> ...

`list` walks the author archive (https://www.jianshu.com/u/fryvGp) in
share-time order and prints share time (+08:00), path and title as TSV,
optionally only rows whose title contains every given word. `page` reads
`first_shared_at` from article pages, which also finds posts the archive list
leaves out (数据、信息、知识、智慧 was one).

Plain curl with a browser user agent works; the list needs the two XHR headers.
Dates here are evidence for docs/ARTICLE_PUBLICATION.md#dates, not the rule.
"""

import datetime as dt
import html
import re
import subprocess
import sys
import time

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")
ARCHIVE = "https://www.jianshu.com/u/fryvGp?order_by=shared_at&page={}"


def get(url: str, xhr: bool = False) -> str:
    cmd = ["curl", "-s", "-L", "-m", "30", "-A", UA]
    if xhr:
        cmd += ["-H", "X-Requested-With: XMLHttpRequest", "-H", "X-INFINITESCROLL: true"]
    return subprocess.run(cmd + [url], capture_output=True).stdout.decode("utf-8", "replace")


def archive(words: list[str]) -> None:
    for page in range(1, 50):
        items = re.split(r'<li id="note-', get(ARCHIVE.format(page), xhr=True))[1:]
        if not items:  # a failed fetch also comes back empty; the archive only ends if it stays empty
            time.sleep(3)
            items = re.split(r'<li id="note-', get(ARCHIVE.format(page), xhr=True))[1:]
        found = 0
        for item in items:
            link = re.search(r'class="title"[^>]*href="(/p/[0-9a-f]+)"[^>]*>(.*?)</a>', item, re.S)
            shared = re.search(r'data-shared-at="([^"]+)"', item)
            if not (link and shared):
                continue
            found += 1
            title = html.unescape(link.group(2)).strip()
            if all(w in title for w in words):
                print(f"{shared.group(1)}\t{link.group(1)}\t{title}")
        if not found:
            break


def pages(ids: list[str]) -> None:
    china = dt.timezone(dt.timedelta(hours=8))
    for raw in ids:
        note = raw.rstrip("/").split("/")[-1]
        text = get(f"https://www.jianshu.com/p/{note}")
        first = re.search(r'"first_shared_at":(\d+)', text)
        title = re.search(r"<title>(.*?)</title>", text, re.S)
        when = dt.datetime.fromtimestamp(int(first.group(1)), china).isoformat() if first else "not found"
        print(f"{when}\t/p/{note}\t{html.unescape(title.group(1)).strip() if title else '-'}")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("list", "page"):
        sys.exit(__doc__)
    (archive if sys.argv[1] == "list" else pages)(sys.argv[2:])
