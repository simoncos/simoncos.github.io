"""Build the Chinese LoLA documents from the essays' existing translations."""

from __future__ import annotations

import json
import re
from html import escape
from statistics import median

from bs4 import BeautifulSoup

from lola_chart_text import localize_chart_text
from piece_contact_foot import render_piece_contact_block
from site_languages import canonical_url
from site_shell import ROOT
from update_hand_work_contact_feet import migrate

DESCRIPTIONS = {
    "lola-draft": "分析 222,652 场英雄联盟排位赛：只看选人的预测 AUC 约为 0.57，加入第 10 和第 20 分钟的赛况后分别升至 0.78 和 0.89。",
    "lola-matchups": "分析 222,616 场英雄联盟排位赛的 8,128 个英雄对位。606 个对位有明显优势，几乎都由较强英雄指向较弱英雄。",
}


def matchups_values(data: dict) -> dict:
    summary = data["sum"]
    run = summary["run"]
    return {
        **{key: f"{summary[key]:,}" for key in ("matches", "train", "test", "pairs", "testable", "follow")},
        "views": summary["views"],
        "min": summary["minGames"],
        "medN": f'{median(data["nTr"]):,.0f}',
        "reps": summary["reps"],
        "seed": summary["seed"],
        "c": summary["cUsed"],
        "mapped": f'{summary["posMapped"] * 100:.1f}',
        "minCov": f'{min(summary["lanePosCov"].values()) * 100:.0f}',
        "maxCov": f'{max(summary["lanePosCov"].values()) * 100:.0f}',
        "edges": f'{summary["edges"]["0.05"]:,}',
        "dir": round(summary["val"]["fdr_edges_raw"]["share_direction_persists"] * 100),
        "int": f'{summary["var"]["interaction_share"] * 100:.1f}',
        "iedges": summary["iedges"]["0.05"],
        "tri": f'{summary["tri"]["0.05"]:,}',
        "cyc": summary["cyc"]["0.05"],
        "lanedir": round(summary["lane"]["fdr_edges_share_direction_persists"] * 100),
        "date": run["generated"][:16].replace("T", " "),
        "dirty": str(run["dirty"]).lower(),
        "commit": run["commit"],
        "sha": run["scriptSha"],
    }


