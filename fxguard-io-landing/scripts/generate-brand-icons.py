"""Generate FXGuard PNG/ICO assets from the semantic brand mark.

Symbol meaning:
- shield: protected company data
- conversation bubble: shared business messaging
- opposing arrows: two-way foreign-exchange quotes
"""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
SCALE = 4


def point(value: float, size: int) -> int:
    return round(value * size * SCALE / 512)


def draw_mark(size: int) -> Image.Image:
    canvas = size * SCALE
    image = Image.new("RGBA", (canvas, canvas), "#06100A")
    draw = ImageDraw.Draw(image)

    radius = point(126, size)
    draw.rounded_rectangle((0, 0, canvas - 1, canvas - 1), radius=radius, fill="#06100A")

    shield_points = [
        (point(256, size), point(50, size)),
        (point(422, size), point(116, size)),
        (point(422, size), point(246, size)),
        (point(401, size), point(326, size)),
        (point(345, size), point(403, size)),
        (point(256, size), point(462, size)),
        (point(167, size), point(403, size)),
        (point(111, size), point(326, size)),
        (point(90, size), point(246, size)),
        (point(90, size), point(116, size)),
    ]
    shield_mask = Image.new("L", (canvas, canvas), 0)
    ImageDraw.Draw(shield_mask).polygon(shield_points, fill=255)

    gradient = Image.new("RGBA", (canvas, canvas))
    pixels = gradient.load()
    top = (168, 247, 192)
    bottom = (14, 163, 74)
    for y in range(canvas):
        ratio = y / max(canvas - 1, 1)
        color = tuple(round(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3)) + (255,)
        for x in range(canvas):
            pixels[x, y] = color
    image.alpha_composite(Image.composite(gradient, Image.new("RGBA", image.size), shield_mask))
    draw = ImageDraw.Draw(image)

    inner_shield = [
        (point(256, size), point(84, size)),
        (point(386, size), point(136, size)),
        (point(386, size), point(238, size)),
        (point(368, size), point(304, size)),
        (point(321, size), point(370, size)),
        (point(256, size), point(416, size)),
        (point(191, size), point(370, size)),
        (point(144, size), point(304, size)),
        (point(126, size), point(238, size)),
        (point(126, size), point(136, size)),
    ]
    draw.polygon(inner_shield, fill="#07110B")

    bubble_box = (
        point(146, size),
        point(164, size),
        point(372, size),
        point(328, size),
    )
    draw.rounded_rectangle(bubble_box, radius=point(36, size), fill="#F5FFF8")
    draw.polygon(
        [
            (point(211, size), point(309, size)),
            (point(195, size), point(370, size)),
            (point(275, size), point(313, size)),
        ],
        fill="#F5FFF8",
    )

    width = max(point(22, size), SCALE)
    arrow = max(point(26, size), SCALE)
    line_kwargs = {"width": width, "joint": "curve"}

    draw.line(
        [(point(193, size), point(216, size)), (point(318, size), point(216, size))],
        fill="#0B5E31",
        **line_kwargs,
    )
    draw.line(
        [
            (point(291, size), point(190, size)),
            (point(322, size), point(216, size)),
            (point(291, size), point(242, size)),
        ],
        fill="#0B5E31",
        **line_kwargs,
    )
    draw.line(
        [(point(319, size), point(278, size)), (point(194, size), point(278, size))],
        fill="#19B85A",
        **line_kwargs,
    )
    draw.line(
        [
            (point(221, size), point(252, size)),
            (point(190, size), point(278, size)),
            (point(221, size), point(304, size)),
        ],
        fill="#19B85A",
        **line_kwargs,
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def save_png(relative_path: str, size: int) -> None:
    path = ROOT / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    draw_mark(size).save(path, "PNG", optimize=True)


def main() -> None:
    outputs = {
        "favicon.png": 512,
        "favicon-16.png": 16,
        "favicon-32.png": 32,
        "apple-touch-icon.png": 180,
        "icons/icon-192.png": 192,
        "icons/icon-512.png": 512,
        "images/logo-512.png": 512,
    }
    for relative_path, size in outputs.items():
        save_png(relative_path, size)

    ico_sizes = (16, 32, 48, 64, 128, 256)
    draw_mark(256).save(
        ROOT / "favicon.ico",
        format="ICO",
        sizes=[(size, size) for size in ico_sizes],
    )
    print(f"Generated {len(outputs)} PNG assets and favicon.ico")


if __name__ == "__main__":
    main()
