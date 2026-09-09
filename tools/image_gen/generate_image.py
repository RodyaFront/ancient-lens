"""Generate a transparent PNG via Runware (chroma cutout path).

Usage (from repo root):
  py -3 tools/image_gen/generate_image.py --prompt "pushpin panel marker" --out-name pin
  py -3 tools/image_gen/generate_image.py --prompt-file prompts/_scratch/prompt.txt --out-name pin
  # Style inject (default): prompts/_inject/style.txt via --shared style
"""

from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

# Allow `python tools/image_gen/generate_image.py` from repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sticker_gen import (  # noqa: E402
    OUT,
    PROMPT_FILE,
    generate_sticker,
    load_key,
    resolve_path,
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Generate transparent PNG via Runware + chroma cutout",
    )
    p.add_argument(
        "--prompt",
        type=str,
        default=None,
        help="Inline subject prompt (writes a temp file). Prefer over --prompt-file for one-shots.",
    )
    p.add_argument(
        "--prompt-file",
        type=Path,
        default=None,
        help="Subject prompt file (default: prompts/_scratch/prompt.txt when --prompt omitted)",
    )
    p.add_argument(
        "--ref",
        type=Path,
        action="append",
        default=None,
        help="Reference image path (repeatable). Sent as inputs.referenceImages data URI.",
    )
    p.add_argument(
        "--shared",
        type=str,
        choices=["style", "decal-field", "none"],
        default="style",
        help="Shared inject pipeline (default: style — Dota 2 UI chrome).",
    )
    p.add_argument(
        "--out-name",
        type=str,
        default=None,
        help="Optional stem for output files (default: random hex)",
    )
    p.add_argument(
        "--model",
        type=str,
        default=None,
        help="Runware model AIR id (default: google:nano-banana@2-lite). Strong: google:4@3",
    )
    p.add_argument(
        "--thinking",
        type=str,
        choices=["MINIMAL", "HIGH"],
        default=None,
        help="Nano Banana 2 thinking depth (settings.thinking)",
    )
    p.add_argument(
        "--stroke",
        type=int,
        default=0,
        help="Bake white die-cut rim after cutout (px). 0 = none.",
    )
    p.add_argument(
        "--chroma",
        type=str,
        choices=["green", "blue"],
        default="green",
        help="Chroma backdrop / cutout color. Use blue when the subject itself is green-heavy.",
    )
    p.add_argument(
        "--size",
        type=int,
        default=None,
        metavar="PX",
        help="Square output size in px (default: 1024). Ignored if --width/--height set.",
    )
    p.add_argument(
        "--width",
        type=int,
        default=None,
        help="Output width px (pair with --height).",
    )
    p.add_argument(
        "--height",
        type=int,
        default=None,
        help="Output height px (pair with --width).",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    refs = [resolve_path(r) for r in args.ref] if args.ref else None
    if args.width is not None or args.height is not None:
        if args.width is None or args.height is None:
            raise SystemExit("Use both --width and --height together")
        size = (args.width, args.height)
    elif args.size:
        size = (args.size, args.size)
    else:
        size = None

    tmp_path: Path | None = None
    if args.prompt:
        scratch = resolve_path(PROMPT_FILE.parent)
        scratch.mkdir(parents=True, exist_ok=True)
        fd, name = tempfile.mkstemp(prefix="prompt-", suffix=".txt", dir=scratch)
        tmp_path = Path(name)
        with open(fd, "w", encoding="utf-8") as fh:
            fh.write(args.prompt.strip() + "\n")
        prompt_file = tmp_path
    elif args.prompt_file is not None:
        prompt_file = args.prompt_file
    else:
        prompt_file = PROMPT_FILE

    try:
        generate_sticker(
            key=load_key(),
            prompt_file=prompt_file,
            out_name=args.out_name,
            refs=refs,
            out_dir=OUT,
            model=args.model,
            thinking=args.thinking,
            stroke_px=args.stroke,
            chroma=args.chroma,
            shared=args.shared,
            size=size,
        )
    finally:
        if tmp_path is not None and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
