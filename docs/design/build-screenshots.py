#!/usr/bin/env python3
"""Cuts the website's step images from the raw captures in docs/screenshots.

Each picture is cropped to the part of the screen that matters, the rest is dimmed, and the thing to
tap gets one rounded ring. The raw captures have boxes drawn on them by hand; those are painted out
first so every picture gets the same highlight. Crops also keep the status bar, unrelated apps and
unrelated search results off the site.

Coordinates are pixels in the raw capture. To change a picture, edit its entry and run:

    python3 docs/design/build-screenshots.py
"""
import glob
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "screenshots")
OUT = os.path.join(HERE, "..", "images")

RING = (255, 59, 48)  # Not the site blue: iOS buttons are blue, and the ring has to stand apart.
PHONE_WIDTH = 800     # Twice the largest size the page shows them.
MAC_WIDTH = 1000
SUPERSAMPLE = 4       # Drawn large then reduced, so the ring's curves stay smooth.

# name: source file, crop, hand-drawn box to paint out and its line width, area to blank, spot
# (x0, y0, x1, y1, radius), dimming 0-1.
SHOTS = {
    "ios-settings-apps": dict(
        src="ios-settings-app.png", crop=(0, 1430, 1206, 2334),
        erase=(24, 1865, 1184, 2078), spot=(40, 1880, 1166, 2062, 56), dim=.34),
    "ios-settings-apps-safari": dict(
        src="ios-settings-apps-safari.png", crop=(0, 980, 1206, 1884),
        erase=(16, 1093, 1184, 1294), spot=(40, 1110, 1166, 1278, 40), dim=.34),
    "ios-settings-safari": dict(
        src="ios-settings-extensions.png", crop=(0, 590, 1206, 1494),
        erase=(20, 1121, 1188, 1322), spot=(40, 1140, 1166, 1304, 40), dim=.34),
    "ios-settings-remapped": dict(
        src="ios-settings-mapsinstead1.png", crop=(0, 730, 1206, 1936),
        spot=(40, 1150, 1166, 1620, 56), dim=.28),
    "ios-safari-menu": dict(
        src="ios-safari-settings.png", crop=(325, 1825, 1175, 2463),
        erase=(333, 2303, 1136, 2452), spot=(345, 2315, 1124, 2440, 40), dim=.34),
    "ios-safari-menu-app": dict(
        src="IMG_0200.PNG", crop=(325, 1900, 1175, 2538),
        spot=(345, 2195, 1124, 2320, 40), dim=.34),
    "ios-safari-prompt": dict(
        src="ios-always-allow.png", crop=(30, 770, 1176, 1930),
        erase=(140, 1536, 1065, 1736), spot=(160, 1550, 1045, 1722, 86), dim=.14),
    "ios-safari-every-website": dict(
        src="ios-always-allow-everywebsite.png", crop=(30, 790, 1176, 1916),
        erase=(144, 1515, 1060, 1696), spot=(160, 1525, 1045, 1686, 80), dim=.14),
    "ios-google-result": dict(src="ios-first-test-search.png", crop=(0, 905, 1206, 1720)),
    "ios-test": dict(src="ios-success.png", crop=(0, 560, 1206, 1800)),
    # macOS puts a narrow no-break space before PM in screenshot names.
    "mac-safari-settings": dict(
        src="Screenshot 2026-11-06 at 7.34.32\u202fPM.png", crop=(0, 195, 1672, 1092),
        erase=(13, 423, 481, 560), line=15, spot=(22, 434, 472, 550, 16), dim=.3, width=MAC_WIDTH),
    "mac-permissions": dict(
        src="Screenshot 2026-11-06 at 7.37.46\u202fPM.png", crop=(480, 200, 1660, 1090),
        erase=(1128, 900, 1632, 1031), line=15, blank=(1120, 1022, 1645, 1046),
        spot=(1140, 914, 1620, 1018, 16), dim=.3, width=MAC_WIDTH),
}


def paint_out(image, box, thickness=4, margin=3):
    """Removes a hand-drawn rectangle by blending across each of its four lines."""
    x0, y0, x1, y1 = box
    pixels = image.load()
    width, height = image.size

    def blend(a, b, t):
        return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

    for line in (y0, y1 - thickness + 1):
        top, bottom = line - margin, line + thickness - 1 + margin
        for x in range(max(0, x0 - margin), min(width, x1 + margin + 1)):
            a, b = pixels[x, top - 1], pixels[x, bottom + 1]
            for y in range(top, bottom + 1):
                pixels[x, y] = blend(a, b, (y - top + 1) / (bottom - top + 2))
    for line in (x0, x1 - thickness + 1):
        left, right = line - margin, line + thickness - 1 + margin
        for y in range(max(0, y0 - margin), min(height, y1 + margin + 1)):
            a, b = pixels[left - 1, y], pixels[right + 1, y]
            for x in range(left, right + 1):
                pixels[x, y] = blend(a, b, (x - left + 1) / (right - left + 2))


def spotlight(image, spot, dim, ring_width):
    """Dims everything outside the rounded rectangle and draws the ring around it."""
    x0, y0, x1, y1, radius = spot
    s = SUPERSAMPLE
    big = (image.width * s, image.height * s)
    rect = [x0 * s, y0 * s, x1 * s, y1 * s]

    shade = Image.new("L", big, round(255 * dim))
    ImageDraw.Draw(shade).rounded_rectangle(rect, radius * s, fill=0)
    image.paste((0, 0, 0), mask=shade.resize(image.size, Image.LANCZOS))

    ring = Image.new("L", big, 0)
    ImageDraw.Draw(ring).rounded_rectangle(rect, radius * s, outline=255, width=ring_width * s)
    image.paste(RING, mask=ring.resize(image.size, Image.LANCZOS))


def build(name, src, crop, erase=None, line=4, blank=None, spot=None, dim=0, width=PHONE_WIDTH):
    image = Image.open(os.path.join(RAW, src)).convert("RGB")
    if erase:
        paint_out(image, erase, line)
    if blank:  # Text the hand-drawn box cut through: cover what is left with the colour beneath it.
        image.paste(image.getpixel((blank[0] + 8, blank[3] + 6)), blank)
    x0, y0, x1, y1 = crop
    image = image.crop(crop)
    if spot:
        spotlight(image, (spot[0] - x0, spot[1] - y0, spot[2] - x0, spot[3] - y0, spot[4]), dim, 7)
    height = round(image.height * width / image.width)
    image = image.resize((width, height), Image.LANCZOS)
    # A 256-colour palette would band the blurred iOS materials, so these stay full colour.
    image.save(os.path.join(OUT, name + ".png"), optimize=True)
    print(f"{name}.png  {width}x{height}")


def main():
    for name, shot in SHOTS.items():
        build(name, **shot)


if __name__ == "__main__":
    main()
