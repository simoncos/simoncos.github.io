"""Render the chart copy that is present before the LoLA runtime starts."""

from __future__ import annotations

import re
from html import escape

from bs4 import BeautifulSoup, Comment

DRAFT_COPY = {
    "#setHint": ("set.hint.temporal-holdout",),
    "#dotsResult": ("draft.result",),
    "#coneResult": ("cone.result",),
    "#matrixCap": ("pairs.matrixCap",),
    "#duel > div:first-child": ("time.duel",),
    "#feat": ("time.feat0", "time.range"),
    "#waffleResult": ("learn.wresult",),
    "#curveRead": ("learn.curveRead",),
    "#stabResult": ("ban.stabResult",),
    "#assocResult": ("ban.assocResult",),
}

MATCHUP_COPY = {
    "#rulerRes": ("read.rulerRes",),
    "#shrinkRes": ("read.shrinkRes",),
    "#shrinkCap": ("read.shrinkCap",),
    "#mapHint": ("map.hint", "map.part.note"),
    "#mapCap": ("map.cap",),
    "#zLab": ("map.zoom",),
    "#netHint": ("net.hint",),
    "#netDetail": ("net.det.empty",),
    "#netCap": ("net.cap",),
    "#varRes": ("str.varRes",),
    "#varCap": ("str.varCap",),
    "#t3Res": ("str.t3Res",),
    "#strCap": ("str.rankCap",),
    "#valRes": ("real.resRaw",),
    "#valCap": ("real.valCap",),
    "#persist .few": ("real.pe.few",),
    "#persistRes": ("real.persistRes",),
    "#persistCap": ("real.persistCap",),
    "#laneRes": ("real.laneRes",),
    "#noiseCap": ("noise.cap",),
    "#noiseCall": ("noise.call",),
}

DRAFT_LABELS = (
    "coin.idle", "cone.in", "cone.out", "pairs.legendMain", "pairs.legendPair", "pairs.legendBase",
    "time.stat.acc", "time.stat.ll", "learn.neg", "learn.zero", "learn.pos",
)

MATCHUP_LABELS = (
    "map.leg.lose", "map.leg.win", "role.top", "role.jungle", "role.mid", "role.adc", "role.support",
    "net.leg.arrow", "str.varMain", "str.varInt", "str.varRest", "str.t3Set.temporal-holdout",
    "str.t3Set.iid-mixed-patch", "str.t3Set.same-build-5.24.0.256", "real.stat.pairs", "real.stat.rho",
    "real.stat.slope", "real.stat.top", "real.pe.raw", "real.pe.t100raw", "real.pe.int", "real.pe.t100int",
    "real.pe.lane", "real.pe.chance", "real.pe.dir", "real.pe.sig", "real.lane.pairs", "real.lane.edges",
    "real.lane.dir", "real.lane.rho", "noise.obs", "noise.n1", "noise.n2",
)

QUOTES = str.maketrans({"’": "'", "“": '"', "”": '"'})
FIELD = re.compile(r"\{(\w+)\}")


def normalized(text: str) -> str:
    return " ".join(text.translate(QUOTES).split())


def render_chart_copy(text: str, keys: tuple[str, ...], locales: dict) -> str:
    """Keep the source's static numbers and reuse the interactive translations."""
    en, zh = locales["en"], locales["zh"]
    template = " ".join(en[key] for key in keys)
    english = normalized(BeautifulSoup(template, "html.parser").get_text())
    fields = set()
    pattern = []
    for index, part in enumerate(FIELD.split(english)):
        if index % 2 == 0:
            pattern.append(re.escape(part))
        elif part in fields:
            pattern.append(f"(?P={part})")
        else:
            fields.add(part)
            pattern.append(f"(?P<{part}>.+?)")

    match = re.fullmatch("".join(pattern), normalized(text))
    if not match:
        raise ValueError(f"LoLA static copy no longer matches {', '.join(keys)}: {text}")

    values = match.groupdict()
    if "tier" in values:
        tier = next(key for key in ("tier.low", "tier.mid", "tier.high") if en[key] == values["tier"])
        values["tier"] = zh[tier]
    return " ".join(FIELD.sub(lambda token: escape(values[token[1]]), zh[key]) for key in keys)


def localize_chart_text(soup, locales: dict, is_matchups: bool) -> None:
    en, zh = locales["en"], locales["zh"]
    copy = MATCHUP_COPY if is_matchups else DRAFT_COPY
    for selector, keys in copy.items():
        node = soup.select_one(selector)
        translated = render_chart_copy(node.get_text(), keys, locales)
        node.clear()
        node.extend(list(BeautifulSoup(translated, "html.parser").contents))

    if is_matchups:
        legend_range = soup.select_one("#heatLegend em").string
        legend_range.replace_with(legend_range.replace(en["unit.pp"], zh["unit.pp"]))
        soup.select_one("#varBar .stack")["aria-label"] = zh["str.varAria"]
        soup.select_one("#persist .pbars")["aria-label"] = zh["real.persistAria"]
        for node in soup.select("#persist .pb[title]"):
            for key in ("real.pe.dir", "real.pe.sig"):
                node["title"] = node["title"].replace(en[key], zh[key])
    else:
        # The coloured dots are separate elements and retain their markup.
        caption = soup.select_one("#coneNote").contents[0]
        caption.replace_with(render_chart_copy(caption, ("cone.note",), locales))

    keys = MATCHUP_LABELS if is_matchups else DRAFT_LABELS
    labels = {normalized(en[key]): zh[key] for key in keys}
    for node in soup.main.find_all(string=True):
        if not isinstance(node, Comment) and (text := normalized(node)) in labels:
            leading = node[:len(node) - len(node.lstrip())]
            trailing = node[len(node.rstrip()):]
            node.replace_with(leading + labels[text] + trailing)
