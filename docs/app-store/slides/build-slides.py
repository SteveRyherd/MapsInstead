#!/usr/bin/env python3
"""Renders each style in this folder in headless Chrome and cuts it into App Store slides.

Writes <style>-1.png and so on at 1320 x 2868, plus preview-<style>.png, which shows a style's slides
side by side as the App Store does. The chosen style is paper; route, night and
leap are the alternatives that were tried. Run: python3 docs/app-store/slides/build-slides.py [style ...]
"""
import os
import subprocess
import sys
import tempfile
import time

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WIDTH, HEIGHT, PER_CANVAS = 1320, 2868, 3
PARTS = {"paper": 2}  # Canvases per style.


def render(style, part, canvas):
    with tempfile.TemporaryDirectory() as profile:
        chrome = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                                   "--blink-settings=preferredColorScheme=1", f"--user-data-dir={profile}",
                                   "--allow-file-access-from-files", "--timeout=15000",
                                   f"--window-size={WIDTH * PER_CANVAS},{HEIGHT}", f"--screenshot={canvas}",
                                   f"file://{os.path.join(HERE, style + '.html')}?part={part}"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Chrome sometimes writes the file and then never exits, so wait for the file, not the process.
        deadline = time.time() + 180  # A canvas this size can take over a minute.
        while time.time() < deadline and not os.path.exists(canvas):
            time.sleep(.5)
        time.sleep(2)
        chrome.kill()
        chrome.wait()
    image = Image.open(canvas).convert("RGB")
    os.remove(canvas)
    return image


def build(style):
    parts = PARTS.get(style, 1)
    slides = []
    for part in range(1, parts + 1):
        image = render(style, part, os.path.join(HERE, "canvas.png"))
        slides += [image.crop((i * WIDTH, 0, (i + 1) * WIDTH, HEIGHT)) for i in range(PER_CANVAS)]
    gap, scale = 24, 0.3
    w, h = round(WIDTH * scale), round(HEIGHT * scale)
    preview = Image.new("RGB", (len(slides) * w + (len(slides) + 1) * gap, h + 2 * gap), "white")
    for i, slide in enumerate(slides):
        slide.save(os.path.join(HERE, f"{style}-{i + 1}.png"), optimize=True)
        preview.paste(slide.resize((w, h), Image.LANCZOS), (gap + i * (w + gap), gap))
    preview.save(os.path.join(HERE, f"preview-{style}.png"))
    print(style, "done")


def main():
    styles = sys.argv[1:] or ["paper"]
    for style in styles:
        build(style)


if __name__ == "__main__":
    main()
