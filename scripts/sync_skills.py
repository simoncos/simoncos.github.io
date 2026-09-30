#!/usr/bin/env python3
"""Keep the two copies of the project skills identical.

Claude Code reads project skills from .claude/skills/, Codex from
.agents/skills/. Each skill is kept in both, file for file. The one exception
is agents/openai.yaml, which only Codex reads and which lives only in the
.agents copy. Edit either copy, then run this to copy it over the other:

    python3 scripts/sync_skills.py                 # .claude -> .agents
    python3 scripts/sync_skills.py --from agents   # .agents -> .claude
    python3 scripts/sync_skills.py --check         # what make check runs

--check fails when:
- a skill exists in only one copy;
- a file differs or is missing from one side;
- a Codex skill has no agents/openai.yaml.
Syncing never writes agents/openai.yaml; a new skill needs one written by hand.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TREES = {"claude": Path(".claude/skills"), "agents": Path(".agents/skills")}
CODEX_ONLY = "agents"
IGNORED = {"__pycache__", ".DS_Store"}


def skill_files(skill: Path) -> set[Path]:
    """Files of one skill, relative to it, without Codex's own metadata."""
    files = set()
    for path in skill.rglob("*"):
        rel = path.relative_to(skill)
        if path.is_file() and rel.parts[0] != CODEX_ONLY and not (IGNORED & set(rel.parts)):
            files.add(rel)
    return files


def skills(tree: Path) -> set[str]:
    return {p.name for p in tree.iterdir() if p.is_dir()} if tree.is_dir() else set()


def problems(root: Path = ROOT) -> list[str]:
    claude, agents = root / TREES["claude"], root / TREES["agents"]
    found = []
    for name in sorted(skills(claude) | skills(agents)):
        a, b = claude / name, agents / name
        if not a.is_dir() or not b.is_dir():
            missing = TREES["claude"] if not a.is_dir() else TREES["agents"]
            found.append(f"{name}: missing from {missing}/")
            continue
        fa, fb = skill_files(a), skill_files(b)
        for rel in sorted(fa ^ fb):
            side = TREES["agents"] if rel in fa else TREES["claude"]
            found.append(f"{name}/{rel.as_posix()}: missing from {side}/")
        for rel in sorted(fa & fb):
            if (a / rel).read_bytes() != (b / rel).read_bytes():
                found.append(f"{name}/{rel.as_posix()}: differs between the two copies")
        if not (b / CODEX_ONLY / "openai.yaml").is_file():
            found.append(f"{name}: {TREES['agents']}/{name}/agents/openai.yaml is missing")
    return found


def sync(source: str, root: Path = ROOT) -> list[str]:
    """Make the other copy match `source`; returns what changed."""
    src_tree = root / TREES[source]
    dst_tree = root / TREES["agents" if source == "claude" else "claude"]
    changed = []
    for name in sorted(skills(src_tree)):
        src, dst = src_tree / name, dst_tree / name
        wanted = skill_files(src)
        if dst.is_dir():
            for rel in sorted(skill_files(dst) - wanted):
                (dst / rel).unlink()
                changed.append(f"removed {dst.relative_to(root) / rel}")
        for rel in sorted(wanted):
            target = dst / rel
            if target.is_file() and target.read_bytes() == (src / rel).read_bytes():
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src / rel, target)
            changed.append(f"wrote {target.relative_to(root)}")
    for name in sorted(skills(dst_tree) - skills(src_tree)):
        changed.append(f"left {dst_tree.relative_to(root) / name}: not in {TREES[source]}/, delete it by hand if it is retired")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="report drift and exit 1 instead of syncing")
    parser.add_argument("--from", dest="source", choices=sorted(TREES), default="claude",
                        help="the copy that was edited (default: claude)")
    args = parser.parse_args()
    if not args.check:
        for line in sync(args.source):
            print(line)
    found = problems()
    for line in found:
        print(f"skills: {line}", file=sys.stderr)
    if found and args.check:
        print("Run python3 scripts/sync_skills.py (or --from agents) to copy the edited side over.", file=sys.stderr)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
