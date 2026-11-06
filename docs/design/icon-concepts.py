import math, sys
from PIL import Image, ImageDraw, ImageFont, ImageChops

SS = 4
T = 256           # tile size on the sheet
W = (255, 255, 255, 255)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
def bg(size, c1, c2):
    img = Image.new("RGBA", (size, size)); px = img.load()
    for y in range(size):
        for x in range(size):
            px[x, y] = lerp(c1, c2, (x + y) / (2 * (size - 1))) + (255,)
    return img
def rounded(img, radius):
    m = Image.new("L", img.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    img.putalpha(m); return img

def canvas(): return Image.new("RGBA", (T * SS, T * SS), (0, 0, 0, 0))
def P(x, y): return (x * T * SS, y * T * SS)
def finish(big): return big.resize((T, T), Image.LANCZOS)

def pin(d, cx, cy, R, color=W, hole=True, hole_color=(0, 0, 0, 0), img=None):
    tipy = cy + R * 1.9
    ang = math.asin(R / (tipy - cy))
    l = (cx - R * math.cos(ang), cy + R * math.sin(ang)); r = (cx + R * math.cos(ang), cy + R * math.sin(ang))
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=color)
    d.polygon([l, r, (cx, tipy)], fill=color)
    if hole:
        hr = R * 0.42
        d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=hole_color)

def stroke_path(d, pts, w, color=W):
    d.line(pts, fill=color, width=int(w), joint="curve")
    for p in pts: d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=color)

def arrowhead(d, tip, direction, w, color=W):
    dx, dy = direction; n = math.hypot(dx, dy); dx, dy = dx / n, dy / n
    base = (tip[0] - dx * w * 1.9, tip[1] - dy * w * 1.9)
    px, py = -dy, dx
    d.polygon([tip, (base[0] + px * w * 1.1, base[1] + py * w * 1.1), (base[0] - px * w * 1.1, base[1] - py * w * 1.1)], fill=color)

def cut(img, mask_img):
    a = img.split()[3]; m = mask_img.split()[3]
    img.putalpha(ImageChops.multiply(a, Image.eval(m, lambda v: 255 - v))); return img

# ---- Concepts -------------------------------------------------------------

def c_detour_original():
    big = canvas(); d = ImageDraw.Draw(big); w = T * SS * 0.11
    pts = [P(.26, .80), P(.26, .56), P(.42, .44), P(.58, .56), P(.74, .44), P(.74, .32)]
    stroke_path(d, pts, w); arrowhead(d, P(.74, .17), (0, -1), w)
    return big

def c_detour_pin():
    big = canvas(); d = ImageDraw.Draw(big); w = T * SS * 0.10
    pts = [P(.22, .82), P(.22, .60), P(.40, .48), P(.56, .60), P(.70, .50)]
    stroke_path(d, pts, w)
    pin(d, *P(.70, .30), T * SS * 0.13)
    return big

def c_link_pin():
    big = canvas(); d = ImageDraw.Draw(big); w = T * SS * 0.075
    # chain link: two rounded rects at 45 degrees
    link = Image.new("RGBA", big.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(link)
    cx, cy = P(.30, .50); L, H = T * SS * .22, T * SS * .12
    for off in (-L * 0.32, L * 0.32):
        ld.rounded_rectangle([cx + off - L / 2, cy - H / 2, cx + off + L / 2, cy + H / 2], radius=H / 2, outline=W, width=int(w))
    link = link.rotate(45, center=(cx, cy), resample=Image.BICUBIC)
    big.alpha_composite(link); d = ImageDraw.Draw(big)
    stroke_path(d, [P(.47, .50), P(.56, .50)], w); arrowhead(d, P(.62, .50), (1, 0), w)
    pin(d, *P(.78, .44), T * SS * 0.12)
    return big

def c_swap_pins():
    big = canvas(); d = ImageDraw.Draw(big); w = T * SS * 0.07
    pin(d, *P(.30, .52), T * SS * 0.13, color=(255, 255, 255, 110))
    pin(d, *P(.70, .52), T * SS * 0.15)
    # arc from left pin over to right pin
    cx, cy, r = P(.50, .50)[0], P(.50, .50)[1], T * SS * 0.26
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * 0.75 * math.sin(math.radians(a))) for a in range(200, 331, 5)]
    stroke_path(d, pts, w); arrowhead(d, P(.735, .30), (0.8, 0.6), w)
    return big

