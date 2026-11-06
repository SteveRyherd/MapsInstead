"""
Cut every icon the project needs from docs/design/icon-source.png (a square 1024 x 1024 PNG,
no rounded corners, no transparency). Run from the repository root:

    python3 docs/design/make-icons.py

Produces:
  Shared (App)/Assets.xcassets/AppIcon.appiconset/   iOS 1024 + macOS 16..512 @1x/@2x (rounded, with margins)
  Shared (Extension)/Resources/images/icon-*.png      Safari extension icons (rounded)
  Shared (Extension)/Resources/images/toolbar-icon-*  monochrome toolbar glyph (Safari tints it)
  docs/images/icon.png                                for the website

Requires Pillow.
"""
import json, math, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "docs", "design", "icon-source.png")
APPSET = os.path.join(ROOT, "Shared (App)", "Assets.xcassets", "AppIcon.appiconset")
IMAGES = os.path.join(ROOT, "Shared (Extension)", "Resources", "images")
DOCS = os.path.join(ROOT, "docs", "images")

source = Image.open(SRC).convert("RGBA")
assert source.size == (1024, 1024), "icon-source.png must be 1024 x 1024"

def rounded(img, radius_ratio=0.2237):
    size = img.size[0]
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    out = img.copy(); out.putalpha(mask); return out

def mac_icon(px):
    """macOS icons carry their own rounded corners and a transparent margin (about 10%)."""
    canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    inner = max(1, int(round(px * 0.8)))
    tile = rounded(source.resize((inner, inner), Image.LANCZOS))
    off = (px - inner) // 2
    canvas.alpha_composite(tile, (off, off))
    return canvas

def toolbar_glyph(px):
    """Monochrome navigation arrow (the brand's 'destination' symbol). Safari tints it."""
    SS = 8; S = px * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    cx, cy = S * 0.52, S * 0.50
    tip = (cx + S * 0.34, cy - S * 0.34)
    left = (cx - S * 0.36, cy + S * 0.02)
    notch = (cx - S * 0.02, cy + S * 0.02)
    bottom = (cx - S * 0.02, cy + S * 0.36)
    d.polygon([tip, left, notch, bottom], fill=(0, 0, 0, 255))
    return img.resize((px, px), Image.LANCZOS)

os.makedirs(APPSET, exist_ok=True); os.makedirs(IMAGES, exist_ok=True); os.makedirs(DOCS, exist_ok=True)
for f in os.listdir(APPSET):
    if f.endswith(".png"): os.remove(os.path.join(APPSET, f))

source.convert("RGB").save(os.path.join(APPSET, "ios-1024.png"))
entries = [{"filename": "ios-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}]
for pt in (16, 32, 128, 256, 512):
    for scale in (1, 2):
        name = f"mac-{pt}x{pt}@{scale}x.png"
        mac_icon(pt * scale).save(os.path.join(APPSET, name))
        entries.append({"filename": name, "idiom": "mac", "scale": f"{scale}x", "size": f"{pt}x{pt}"})
json.dump({"images": entries, "info": {"author": "xcode", "version": 1}}, open(os.path.join(APPSET, "Contents.json"), "w"), indent=2)

for px in (48, 96, 128, 256, 512):
    rounded(source.resize((px, px), Image.LANCZOS)).save(os.path.join(IMAGES, f"icon-{px}.png"))
for px in (16, 19, 32, 38, 48, 72):
    toolbar_glyph(px).save(os.path.join(IMAGES, f"toolbar-icon-{px}.png"))
rounded(source.resize((512, 512), Image.LANCZOS)).save(os.path.join(DOCS, "icon.png"))
print("icons written from", SRC)
