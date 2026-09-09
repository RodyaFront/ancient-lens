"""Subject prompt loading with optional shared inject.

Pipelines:
  style       → prompts/_inject/style.txt  (Ancient Lens Dota 2 UI chrome — default)
  decal-field → prompts/_inject/decal-field.txt (if present)
  none        → subject only
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

TOOLS_DIR = Path(__file__).resolve().parent
ROOT = TOOLS_DIR.parent.parent
PROMPTS_DIR = ROOT / "prompts"
INJECT_DIR = PROMPTS_DIR / "_inject"
SCRATCH_DIR = PROMPTS_DIR / "_scratch"
SCRATCH_PROMPT_FILE = SCRATCH_DIR / "prompt.txt"
STYLE_FILE = INJECT_DIR / "style.txt"
DECAL_FIELD_FILE = INJECT_DIR / "decal-field.txt"

PROMPT_FILE = SCRATCH_PROMPT_FILE

SharedKind = Literal["style", "decal-field", "none"]

_SHARED_FILES: dict[SharedKind, Path | None] = {
    "style": STYLE_FILE,
    "decal-field": DECAL_FIELD_FILE,
    "none": None,
}


def resolve_prompt_path(prompt_file: Path | None = None) -> Path:
    path = prompt_file if prompt_file is not None else PROMPT_FILE
    if not path.is_absolute():
        path = ROOT / path
    return path


def infer_shared_kind(prompt_file: Path, subject: str) -> SharedKind:
    """Default to Dota UI chrome style; field BGs can opt into decal-field."""
    name = prompt_file.name.lower()
    if name == "field_bg.txt" or name.endswith("_field_bg.txt"):
        return "decal-field"
    if "decal-field" in subject.lower():
        return "decal-field"
    if "shared: none" in subject.lower() or "shared:none" in subject.lower():
        return "none"
    return "style"


def load_shared_text(kind: SharedKind) -> str:
    path = _SHARED_FILES.get(kind)
    if path is None:
        return ""
    if not path.exists():
        raise SystemExit(f"Missing shared prompt: {path}")
    return path.read_text(encoding="utf-8").strip()


def load_prompt_with_shared(
    prompt_file: Path | None = None,
    *,
    shared: SharedKind | None = None,
) -> tuple[str, SharedKind]:
    """Load subject and optionally prepend a shared inject file.

    Default resolved kind is `style` (Dota 2 UI chrome).
    """
    path = resolve_prompt_path(prompt_file)
    if not path.exists():
        raise SystemExit(f"Missing {path}")
    subject = path.read_text(encoding="utf-8").strip()
    if not subject:
        raise SystemExit(f"{path.name} is empty")

    kind: SharedKind = (
        shared if shared is not None else infer_shared_kind(path, subject)
    )
    shared_text = load_shared_text(kind)
    if shared_text:
        return f"{shared_text}\n\n---\n\n{subject}", kind
    return subject, kind