def chinese_page(source: str, work: dict, origin: str) -> str:
    english = work["href"]["en"]
    target = work["href"]["zh"]
    head, body = source.split("</head>", 1)
    markup, scripts = body.split("<script>window.LOLA_IMG=", 1)

    # The translation literal is JSON apart from its two language keys and trailing commas.
    raw = scripts.split("window.I18N = ", 1)[1].split("</script>", 1)[0]
    raw = re.sub(r"(?m)^(en|zh):", r'"\1":', raw)
    locales = json.JSONDecoder().raw_decode(re.sub(r",(\s*[}])", r"\1", raw))[0]
    translations = locales["zh"]
    data = json.JSONDecoder().raw_decode(scripts.split("window.LOLA_DATA=", 1)[1])[0]
    icons = json.JSONDecoder().raw_decode(scripts)[0]
    is_matchups = work["id"] == "lola-matchups"
    values = matchups_values(data) if is_matchups else {
        "games": f'{data["learnMeta"]["eligible"]:,}',
        "champs": data["learnMeta"]["champions"],
    }

    def translated(key: str) -> str:
        return re.sub(r"\{(\w+)\}", lambda m: str(values[m[1]]), translations[key])

    markup = migrate(markup, render_piece_contact_block("../../", "zh", inline_css=True) + "\n", target)
    soup = BeautifulSoup(markup, "html.parser")

    def put(node, value: str) -> None:
        node.clear()
        for child in list(BeautifulSoup(value, "html.parser").contents):
            node.append(child)

    for node in soup.select("[data-i18n]"):
        key = node["data-i18n"]
        if key in translations:
            put(node, translated(key))
    for attr, key in (("aria-label", "data-i18n-aria"), ("placeholder", "data-i18n-ph")):
        for node in soup.select(f"[{key}]"):
            node[attr] = translated(node[key])
    for dot in soup.select("#dots a[data-for]"):
        put(dot.span, translated(soup.find(id=dot["data-for"])["data-nav"]))

    if is_matchups:
        for node_id, key in {
            "heroLede": "hero.lede", "readBody": "read.body", "mapBody": "map.body",
            "netBody": "net.body", "strBody": "str.body", "realBody": "real.body",
            "noiseBody": "noise.body", "endAnswer": "end.answer", "footData": "foot.data.b",
            "footMethod": "foot.method.b", "footLimits": "foot.limits.b", "footRun": "foot.run",
        }.items():
            put(soup.find(id=node_id), translated(key))
        for node_id, prefix in (("endCan", "c"), ("endCant", "n")):
            put(soup.find(id=node_id), "".join(f"<li>{translated(f'end.{prefix}{i}')}</li>" for i in range(1, 5)))
        riot = translated("foot.riot.b") + " " + translations["foot.img"].replace("{v}", icons["v"])
    else:
        put(soup.find(id="learnBody"), translated("learn.body"))
        riot = translated("foot.riot.b")
    put(soup.find(id="footRiot"), riot)
    put(soup.find(id="absAnswer"), soup.select_one("#end .answer").decode_contents())
    findings = soup.select("#end .vcol.yes li")
    put(soup.find(id="absList"), "".join(str(item) for item in findings[:3]))

    localize_chart_text(soup, locales, is_matchups)

    slot = soup.find(id="slotCap")
    slot.string = "示意阵容：盖伦、李青、阿狸、金克丝、锤石对阵德莱厄斯、蔚、亚索、凯特琳、蕾欧娜。"
    soup.select_one(".lang [aria-current]").attrs.pop("aria-current")
    soup.select_one('.lang [hreflang="zh-Hans"]')["aria-current"] = "page"
    soup.select_one(".lang")["aria-label"] = "语言"
    soup.select_one(".piece-contact")["aria-label"] = "联系与订阅"
    for link in soup.select("a[href]"):
        href = link["href"]
        if href == "../../gallery.html#research":
            link["href"] = "../../gallery.zh.html#research"
        elif href in ("lola-draft.html", "lola-matchups.html") and not link.get("hreflang"):
            link["href"] = href.replace(".html", ".zh.html")

    title = escape(work["title"]["zh"])
    description = escape(DESCRIPTIONS[work["id"]])
    en_url = canonical_url(origin, english)
    zh_url = canonical_url(origin, target)
    head = head.replace('<html lang="en"', '<html lang="zh-Hans"', 1)
    head = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", head, count=1)
    for attribute, key, value in (
        ("name", "description", description), ("property", "og:title", title),
        ("property", "og:description", description), ("property", "og:image:alt", title),
        ("property", "og:url", zh_url), ("name", "twitter:title", title),
        ("name", "twitter:description", description), ("name", "twitter:image:alt", title),
    ):
        opening = f'<meta {attribute}="{key}" content="'
        head = re.sub(re.escape(opening) + r'[^"]*', lambda _: opening + value, head, count=1)
    head = head.replace(f'rel="canonical" href="{en_url}"', f'rel="canonical" href="{zh_url}"', 1)
    return head + "</head>" + str(soup) + "<script>window.LOLA_IMG=" + scripts


def lola_pages(config: dict, site: dict) -> dict[str, str]:
    outputs = {}
    for work in site["works"]:
        if work["id"] in DESCRIPTIONS:
            english = work["href"]["en"]
            source = (ROOT / english).read_text(encoding="utf-8")
            outputs[english] = source
            outputs[work["href"]["zh"]] = chinese_page(source, work, config["site_url"])
    return outputs