def c_uturn():
    big = canvas(); d = ImageDraw.Draw(big); w = T * SS * 0.12
    cx, cy, r = P(.50, .44)[0], P(.50, .44)[1], T * SS * 0.18
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(180, 361, 4)]
    pts = [P(.32, .78)] + [(cx - r, cy)] + pts[1:] + [(cx + r, cy + r * 0.9)]
    stroke_path(d, pts, w); arrowhead(d, P(.68, .80), (0, 1), w)
    return big

def c_open_in_maps():
    big = canvas(); d = ImageDraw.Draw(big); w = T * SS * 0.075
    # share-style box with an open top, a pin rising out of it
    x0, y0, x1, y1 = P(.24, .40)[0], P(.24, .40)[1], P(.76, .84)[0], P(.76, .84)[1]
    box = Image.new("RGBA", big.size, (0, 0, 0, 0)); bd = ImageDraw.Draw(box)
    bd.rounded_rectangle([x0, y0, x1, y1], radius=T * SS * 0.06, outline=W, width=int(w))
    gap = Image.new("RGBA", big.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(gap)
    gd.rectangle([P(.36, .30)[0], P(.36, .30)[1], P(.64, .50)[0], P(.64, .50)[1]], fill=W)
    box = cut(box, gap); big.alpha_composite(box); d = ImageDraw.Draw(big)
    pin(d, *P(.50, .36), T * SS * 0.13)
    return big

palettes = {
    "blue":   ((52, 78, 230), (28, 180, 200)),
    "indigo": ((70, 60, 220), (120, 90, 255)),
    "green":  ((26, 150, 100), (60, 200, 140)),
    "navy":   ((20, 40, 90), (40, 90, 170)),
    "orange": ((240, 120, 30), (250, 180, 50)),
    "teal":   ((0, 130, 150), (20, 190, 190)),
}
concepts = [
    ("1  Detour path (original)", c_detour_original, "blue"),
    ("2  Detour path to a pin", c_detour_pin, "navy"),
    ("3  Link becomes a pin", c_link_pin, "indigo"),
    ("4  This pin instead", c_swap_pins, "teal"),
    ("5  U-turn", c_uturn, "orange"),
    ("6  Open in Maps (share box + pin)", c_open_in_maps, "green"),
]
font = ImageFont.load_default(size=18)
cols = 3; pad = 24; label_h = 40
sheet = Image.new("RGBA", (cols * (T + pad) + pad, 2 * (T + label_h + pad) + pad), (245, 245, 247, 255))
sd = ImageDraw.Draw(sheet)
out_dir = sys.argv[1]
for i, (label, fn, pal) in enumerate(concepts):
    tile = rounded(bg(T, *palettes[pal]), int(T * 0.225))
    tile.alpha_composite(finish(fn()))
    x = pad + (i % cols) * (T + pad); y = pad + (i // cols) * (T + label_h + pad)
    sheet.alpha_composite(tile, (x, y))
    sd.text((x, y + T + 10), label, fill=(30, 30, 30, 255), font=font)
    tile.save(f"{out_dir}/concept-{i + 1}.png")
    # small-size preview row under each label
    small = tile.resize((48, 48), Image.LANCZOS); sheet.alpha_composite(small, (x + T - 48, y + T + 2))
sheet.save(f"{out_dir}/concepts.png")
print("sheet written")
