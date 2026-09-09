---
name: image-gen
description: >-
  Generate transparent PNG icons/images via the local Runware CLI
  (tools/image_gen). Use when the user asks to generate an image, icon,
  sticker, asset without background, Dota-style UI chrome, Runware gen, or
  similar (Russian/Ukrainian/English: сгенерируй иконку, без фона,
  generate icon, transparent PNG).
---

# Image generation (Runware)

Local Python CLI → Runware `imageInference` → chroma cutout → transparent PNG.

## When to use

User asks to generate an icon/image/asset (especially “without background” / transparent). Run this pipeline instead of inventing placeholders or calling unrelated APIs.

## Prerequisites

From repo root:

```bash
py -3 -m pip install -r tools/image_gen/requirements.txt
```

`RUNWARE_API_KEY` must be in repo-root `.env` (see `.env.example`). Never commit the key or print it.

## Generate

Default inject is **Dota 2 client UI chrome** (`prompts/_inject/style.txt` via `--shared style`).

```bash
py -3 tools/image_gen/generate_image.py \
  --prompt "<subject only: what the control is>" \
  --out-name <kebab-stem> \
  --chroma green \
  --stroke 0 \
  --shared style
```

Subject examples (style comes from inject — do not restate full HUD style):

- `pushpin / thumbtack map marker for pinning a panel`
- `mute speaker control`
- `settings gear`

Or with a file:

```bash
py -3 tools/image_gen/generate_image.py \
  --prompt-file prompts/_scratch/prompt.txt \
  --out-name <kebab-stem> \
  --chroma green \
  --stroke 0
```

Outputs (gitignored):

- `output/images/<stem>.png` — transparent cutout
- `output/images/<stem>-raw.png` — raw model frame

Approved assets may be copied to `public/images/dota2/` when shipping in the app.

## Prompt rules

- Prefer `--shared style` (project default). Subject describes **what**, inject sets **Dota client UI chrome how**.
- Style means HUD / control glyph — **not** inventory loot, gems, filigree, or lore artifacts unless the user explicitly asks for a shop item.
- Do **not** invent Owlika/kids inject text.
- Use `--shared none` only when the user wants a fully custom style with no project inject.
- Chroma backdrop for cutout is appended automatically; do not skip cutout for “no background” requests.
- Use `--chroma blue` when the subject itself is green-heavy (so green key would eat it).
- Icons: `--stroke 0`. Optional white rim: `--stroke 12` (or similar).
- Stronger model when needed: `--model google:4@3 --thinking HIGH`.

## After success

Report the path to `output/images/<stem>.png`. Do not commit `.env`, `output/`, or scratch prompts unless the user explicitly asks.
