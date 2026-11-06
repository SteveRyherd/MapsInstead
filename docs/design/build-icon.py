"""
Build docs/design/icon-source.png layer by layer, no external artwork.

Prefer docs/design/icon-studio.html for design work: it is the same drawing with draggable
handles and colour pickers, and its Export button writes icon-source.png directly. This script is
the command-line equivalent; keep the two sets of defaults in step when you change one.

    python3 docs/design/build-icon.py          # writes icon-source.png
    python3 docs/design/make-icons.py          # cuts every size from it

Everything tunable is in the CONSTANTS block. Coordinates are fractions of the canvas
(0..1, origin top-left) so they read the same at any size. Requires Pillow.

Layers, bottom to top:
  1. left panel   warm paper map: blocks, parks, a yellow road, thin white streets
  2. right panel  night-blue map: one wide road with a dashed centre line, green parks
  3. divider      curved boundary between the two, with a soft light rim
  4. arrow        white curved arrow from the pin toward the chevron, with shadow
  5. pin          red map pin with highlight, white hole and shadow
  6. chevron      blue navigation arrow with white outline and shadow
  7. lighting     gentle top light and corner vignette
"""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

# ---------------------------------------------------------------- CONSTANTS
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon-source.png")
SIZE = 1024
SS = 2                      # supersampling: draw at SIZE*SS, downsample at the end
S = SIZE * SS

PAPER = (244, 239, 229)
BLOCK = (231, 226, 216)
PARK_L = (186, 214, 142)
ROAD_YELLOW = (242, 200, 75)
STREET_L = (255, 255, 255)

NIGHT_TOP = (36, 92, 196)
NIGHT_BOTTOM = (20, 56, 140)
ROAD_DARK = (23, 38, 74)
ROAD_EDGE = (179, 205, 255)
DASH = (214, 230, 255)
PARK_R = (46, 158, 92)
STREET_R = (70, 130, 228)

PIN_RED = (229, 52, 43)
PIN_RED_DARK = (178, 28, 24)
CHEV_BLUE = (0, 157, 255)
CHEV_BLUE_DARK = (42, 116, 240)
WHITE = (255, 255, 255)

# Divider: cubic Bezier from top to bottom. x values are fractions of width.
DIV_TOP, DIV_C1, DIV_C2, DIV_BOTTOM = (0.66, 0.0), (0.62, 0.35), (0.27, 0.65), (0.33, 1.0)

PIN_CENTER, PIN_RADIUS = (0.265, 0.272), 0.117
ARROW_P0, ARROW_C, ARROW_P1 = (0.218, 0.728), (0.342, 0.523), (0.549, 0.53)
ARROW_WIDTH = 0.073
CHEV_CENTER, CHEV_SIZE, CHEV_ANGLE = (0.738, 0.711), 0.12, 47

# ---------------------------------------------------------------- helpers
def P(x, y): return (x * S, y * S)
def px(v): return v * S

def bezier(p0, p1, p2, p3=None, n=240):
    pts = []
    for i in range(n + 1):
        t = i / n
        if p3 is None:
            x = (1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0]
            y = (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1]
        else:
            x = (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t*t*p2[0] + t**3*p3[0]
            y = (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t*t*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def layer(): return Image.new("RGBA", (S, S), (0, 0, 0, 0))

def vgradient(top, bottom, mask=None):
    g = Image.new("RGBA", (S, S))
    d = ImageDraw.Draw(g)
    for y in range(S):
        t = y / (S - 1)
        d.line([(0, y), (S, y)], fill=tuple(int(top[i] + (bottom[i]-top[i])*t) for i in range(3)) + (255,))
    if mask is not None: g.putalpha(mask)
    return g

def shadow_of(img, blur, dx, dy, alpha=0.35):
    a = img.split()[3].point(lambda v: int(v * alpha))
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0)); sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(px(blur)))
    out = layer(); out.alpha_composite(sh, (int(px(dx)), int(px(dy)))); return out

