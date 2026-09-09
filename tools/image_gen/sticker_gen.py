"""Shared Runware sticker generation + chroma cutout (used by CLI scripts)."""

from __future__ import annotations

import base64
import io
import json
import mimetypes
import os
import uuid
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

TOOLS_DIR = Path(__file__).resolve().parent
ROOT = TOOLS_DIR.parent.parent
PROMPT_FILE = ROOT / "prompts" / "_scratch" / "prompt.txt"
OUT = ROOT / "output" / "images"
API = "https://api.runware.ai/v1"

CHROMA_GREEN_TRAILER = """
---
CUTOUT BACKDROP (required)
- Single isolated subject centered on FLAT SOLID neon green chroma (#00FF00) only.
- Pure uniform #00FF00 edge-to-edge — no gradients, no floor, NO drop shadow outside subject.
- NO white die-cut / peel-and-stick border — subject edge meets #00FF00 directly.
- Subject must NOT use neon green / mint / seafoam fills.
""".strip()

CHROMA_BLUE_TRAILER = """
---
CUTOUT BACKDROP (required)
- Single isolated subject centered on FLAT SOLID chroma blue (#0050FF) only.
- Pure uniform #0050FF edge-to-edge — no gradients, no floor, NO drop shadow outside subject.
- NO white die-cut / peel-and-stick border — subject edge meets #0050FF directly.
- Subject must NOT use chroma blue / cyan fills.
""".strip()

GEN_MODEL = "google:nano-banana@2-lite"
SIZE = (1024, 1024)

CHROMA_MIN_G = 210
CHROMA_MAX_RB = 80
CHROMA_MAX_B = 55
CHROMA_DOMINANCE = 90
CHROMA_MIN_B = 210
CHROMA_MAX_RG = 80
# NB2 "chroma blue" often lands near #0050FF but with G ≈ 95-110, not 80.
CHROMA_MAX_G_FOR_BLUE = 120
CHROMA_BLUE_DOMINANCE = 90
FRINGE_MAX_LUM = 170
FRINGE_MIN_LUM = 55  # skip near-black subject edges (panda fur, dark outlines)
FRINGE_MAX_SAT = 45
FRINGE_PASSES = 16


