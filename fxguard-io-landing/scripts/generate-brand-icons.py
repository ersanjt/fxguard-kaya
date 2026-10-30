"""Generate FXGuard PNG/ICO assets from the semantic brand mark.

Symbol meaning:
- shield: protected company data
- conversation bubble: shared business messaging
- connected nodes: teams, branches and departments share customer context
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

    center = (point(256, size), point(254, size))
    nodes = [
        (point(208, size), point(218, size)),
        (point(304, size), point(218, size)),
        (point(256, size), point(302, size)),
    ]
    line_width = max(point(18, size), SCALE)
    for node in nodes:
        draw.line([center, node], fill="#0B7139", width=line_width)

    center_radius = point(25, size)
    draw.ellipse(
        (
            center[0] - center_radius,
            center[1] - center_radius,
            center[0] + center_radius,
            center[1] + center_radius,
        ),
        fill="#0B5E31",
    )
    node_radius = point(20, size)
    for node in nodes:
        draw.ellipse(
            (
                node[0] - node_radius,
                node[1] - node_radius,
                node[0] + node_radius,
                node[1] + node_radius,
            ),
            fill="#19B85A",
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