def stroke(d, pts, w, fill, w_end=None, caps=True):
    """Smooth wide stroke: one polygon offset from the centre line, so curves have no segment joints.
    w_end lets the width taper linearly from w at the start to w_end at the end."""
    if w_end is None: w_end = w
    n = len(pts) - 1
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        a = pts[max(i - 1, 0)]; b = pts[min(i + 1, n)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty) or 1.0
        nx, ny = -ty / L, tx / L
        hw = (w + (w_end - w) * i / n) / 2
        left.append((x + nx * hw, y + ny * hw)); right.append((x - nx * hw, y - ny * hw))
    d.polygon(left + right[::-1], fill=fill)
    if caps:
        for p, hw in ((pts[0], w / 2), (pts[-1], w_end / 2)):
            d.ellipse([p[0]-hw, p[1]-hw, p[0]+hw, p[1]+hw], fill=fill)

def rotate(pt, c, deg):
    a = math.radians(deg); x, y = pt[0]-c[0], pt[1]-c[1]
    return (c[0] + x*math.cos(a) - y*math.sin(a), c[1] + x*math.sin(a) + y*math.cos(a))

def rotated_rect(d, cx, cy, w, h, deg, fill, radius=0):
    tmp = layer(); td = ImageDraw.Draw(tmp)
    td.rounded_rectangle([cx-w/2, cy-h/2, cx+w/2, cy+h/2], radius=radius, fill=fill)
    tmp = tmp.rotate(deg, center=(cx, cy), resample=Image.BICUBIC)
    return tmp

# ---------------------------------------------------------------- 1. left panel
canvas = Image.new("RGBA", (S, S), PAPER + (255,))
left = layer(); ld = ImageDraw.Draw(left)
GRID_ANGLE = -14
# blocks: a rotated grid of rounded rectangles with street gaps between them
for row in range(-2, 7):
    for col in range(-2, 6):
        cx = px(0.08 + col * 0.21); cy = px(0.02 + row * 0.19)
        cxr, cyr = rotate((cx, cy), P(0.3, 0.5), GRID_ANGLE)
        fill = BLOCK + (255,)
        if (row, col) in [(1, 0), (3, 2), (5, -1)]: fill = PARK_L + (255,)
        left.alpha_composite(rotated_rect(ld, cxr, cyr, px(0.17), px(0.15), GRID_ANGLE, fill, radius=px(0.012)))
# one yellow avenue along a grid line
ld = ImageDraw.Draw(left)
a0 = rotate(P(0.0, 0.44), P(0.3, 0.5), GRID_ANGLE); a1 = rotate(P(0.75, 0.44), P(0.3, 0.5), GRID_ANGLE)
stroke(ld, [a0, a1], px(0.035), ROAD_YELLOW + (255,))
b0 = rotate(P(0.33, -0.1), P(0.3, 0.5), GRID_ANGLE); b1 = rotate(P(0.33, 1.1), P(0.3, 0.5), GRID_ANGLE)
stroke(ld, [b0, b1], px(0.03), ROAD_YELLOW + (255,))
canvas.alpha_composite(left)

# ---------------------------------------------------------------- 2. right panel
night = vgradient(NIGHT_TOP, NIGHT_BOTTOM)
rd = ImageDraw.Draw(night)
# parks
for (cx, cy, w, h, deg) in [(0.90, 0.12, 0.22, 0.16, 30), (0.60, 0.92, 0.20, 0.14, 30), (0.98, 0.80, 0.14, 0.18, 30)]:
    night.alpha_composite(rotated_rect(rd, px(cx), px(cy), px(w), px(h), deg, PARK_R + (255,), radius=px(0.02)))