def load_key() -> str:
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("RUNWARE_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    key = os.environ.get("RUNWARE_API_KEY", "")
    if not key:
        raise SystemExit("Set RUNWARE_API_KEY in .env or environment")
    return key


def load_prompt(
    prompt_file: Path,
    *,
    shared: str | None = None,
) -> tuple[str, str]:
    """Load subject + optional shared inject. Returns (prompt, shared_kind)."""
    from prompt_compose import SharedKind, load_prompt_with_shared

    kind: SharedKind | None = None
    if shared is not None:
        if shared not in ("style", "decal-field", "none"):
            raise SystemExit(f"Invalid shared kind: {shared!r}")
        kind = shared  # type: ignore[assignment]
    return load_prompt_with_shared(prompt_file, shared=kind)


def resolve_path(path: Path) -> Path:
    """Resolve relative paths from repo root (supports prompts/...)."""
    return path if path.is_absolute() else ROOT / path


def adapt_prompt_for_chroma(prompt: str, *, chroma: str) -> str:
    """Ensure cutout backdrop instructions; swap green→blue when needed."""
    if chroma not in ("green", "blue"):
        raise ValueError(f"Unsupported chroma color: {chroma!r}")

    out = prompt
    has_green = "#00FF00" in out or "neon green chroma" in out.lower()
    has_blue = "#0050FF" in out or "chroma blue" in out.lower()

    if chroma == "blue" and has_green:
        swaps = (
            ("#00FF00", "#0050FF"),
            ("FLAT SOLID neon green chroma", "FLAT SOLID chroma blue"),
            ("flat solid #00FF00 background", "flat solid #0050FF background"),
            ("Pure uniform #00FF00 edge-to-edge", "Pure uniform #0050FF edge-to-edge"),
            ("Background is ONLY solid #00FF00.", "Background is ONLY solid #0050FF."),
            ("subject edge meets #00FF00 directly", "subject edge meets #0050FF directly"),
            (
                "Subject must NOT use neon green / mint / seafoam fills.",
                "Subject must NOT use chroma blue / cyan fills.",
            ),
            (
                "Subject must NOT use neon green / mint fills.",
                "Subject must NOT use chroma blue / cyan fills.",
            ),
            ("Subject must NOT use neon green.", "Subject must NOT use chroma blue / cyan."),
            (
                "Subject must NOT use neon green / mint / lime fills",
                "Subject must NOT use chroma blue / cyan fills",
            ),
            (
                "Subject must NOT use neon green / mint / seafoam.",
                "Subject must NOT use chroma blue / cyan.",
            ),
        )
        for old, new in swaps:
            out = out.replace(old, new)
        return out

    if chroma == "green" and not has_green:
        return f"{out.rstrip()}\n\n{CHROMA_GREEN_TRAILER}"
    if chroma == "blue" and not has_blue:
        return f"{out.rstrip()}\n\n{CHROMA_BLUE_TRAILER}"
    return out


def file_to_data_uri(path: Path) -> str:
    data = path.read_bytes()
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def post(key: str, body: list[dict]) -> dict:
    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise SystemExit(f"API {e.code}: {detail}") from None


def green_key(
    a: np.ndarray,
    min_g: int = CHROMA_MIN_G,
    dominance: int = CHROMA_DOMINANCE,
) -> np.ndarray:
    """Key neon #00FF00 backdrop only.

    Must not eat mint / success-green *subject* fills (Owlika plus #34C77B is
    ~RGB 59,201,129). Those sit far from chroma blue (~16) even when G is high.
    """
    out = a.copy()
    r = out[:, :, 0].astype(np.int16)
    g = out[:, :, 1].astype(np.int16)
    b = out[:, :, 2].astype(np.int16)
    max_rb = np.maximum(r, b)
    mask = (
        (g >= min_g)
        & (r <= CHROMA_MAX_RB)
        & (b <= CHROMA_MAX_B)
        & (g >= max_rb + dominance)
    )
    out[mask, 3] = 0
    return out


def blue_key(
    a: np.ndarray,
    min_b: int = CHROMA_MIN_B,
    dominance: int = CHROMA_BLUE_DOMINANCE,
) -> np.ndarray:
    """Key blue chroma backdrop for green-heavy subjects."""
    out = a.copy()
    r = out[:, :, 0].astype(np.int16)
    g = out[:, :, 1].astype(np.int16)
    b = out[:, :, 2].astype(np.int16)
    max_rg = np.maximum(r, g)
    mask = (
        (b >= min_b)
        & (r <= CHROMA_MAX_RG)
        & (g <= CHROMA_MAX_G_FOR_BLUE)
        & (b >= max_rg + dominance)
    )
    out[mask, 3] = 0
    return out


def peel_dark_fringe(
    a: np.ndarray,
    max_lum: int = FRINGE_MAX_LUM,
    min_lum: int = FRINGE_MIN_LUM,
    max_sat: int = FRINGE_MAX_SAT,
    passes: int = FRINGE_PASSES,
) -> np.ndarray:
    """Peel muddy gray AA halo only — not near-black subject silhouette (pandas, etc.)."""
    out = a.copy()
    for _ in range(passes):
        al = out[:, :, 3]
        rgb = out[:, :, :3].astype(np.int16)
        lum = rgb.max(axis=2)
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        opaque = al > 0
        t = al == 0
        neigh = np.zeros(al.shape, dtype=bool)
        neigh[1:, :] |= t[:-1, :]
        neigh[:-1, :] |= t[1:, :]
        neigh[:, 1:] |= t[:, :-1]
        neigh[:, :-1] |= t[:, 1:]
        fringe = (
            opaque
            & neigh
            & (lum <= max_lum)
            & (lum >= min_lum)
            & (sat <= max_sat)
        )
        if not fringe.any():
            break
        out[fringe, 3] = 0
    return out


def peel_green_fringe(
    a: np.ndarray,
    min_g: int = 140,
    dominance: int = 40,
    passes: int = 6,
) -> np.ndarray:
    """Remove neon-chroma AA halo on the outer edge (bright green fringe)."""
    out = a.copy()
    for _ in range(passes):
        al = out[:, :, 3]
        r = out[:, :, 0].astype(np.int16)
        g = out[:, :, 1].astype(np.int16)
        b = out[:, :, 2].astype(np.int16)
        opaque = al > 0
        t = al == 0
        neigh = np.zeros(al.shape, dtype=bool)
        neigh[1:, :] |= t[:-1, :]
        neigh[:-1, :] |= t[1:, :]
        neigh[:, 1:] |= t[:, :-1]
        neigh[:, :-1] |= t[:, 1:]
        fringe = (
            opaque
            & neigh
            & (g >= min_g)
            & (g >= r + dominance)
            & (g >= b + dominance)
        )
        if not fringe.any():
            break
        out[fringe, 3] = 0
    return out


def peel_blue_fringe(
    a: np.ndarray,
    min_b: int = 140,
    dominance: int = 40,
    passes: int = 6,
) -> np.ndarray:
    """Remove blue-chroma AA halo on the outer edge."""
    out = a.copy()
    for _ in range(passes):
        al = out[:, :, 3]
        r = out[:, :, 0].astype(np.int16)
        g = out[:, :, 1].astype(np.int16)
        b = out[:, :, 2].astype(np.int16)
        opaque = al > 0
        t = al == 0
        neigh = np.zeros(al.shape, dtype=bool)
        neigh[1:, :] |= t[:-1, :]
        neigh[:-1, :] |= t[1:, :]
        neigh[:, 1:] |= t[:, :-1]
        neigh[:, :-1] |= t[:, 1:]
        fringe = (
            opaque
            & neigh
            & (b >= min_b)
            & (b >= r + dominance)
            & (b >= g + dominance)
        )
        if not fringe.any():
            break
        out[fringe, 3] = 0
    return out


def peel_bright_chroma_halo(
    a: np.ndarray,
    min_lum: int = 210,
    passes: int = 14,
) -> np.ndarray:
    """
    Peel outer bright green-tinted AA left after chroma key.

    Classic peel_green_fringe misses near-white halos where G is only slightly
    above R/B (e.g. RGB 233,255,229) — those read as a fake white sticker rim
    on light fields (hide-seek peek). Only touches pixels adjacent to transparent.
    """
    out = a.copy()
    for _ in range(passes):
        al = out[:, :, 3]
        rgb = out[:, :, :3].astype(np.int16)
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        lum = rgb.max(axis=2)
        opaque = al > 0
        t = al == 0
        neigh = np.zeros(al.shape, dtype=bool)
        neigh[1:, :] |= t[:-1, :]
        neigh[:-1, :] |= t[1:, :]
        neigh[:, 1:] |= t[:, :-1]
        neigh[:, :-1] |= t[:, 1:]
        # Bright outer pixel with green as strongest channel (chroma remnant).
        fringe = opaque & neigh & (lum >= min_lum) & (g >= r) & (g >= b) & (g >= 200)
        if not fringe.any():
            break
        out[fringe, 3] = 0
    return out


def peel_bright_blue_halo(
    a: np.ndarray,
    min_lum: int = 210,
    passes: int = 14,
) -> np.ndarray:
    """Peel outer bright blue-tinted AA left after blue chroma key."""
    out = a.copy()
    for _ in range(passes):
        al = out[:, :, 3]
        rgb = out[:, :, :3].astype(np.int16)
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        lum = rgb.max(axis=2)
        opaque = al > 0
        t = al == 0
        neigh = np.zeros(al.shape, dtype=bool)
        neigh[1:, :] |= t[:-1, :]
        neigh[:-1, :] |= t[1:, :]
        neigh[:, 1:] |= t[:, :-1]
        neigh[:, :-1] |= t[:, 1:]
        fringe = opaque & neigh & (lum >= min_lum) & (b >= r) & (b >= g) & (b >= 200)
        if not fringe.any():
            break
        out[fringe, 3] = 0
    return out


def peel_outer_white_ring(
    a: np.ndarray,
    min_rgb: int = 245,
    max_sat: int = 18,
    passes: int = 20,
) -> np.ndarray:
    """
    Peel model-baked pure-white die-cut rings on the outer silhouette.

    Only near-pure white (not cream belly fills with lower sat/lum variance deep
    inside — those lack transparent neighbors until the ring is gone).
    """
    out = a.copy()
    for _ in range(passes):
        al = out[:, :, 3]
        rgb = out[:, :, :3].astype(np.int16)
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        opaque = al > 0
        t = al == 0
        neigh = np.zeros(al.shape, dtype=bool)
        neigh[1:, :] |= t[:-1, :]
        neigh[:-1, :] |= t[1:, :]
        neigh[:, 1:] |= t[:, :-1]
        neigh[:, :-1] |= t[:, 1:]
        fringe = (
            opaque
            & neigh
            & (rgb[:, :, 0] >= min_rgb)
            & (rgb[:, :, 1] >= min_rgb)
            & (rgb[:, :, 2] >= min_rgb)
            & (sat <= max_sat)
        )
        if not fringe.any():
            break
        out[fringe, 3] = 0
    return out


MIN_ALPHA_ISLAND_PX = 48


def drop_tiny_alpha_islands(
    a: np.ndarray,
    *,
    min_pixels: int = MIN_ALPHA_ISLAND_PX,
    alpha_min: int = 8,
) -> np.ndarray:
    """Drop chroma leftover specks so --stroke cannot inflate them into square nubs.

    8-connected. Always keeps the largest blob, plus every blob >= min_pixels.
    """
    from collections import deque

    out = a.copy()
    opaque = out[:, :, 3] > alpha_min
    if not opaque.any():
        return out

    h, w = opaque.shape
    seen = np.zeros((h, w), dtype=bool)
    blobs: list[tuple[int, np.ndarray, np.ndarray]] = []
    nbrs = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))

    for y, x in np.argwhere(opaque):
        y_i, x_i = int(y), int(x)
        if seen[y_i, x_i]:
            continue
        q: deque[tuple[int, int]] = deque([(y_i, x_i)])
        seen[y_i, x_i] = True
        ys: list[int] = []
        xs: list[int] = []
        while q:
            cy, cx = q.popleft()
            ys.append(cy)
            xs.append(cx)
            for dy, dx in nbrs:
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        blobs.append((len(ys), np.asarray(ys), np.asarray(xs)))

    max_n = max(n for n, _, _ in blobs)
    for n, ys, xs in blobs:
        if n < min_pixels and n < max_n:
            out[ys, xs, 3] = 0
    return out


