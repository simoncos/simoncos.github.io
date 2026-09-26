#!/usr/bin/env python3
"""Compile TypeScript into a temporary directory and compare tracked outputs."""

from __future__ import annotations

import argparse
import filecmp
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

BUILD_TARGETS = (
    ("tsconfig.json", "src/js", ("src/js/*.js",)),
    (
        "gallery/talks/pkm-2026-06-07/tsconfig.json",
        "gallery/talks/pkm-2026-06-07",
        (
            "gallery/talks/pkm-2026-06-07/deck.js",
            "gallery/talks/pkm-2026-06-07/deck.mjs",
        ),
    ),
    (
        "projects/assets/tsconfig.json",
        "projects/assets",
        (
            "projects/assets/sleep-2016-2026.js",
            "projects/assets/sleep-2016-2026.en.js",
            "projects/assets/sleep-essay-pretext-lab.js",
            "projects/assets/sleep-essay-ui.js",
        ),
    ),
    (
        "blogs/assets/haba-pretext.tsconfig.json",
        "blogs/assets",
        ("blogs/assets/haba-pretext.js",),
    ),
)

SITE_BUILD_TARGETS = BUILD_TARGETS[:1]


def tsc_command() -> str:
    local_tsc = ROOT / "node_modules" / ".bin" / "tsc"
    if local_tsc.is_file():
        return str(local_tsc)
    command = shutil.which("tsc")
    if command:
        return command
    raise RuntimeError("TypeScript compiler not found; run npm install")


def expand_outputs(patterns: tuple[str, ...]) -> set[Path]:
    outputs: set[Path] = set()
    for pattern in patterns:
        outputs.update(path.relative_to(ROOT) for path in ROOT.glob(pattern) if path.is_file())
    return outputs


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scope",
        choices=("site", "all"),
        default="all",
        help="Check the shared site bundle only, or every tracked TypeScript artifact.",
    )
    args = parser.parse_args()
    build_targets = SITE_BUILD_TARGETS if args.scope == "site" else BUILD_TARGETS
    errors: list[str] = []

    try:
        compiler = tsc_command()
    except RuntimeError as error:
        print(error)
        return 1

    with tempfile.TemporaryDirectory(prefix="simonc-typescript-build-") as temp_dir:
        temp_root = Path(temp_dir)
        expected_outputs: set[Path] = set()
        generated_outputs: set[Path] = set()

        for config, output_dir, patterns in build_targets:
            result = subprocess.run(
                [compiler, "-p", config, "--outDir", str(temp_root / output_dir)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                print(f"TypeScript build failed for {config}:")
                if result.stdout.strip():
                    print(result.stdout.strip())
                if result.stderr.strip():
                    print(result.stderr.strip())
                return result.returncode

            expected_outputs.update(expand_outputs(patterns))

        generated_outputs.update(
            path.relative_to(temp_root)
            for path in temp_root.rglob("*")
            if path.is_file()
        )

        for rel_path in sorted(expected_outputs | generated_outputs):
            current = ROOT / rel_path
            generated = temp_root / rel_path
            if not current.is_file():
                errors.append(f"{rel_path}: tracked JavaScript output is missing")
            elif not generated.is_file():
                errors.append(f"{rel_path}: no longer generated from TypeScript")
            elif not filecmp.cmp(current, generated, shallow=False):
                errors.append(f"{rel_path}: generated JavaScript is out of date")

    if errors:
        print("TypeScript generated-output check failed:")
        for error in errors:
            print(f"- {error}")
        print("Run: npm run build:ts")
        return 1

    print(
        f"TypeScript build is current "
        f"({len(expected_outputs)} tracked outputs, scope={args.scope})."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