rd = ImageDraw.Draw(night)
# thin streets
for off in (-0.30, 0.30):
    stroke(rd, bezier(P(0.44 + off, 1.04), P(0.68 + off, 0.64), P(1.04 + off, 0.36)), px(0.016), STREET_R + (255,))
for (x0, y0, x1, y1) in [(0.50, 0.30, 1.05, 0.66), (0.62, 0.02, 1.05, 0.30)]:
    stroke(rd, [P(x0, y0), P(x1, y1)], px(0.016), STREET_R + (255,))
# the wide road, bottom-left to top-right, with soft edges and a dashed centre line
road_pts = bezier(P(0.44, 1.04), P(0.68, 0.64), P(1.04, 0.36))
stroke(rd, road_pts, px(0.27), ROAD_EDGE + (255,))
stroke(rd, road_pts, px(0.24), ROAD_DARK + (255,))
# dashes: split the centre line into on/off runs by arc length and stroke each run smoothly
seg_on, seg_off = px(0.07), px(0.05)
acc, on, run = 0.0, True, [road_pts[0]]
for i in range(1, len(road_pts)):
    a, b = road_pts[i-1], road_pts[i]
    acc += math.dist(a, b); run.append(b)
    if on and acc >= seg_on:
        stroke(rd, run, px(0.014), DASH + (255,), caps=False); on, acc, run = False, 0.0, [b]
    elif not on and acc >= seg_off:
        on, acc, run = True, 0.0, [b]
if on and len(run) > 1: stroke(rd, run, px(0.014), DASH + (255,), caps=False)

# mask the night panel to the right of the divider curve
div = bezier(P(*DIV_TOP), P(*DIV_C1), P(*DIV_C2), P(*DIV_BOTTOM))
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).polygon(div + [(S, S), (S, 0)], fill=255)
night.putalpha(mask)
canvas.alpha_composite(night)

# ---------------------------------------------------------------- 3. divider rim
rim = layer(); rdw = ImageDraw.Draw(rim)
stroke(rdw, div, px(0.012), (255, 255, 255, 120))
rim = rim.filter(ImageFilter.GaussianBlur(px(0.006)))
canvas.alpha_composite(rim)
# a soft shadow cast by the night panel onto the paper, just left of the curve
edge_sh = layer(); esd = ImageDraw.Draw(edge_sh)
stroke(esd, [(x - px(0.008), y) for x, y in div], px(0.02), (0, 0, 0, 60))
edge_sh = edge_sh.filter(ImageFilter.GaussianBlur(px(0.015)))
edge_sh.putalpha(ImageChops.multiply(edge_sh.split()[3], ImageChops.invert(mask)))
canvas.alpha_composite(edge_sh)

# ---------------------------------------------------------------- 4. arrow
arrow = layer(); ad = ImageDraw.Draw(arrow)
apts = bezier(P(*ARROW_P0), P(*ARROW_C), P(*ARROW_P1))
w = px(ARROW_WIDTH)
# taper: thin at the tail, full at the head, as one smooth polygon
stroke(ad, apts, w * 0.45, WHITE + (255,), w_end=w)
# arrowhead aligned with the curve's end tangent
ex, ey = apts[-1]; tx, ty = apts[-1][0]-apts[-4][0], apts[-1][1]-apts[-4][1]
n = math.hypot(tx, ty); tx, ty = tx/n, ty/n; nx, ny = -ty, tx
L, H = w * 2.75, w * 1.5
back = (ex - tx * w * 0.6, ey - ty * w * 0.6)
ad.polygon([(back[0] + tx*L, back[1] + ty*L), (back[0] + nx*H, back[1] + ny*H), (back[0] - nx*H, back[1] - ny*H)], fill=WHITE + (255,))
canvas.alpha_composite(shadow_of(arrow, 0.012, 0.008, 0.014, 0.35))
canvas.alpha_composite(arrow)