SILHOUETTE_RGB = (18, 18, 18)


def opaque_bbox(im: Image.Image, pad: int = 8) -> tuple[int, int, int, int] | None:
    a = np.array(im.convert("RGBA"))
    ys, xs = np.where(a[:, :, 3] > 8)
    if len(xs) == 0:
        return None
    y0 = max(0, int(ys.min()) - pad)
    y1 = min(im.height, int(ys.max()) + 1 + pad)
    x0 = max(0, int(xs.min()) - pad)
    x1 = min(im.width, int(xs.max()) + 1 + pad)
    return (x0, y0, x1, y1)


def trim_transparent(im: Image.Image, pad: int = 8) -> Image.Image:
    box = opaque_bbox(im, pad)
    return im if box is None else im.crop(box)


def pad_to_square(im: Image.Image, *, min_side: int | None = None) -> Image.Image:
    """Center RGBA on a square transparent canvas (side = max(w, h) or min_side).

    Used by silhouette-match so cutouts fit 1:1 zone/tray cells after tight trim.
    """
    rgba = im.convert("RGBA")
    w, h = rgba.size
    side = max(w, h)
    if min_side is not None:
        side = max(side, int(min_side))
    if w == side and h == side:
        return rgba
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(rgba, ((side - w) // 2, (side - h) // 2), rgba)
    return canvas


def pad_file_to_square(path: Path, *, min_side: int | None = None) -> Path:
    """Pad an on-disk PNG to square in place; return path."""
    im = Image.open(path)
    out = pad_to_square(im, min_side=min_side)
    out.save(path, format="PNG")
    return path


def flood_silhouette(
    im: Image.Image,
    rgb: tuple[int, int, int] = SILHOUETTE_RGB,
) -> Image.Image:
    """Flood opaque pixels to near-black; keep alpha (subject only — no white rim)."""
    a = np.array(im.convert("RGBA"))
    opaque = a[:, :, 3] > 8
    a[opaque, 0] = rgb[0]
    a[opaque, 1] = rgb[1]
    a[opaque, 2] = rgb[2]
    return Image.fromarray(a)


def add_white_stroke(
    im: Image.Image,
    width_px: int = 16,
    color: tuple[int, int, int] = (255, 255, 255),
) -> Image.Image:
    """
    Morphological white die-cut rim outside subject alpha (smooth, no CSS jaggedness).
    Prefer this over layout.stickerStrokeCss for production stickers.
    """
    item, _sil = bake_stroke_and_silhouette(im, width_px=width_px, stroke_color=color)
    return item


def bake_stroke_and_prestroke(
    im: Image.Image,
    width_px: int = 16,
    stroke_color: tuple[int, int, int] = (255, 255, 255),
) -> tuple[Image.Image, Image.Image]:
    """
    Bake white rim + color pre-stroke twin from the SAME alpha.

    Both share one trim bbox from the stroked item (transparent margin on the
    pre-stroke twin = where the white rim sits). Used by hide-seek: tray gets
    stroked PNG, peek behind barrier gets the no-rim twin — never a second gen.
    """
    from PIL import ImageFilter

    rgba = im.convert("RGBA")
    if width_px <= 0:
        return rgba, rgba.copy()

    pad = width_px + 4
    w, h = rgba.size
    canvas = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    canvas.paste(rgba, (pad, pad), rgba)

    alpha = canvas.getchannel("A")
    dilated = alpha
    for _ in range(width_px):
        dilated = dilated.filter(ImageFilter.MaxFilter(3))

    stroke = Image.new("RGBA", canvas.size, (*stroke_color, 255))
    stroke.putalpha(dilated)
    item_full = Image.alpha_composite(stroke, canvas)
    prestroke_full = canvas.copy()

    trim_pad = max(8, width_px // 2)
    box = opaque_bbox(item_full, pad=trim_pad)
    if box is None:
        return item_full, prestroke_full
    return item_full.crop(box), prestroke_full.crop(box)


def bake_stroke_and_silhouette(
    im: Image.Image,
    width_px: int = 16,
    stroke_color: tuple[int, int, int] = (255, 255, 255),
    sil_rgb: tuple[int, int, int] = SILHOUETTE_RGB,
) -> tuple[Image.Image, Image.Image]:
    """
    Bake white rim + silhouette from the SAME pre-stroke alpha.

    Silhouette uses subject alpha only (no rim) so zones are not inflated.
    Both share one trim bbox from the stroked item so fillsMatchZoneSize aligns:
    transparent margin on sil = where the white rim sits on the item.
    """
    item, prestroke = bake_stroke_and_prestroke(im, width_px=width_px, stroke_color=stroke_color)
    if width_px <= 0:
        return item, flood_silhouette(prestroke, sil_rgb)
    return item, flood_silhouette(prestroke, sil_rgb)


def chroma_cutout(rgb_bytes: bytes, *, chroma: str = "green") -> Image.Image:
    """Chroma-key + fringe peels + tiny-island drop — no white stroke."""
    src = np.array(Image.open(io.BytesIO(rgb_bytes)).convert("RGBA"))
    # peel_dark_fringe eats near-black subject edges (pandas) — not in default.
    if chroma == "green":
        cut = peel_green_fringe(green_key(src), min_g=120, dominance=30, passes=10)
        cut = peel_bright_chroma_halo(cut)
    elif chroma == "blue":
        cut = peel_blue_fringe(blue_key(src), min_b=120, dominance=30, passes=10)
        cut = peel_bright_blue_halo(cut)
    else:
        raise ValueError(f"Unsupported chroma color: {chroma!r}")
    cut = peel_outer_white_ring(cut)
    cut = drop_tiny_alpha_islands(cut)
    return trim_transparent(Image.fromarray(cut))


def cutout(rgb_bytes: bytes, *, stroke_px: int = 0, chroma: str = "green") -> Image.Image:
    cut = chroma_cutout(rgb_bytes, chroma=chroma)
    if stroke_px > 0:
        print(f"White stroke bake: {stroke_px}px")
        cut = add_white_stroke(cut, width_px=stroke_px)
    return cut


def cutout_with_silhouette(
    rgb_bytes: bytes,
    *,
    stroke_px: int = 0,
    chroma: str = "green",
) -> tuple[Image.Image, Image.Image]:
    """
    Cutout → optional stroke item + silhouette from pre-stroke alpha.
    Returns (item_png, silhouette_png) with matching bbox when stroke_px > 0.
    """
    base = chroma_cutout(rgb_bytes, chroma=chroma)
    if stroke_px > 0:
        print(f"White stroke bake: {stroke_px}px (silhouette from pre-stroke)")
    return bake_stroke_and_silhouette(base, width_px=stroke_px)


def cutout_with_peek(
    rgb_bytes: bytes,
    *,
    stroke_px: int = 0,
    chroma: str = "green",
) -> tuple[Image.Image, Image.Image]:
    """
    Cutout → stroked tray item + color no-rim peek twin (same identity / bbox).
    """
    base = chroma_cutout(rgb_bytes, chroma=chroma)
    if stroke_px > 0:
        print(f"White stroke bake: {stroke_px}px (peek twin from pre-stroke)")
    return bake_stroke_and_prestroke(base, width_px=stroke_px)


def cutout_file(raw_path: Path, *, stroke_px: int = 0, chroma: str = "green") -> Image.Image:
    return cutout(raw_path.read_bytes(), stroke_px=stroke_px, chroma=chroma)

def png_on_chroma(
    src: Path,
    dest: Path,
    canvas: int = 1024,
    pad_max: int = 900,
    *,
    chroma: str = "green",
) -> Path:
    """Composite transparent PNG onto solid green/blue chroma for referenceImages."""
    im = Image.open(src).convert("RGBA")
    if chroma == "green":
        bg = (0, 255, 0, 255)
    elif chroma == "blue":
        bg = (0, 80, 255, 255)
    else:
        raise ValueError(f"Unsupported chroma color: {chroma!r}")
    board = Image.new("RGBA", (canvas, canvas), bg)
    ratio = min(pad_max / im.width, pad_max / im.height)
    nw, nh = int(im.width * ratio), int(im.height * ratio)
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    board.paste(resized, ((canvas - nw) // 2, (canvas - nh) // 2), resized)
    dest.parent.mkdir(parents=True, exist_ok=True)
    board.convert("RGB").save(dest)
    return dest


def generate_sticker(
    *,
    key: str,
    prompt_file: Path,
    out_name: str | None = None,
    refs: list[Path] | None = None,
    out_dir: Path = OUT,
    model: str | None = None,
    size: tuple[int, int] | None = None,
    thinking: str | None = None,
    stroke_px: int = 0,
    silhouette_name: str | None = None,
    peek_name: str | None = None,
    shared: str | None = None,
    chroma: str = "green",
) -> tuple[Path, Path]:
    """
    Run one inference + cutout (+ optional baked white stroke).
    If silhouette_name is set, also writes a pre-stroke silhouette (same bbox as item).
    If peek_name is set, also writes a color no-rim twin (hide-seek peek; same bbox).
    `shared`: style | decal-field | none (default: infer from prompt file).
    Returns (transparent_png, raw_png).
    """
    prompt_path = resolve_path(prompt_file)
    prompt, shared_kind = load_prompt(prompt_path, shared=shared)
    prompt = adapt_prompt_for_chroma(prompt, chroma=chroma)
    air = model or GEN_MODEL
    width, height = size or SIZE
    print(f"Generate {width}x{height} with {air}")
    print(f"Prompt file: {prompt_path.name} ({len(prompt)} chars)")
    print(f"Shared inject: {shared_kind}")

    task: dict = {
        "taskType": "imageInference",
        "taskUUID": str(uuid.uuid4()),
        "model": air,
        "positivePrompt": prompt,
        "width": width,
        "height": height,
        "numberResults": 1,
        "outputFormat": "PNG",
    }

    if thinking:
        task["settings"] = {"thinking": thinking}

    if refs:
        uris: list[str] = []
        for ref in refs:
            path = resolve_path(ref)
            if not path.exists():
                raise SystemExit(f"Reference not found: {path}")
            print(f"Reference: {path} ({path.stat().st_size} bytes)")
            uris.append(file_to_data_uri(path))
        task["inputs"] = {"referenceImages": uris}

    gen = post(key, [task])
    items = gen.get("data") or []
    if not items or "imageURL" not in items[0]:
        raise SystemExit(f"Unexpected gen response: {json.dumps(gen, indent=2)}")

    source_url = items[0]["imageURL"]
    print(f"Generated: {source_url}")

    with urllib.request.urlopen(source_url, timeout=180) as img:
        raw_bytes = img.read()

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = out_name or uuid.uuid4().hex[:8]
    raw_path = out_dir / f"{stem}-raw.png"
    path = out_dir / f"{stem}.png"
    raw_path.write_bytes(raw_bytes)

    print(f"Cutout: {chroma} chroma")
    if peek_name or silhouette_name:
        base = chroma_cutout(raw_bytes, chroma=chroma)
        if stroke_px > 0:
            print(f"White stroke bake: {stroke_px}px (twins from pre-stroke)")
        item, prestroke = bake_stroke_and_prestroke(base, width_px=stroke_px)
        item.save(path, format="PNG")
        if peek_name:
            peek_path = out_dir / f"{peek_name}.png"
            prestroke.save(peek_path, format="PNG")
            print(f"Saved peek twin:   {peek_path}")
        if silhouette_name:
            sil_path = out_dir / f"{silhouette_name}.png"
            flood_silhouette(prestroke).save(sil_path, format="PNG")
            print(f"Saved silhouette:  {sil_path}")
    else:
        cutout(raw_bytes, stroke_px=stroke_px, chroma=chroma).save(path, format="PNG")

    print(f"Saved transparent: {path}")
    print(f"Saved raw:         {raw_path}")
    return path, raw_path
