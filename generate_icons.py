"""
Generate Android launcher icons from icon-512.png using Pillow.
Sizes per mipmap density:
  mdpi:    48x48 (ic_launcher, ic_launcher_round)
  hdpi:    72x72
  xhdpi:   96x96
  xxhdpi: 144x144
  xxxhdpi:192x192

For the adaptive icon foreground (ic_launcher_foreground), use 108x108 safe zone
inside a 1024x1024 canvas (or proportionally scaled). @capacitor/assets uses
108-dp foreground at each density with a 25% bleed zone — so the foreground PNG
is 1.5x the launcher size at each density:
  mdpi:    72x72  (48 * 1.5)
  hdpi:   108x108
  xhdpi:  144x144
  xxhdpi: 216x216
  xxxhdpi:288x288

The background color for the adaptive icon is #121210 (dark, matches app theme).
"""

from PIL import Image, ImageDraw
import os
import math

SRC = r"C:\Users\bloki\Desktop\Programmation\coreen\icon-512.png"
RES_DIR = r"C:\Users\bloki\Desktop\Programmation\coreen\android\app\src\main\res"
BG_COLOR = (18, 18, 16, 255)  # #121210 fully opaque

DENSITIES = {
    "mipmap-mdpi":    {"launcher": 48,  "foreground": 72},
    "mipmap-hdpi":    {"launcher": 72,  "foreground": 108},
    "mipmap-xhdpi":   {"launcher": 96,  "foreground": 144},
    "mipmap-xxhdpi":  {"launcher": 144, "foreground": 216},
    "mipmap-xxxhdpi": {"launcher": 192, "foreground": 288},
}

def make_square(img, size, bg=BG_COLOR):
    """Resize img to fit in size x size, composited on bg."""
    result = Image.new("RGBA", (size, size), bg)
    icon = img.copy()
    icon.thumbnail((size, size), Image.LANCZOS)
    offset = ((size - icon.width) // 2, (size - icon.height) // 2)
    result.paste(icon, offset, icon if icon.mode == "RGBA" else None)
    return result

def make_round(img, size, bg=BG_COLOR):
    """Resize img to size x size with circular mask."""
    square = make_square(img, size, bg)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(square, (0, 0), mask)
    return result

src_img = Image.open(SRC).convert("RGBA")
print(f"Source image: {src_img.size[0]}x{src_img.size[1]}")

for density, sizes in DENSITIES.items():
    out_dir = os.path.join(RES_DIR, density)
    os.makedirs(out_dir, exist_ok=True)

    launcher_size = sizes["launcher"]
    fg_size = sizes["foreground"]

    # ic_launcher.png (square with bg fill)
    launcher = make_square(src_img, launcher_size)
    launcher_path = os.path.join(out_dir, "ic_launcher.png")
    launcher.convert("RGB").save(launcher_path, "PNG", optimize=True)
    sz = os.path.getsize(launcher_path)
    print(f"{density}/ic_launcher.png: {launcher_size}x{launcher_size} -> {sz} bytes")

    # ic_launcher_round.png (circular)
    launcher_round = make_round(src_img, launcher_size)
    round_path = os.path.join(out_dir, "ic_launcher_round.png")
    launcher_round.save(round_path, "PNG", optimize=True)
    sz = os.path.getsize(round_path)
    print(f"{density}/ic_launcher_round.png: {launcher_size}x{launcher_size} -> {sz} bytes")

    # ic_launcher_foreground.png (larger, for adaptive icon layer)
    # Use solid bg underneath so foreground layer is opaque (matches XML background layer)
    fg = make_square(src_img, fg_size, bg=(0, 0, 0, 0))  # transparent bg — foreground only
    fg_path = os.path.join(out_dir, "ic_launcher_foreground.png")
    fg.save(fg_path, "PNG", optimize=True)
    sz = os.path.getsize(fg_path)
    print(f"{density}/ic_launcher_foreground.png: {fg_size}x{fg_size} -> {sz} bytes")

print("\nDone. All icons regenerated.")
