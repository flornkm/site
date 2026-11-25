"""Bakes the tileable paper textures for the gift cards (public/textures/gifts/).

Uncoated, dyed-through stock scanned flat: a felt of short curly fibres, soft clouding
where the pulp settled unevenly, a fine tooth, a whisper of raking-light relief and the
odd inclusion. Everything is periodic (FFT noise, fibres folded across the seams), so the
tiles repeat without a visible edge.

  paper-tone.webp    grey around 50%, applied with mix-blend-mode: soft-light, so it
                     works over any paper colour.
  paper-fine.webp    the same sheet, smoother and better closed, for pale stock.
  paper-flecks.webp  sparse dark inclusions on transparent, applied with multiply.
  paper-normal.webp  the sheet's relief as a normal map, for the lit WebGL card.

Run: python3 scripts/gifts/bake-paper.py [out_dir]
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

N = 1024  # tile size in texture px; shown at 512 CSS px, so 2 texture px per CSS px
SS = 4  # supersampling for the fibre strokes
rng = np.random.default_rng(20251224)


def band_noise(lo: float, hi: float) -> np.ndarray:
    """Periodic noise keeping wavelengths between lo and hi texture px, unit std."""
    f = np.fft.fftfreq(N)
    radius = np.sqrt(f[:, None] ** 2 + f[None, :] ** 2)
    radius[0, 0] = 1
    wavelength = 1 / radius
    mask = np.exp(-((np.log(wavelength / np.sqrt(lo * hi)) / np.log(hi / lo) * 2) ** 2))
    spectrum = np.fft.fft2(rng.standard_normal((N, N))) * mask
    out = np.real(np.fft.ifft2(spectrum))
    return (out - out.mean()) / out.std()


def wrap_fold(canvas: np.ndarray, pad: int) -> np.ndarray:
    """Fold a padded canvas back onto an N×N torus so strokes cross the seams."""
    out = np.zeros((N, N))
    idx = (np.arange(canvas.shape[0]) - pad) % N
    np.add.at(out, (idx[:, None], idx[None, :]), canvas)
    return out


def fibres(count: int, length: tuple[float, float], width: tuple[float, float], curl: float):
    """Curly fibre strokes as coverage in [0, 1+], periodic."""
    pad = int(length[1]) + 4
    size = (N + 2 * pad) * SS
    img = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = rng.uniform(0, N + 2 * pad, 2)
        heading = rng.uniform(0, 2 * np.pi)
        total = rng.uniform(*length)
        steps = max(3, int(total / 3))
        step = total / steps
        turn = rng.normal(0, curl)
        points = [(x * SS, y * SS)]
        for _ in range(steps):
            turn += rng.normal(0, curl * 0.6)
            heading += turn
            x += np.cos(heading) * step
            y += np.sin(heading) * step
            points.append((x * SS, y * SS))
        value = int(rng.uniform(90, 255))
        draw.line(points, fill=value, width=max(1, round(rng.uniform(*width) * SS)), joint="curve")
    small = img.resize((N + 2 * pad, N + 2 * pad), Image.BOX)
    return wrap_fold(np.asarray(small, dtype=np.float64) / 255, pad)


def normalise(a: np.ndarray) -> np.ndarray:
    return (a - a.mean()) / (a.std() + 1e-9)


def build():
    # Pulp formation: soft clouds a few millimetres across, plus a finer mottle.
    clouds = band_noise(90, 420)
    mottle = band_noise(10, 40)
    # Fibre clumps (flocs): ridged small-scale noise gives the crinkled, felted blotches.
    flocs = normalise(-np.abs(band_noise(5, 18)))

    # The felt: a dense mat of faint fibres, with a sparser set of brighter strands on top
    # (the ones that catch the eye on dyed stock) and some that sit a touch darker.
    mat = normalise(fibres(42000, (5, 18), (0.8, 1.4), 0.16))
    bright = normalise(gaussian_filter(fibres(3200, (6, 20), (0.9, 1.5), 0.14), 0.7, mode="wrap"))
    dark = normalise(gaussian_filter(fibres(2400, (5, 16), (0.9, 1.4), 0.16), 0.7, mode="wrap"))

    tooth = normalise(gaussian_filter(rng.standard_normal((N, N)), 0.55, mode="wrap"))

    # Raking-light relief: fibres and tooth raise the surface; light from the top left.
    height = gaussian_filter(0.7 * mat + 0.3 * bright + 0.5 * tooth + 0.6 * flocs + 0.3 * mottle, 0.8, mode="wrap")
    gx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) / 2
    gy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) / 2
    relief = normalise(-(gx + gy))

    tone = (
        0.3 * clouds
        + 0.32 * mottle
        + 0.55 * flocs
        + 0.38 * mat
        + 0.24 * bright
        - 0.22 * dark
        + 0.45 * relief
        + 0.7 * tooth
    )
    # A scan never resolves the sheet perfectly sharp.
    tone = normalise(gaussian_filter(tone, 0.45, mode="wrap"))

    # Pale stock is a smoother, better-closed sheet: little clouding, the tooth and the
    # relief do the work. Blotches read as cheap recycled paper on white.
    fine = (
        0.1 * clouds
        + 0.1 * mottle
        + 0.2 * flocs
        + 0.3 * mat
        + 0.06 * bright
        - 0.06 * dark
        + 0.75 * relief
        + 0.55 * tooth
    )
    fine = normalise(gaussian_filter(fine, 0.6, mode="wrap"))

    # Inclusions: short dark bits of bark or dye, a few per tile, irregular rather than dots.
    pad = 24
    size = (N + 2 * pad) * SS
    img = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(img)
    for _ in range(70):
        x, y = rng.uniform(0, N + 2 * pad, 2)
        heading = rng.uniform(0, 2 * np.pi)
        points = [(x * SS, y * SS)]
        for _ in range(rng.integers(1, 3)):
            heading += rng.normal(0, 0.8)
            length = rng.uniform(0.8, 3.2)
            x += np.cos(heading) * length
            y += np.sin(heading) * length
            points.append((x * SS, y * SS))
        draw.line(points, fill=int(rng.uniform(120, 255)), width=round(rng.uniform(0.8, 1.6) * SS), joint="curve")
    flecks = np.clip(wrap_fold(np.asarray(img.resize((N + 2 * pad,) * 2, Image.BOX), dtype=np.float64) / 255, pad), 0, 1)
    return tone, fine, flecks, normalise(height)


def encode(tone: np.ndarray, flecks: np.ndarray, contrast: float):
    tone_img = np.clip(128 + tone * contrast * 255, 0, 255).astype(np.uint8)
    fleck_rgba = np.zeros((N, N, 4), np.uint8)
    fleck_rgba[..., :3] = 40
    fleck_rgba[..., 3] = np.clip(flecks * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(tone_img, "L"), Image.fromarray(fleck_rgba, "RGBA")


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "public/textures/gifts")
    out.mkdir(parents=True, exist_ok=True)
    tone, fine, flecks, height = build()
    tone_img, fleck_img = encode(tone, flecks, contrast=0.085)
    fine_img, _ = encode(fine, flecks, contrast=0.085)
    tone_img.save(out / "paper-tone.webp", quality=88, method=6)
    fine_img.save(out / "paper-fine.webp", quality=88, method=6)
    fleck_img.save(out / "paper-flecks.webp", quality=90, method=6)

    # Tangent-space normals of the sheet's relief (OpenGL convention: green points up),
    # for the WebGL card, where real light rakes across the tooth.
    gx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) / 2
    gy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) / 2
    normal = np.dstack([-gx * 1.6, gy * 1.6, np.ones_like(height)])
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    Image.fromarray(((normal * 0.5 + 0.5) * 255).astype(np.uint8), "RGB").save(
        out / "paper-normal.webp", quality=78, method=6
    )
    print("wrote", out)