# ---------------------------------------------------------------- 5. pin
pin = layer(); pd = ImageDraw.Draw(pin)
cx, cy = P(*PIN_CENTER); R = px(PIN_RADIUS); tipy = cy + R * 2.0
ang = math.asin(R / (tipy - cy))
pd.ellipse([cx-R, cy-R, cx+R, cy+R], fill=(255, 0, 0, 255))
pd.polygon([(cx - R*math.cos(ang), cy + R*math.sin(ang)), (cx + R*math.cos(ang), cy + R*math.sin(ang)), (cx, tipy)], fill=(255, 0, 0, 255))
pin_mask = pin.split()[3]
pin = vgradient(PIN_RED, PIN_RED_DARK, pin_mask)
pd = ImageDraw.Draw(pin)
hr = R * 0.40
pd.ellipse([cx-hr, cy-hr, cx+hr, cy+hr], fill=(250, 240, 236, 255))
# highlight
hl = layer(); hd = ImageDraw.Draw(hl)
hd.ellipse([cx-R*0.75, cy-R*0.95, cx+R*0.2, cy-R*0.25], fill=(255, 255, 255, 90))
hl = hl.filter(ImageFilter.GaussianBlur(px(0.012))); hl.putalpha(ImageChops.multiply(hl.split()[3], pin_mask))
pin.alpha_composite(hl)
# ground shadow (ellipse under the tip) plus drop shadow
ground = layer(); gd = ImageDraw.Draw(ground)
gd.ellipse([cx-R*0.55, tipy-R*0.12, cx+R*0.55, tipy+R*0.12], fill=(0, 0, 0, 110))
canvas.alpha_composite(ground.filter(ImageFilter.GaussianBlur(px(0.01))))
canvas.alpha_composite(shadow_of(pin, 0.015, 0.012, 0.018, 0.30))
canvas.alpha_composite(pin)

# ---------------------------------------------------------------- 6. chevron
def chevron_points(c, size, deg, scale=1.0):
    pts = [(0, -1.0), (-0.78, 0.78), (0, 0.42), (0.78, 0.78)]
    return [rotate((c[0] + x*size*scale, c[1] + y*size*scale), c, deg) for x, y in pts]
cc = P(*CHEV_CENTER); cs = px(CHEV_SIZE)
outline = layer(); od = ImageDraw.Draw(outline)
od.polygon(chevron_points(cc, cs, CHEV_ANGLE, 1.4), fill=WHITE + (255,))
body = layer(); bd = ImageDraw.Draw(body)
bd.polygon(chevron_points(cc, cs, CHEV_ANGLE), fill=(0, 0, 255, 255))
body = vgradient(CHEV_BLUE, CHEV_BLUE_DARK, body.split()[3])
# facet: darker right half for a folded-paper look
facet = layer(); fd = ImageDraw.Draw(facet)
pts = chevron_points(cc, cs, CHEV_ANGLE)
fd.polygon([pts[0], pts[2], pts[3]], fill=(0, 0, 0, 89))
facet.putalpha(ImageChops.multiply(facet.split()[3], body.split()[3]))
body.alpha_composite(facet)
canvas.alpha_composite(shadow_of(outline, 0.016, 0.010, 0.018, 0.40))
canvas.alpha_composite(outline)
canvas.alpha_composite(body)

# ---------------------------------------------------------------- 7. lighting
light = vgradient((255, 255, 255), (0, 0, 0))
light.putalpha(Image.new("L", (S, S), 28))
canvas.alpha_composite(light)
vig = Image.new("L", (S, S), 0); vd = ImageDraw.Draw(vig)
vd.ellipse([-S*0.1, -S*0.1, S*1.1, S*1.1], fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(px(0.12)))
dark = Image.new("RGBA", (S, S), (0, 0, 0, 0)); dark.putalpha(ImageChops.invert(vig).point(lambda v: int(v * 0.35)))
canvas.alpha_composite(dark)

final = canvas.convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
final.save(OUT)
print("wrote", OUT)
