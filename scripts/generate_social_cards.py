from __future__ import annotations

import html
import math
import re
import textwrap
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "assets" / "social-cards-2026-09-06"
FEED_DIR = OUT_ROOT / "facebook-posts"
STORY_DIR = OUT_ROOT / "stories"

NAVY = "#0f3a5b"
NAVY_DARK = "#08243a"
GOLD = "#c99a3e"
PALE_GOLD = "#f6d78e"
CREAM = "#fffaf0"
INK = "#0b2b45"
MUTED = "#667485"
GREEN = "#195934"
MIST = "#eef9f8"
LINE = "#efd9af"
BLUE_STAR = "#bfeefa"

GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

NUMBER_BADGE_CACHE: dict[tuple[str, int, int], Image.Image] = {}
RODOLOGIYA_PROGNOSTIKA_DESCRIPTION = (
    "Прогностика-это метод расчета\n"
    "и анализа числовых циклов который позволяет\n"
    "определить энергетический потенциал, ключевые задачи\n"
    "и вероятные тенденции в жизни человека\n"
    "на определенный период: год, месяц или день."
)


@dataclass
class Card:
    slug: str
    title: str
    eyebrow: str
    price: str | None
    lead: str
    items: list[str]
    note: str
    kind: str = "section"


DETAIL_ORDER = [
    ("02-paket", "paket.html", "Пакет 4 главных раздела"),
    ("03-programma-sudby", "programma-sudby.html", "Программа судьбы"),
    ("04-labirint-karmy", "labirint-karmy.html", "Лабиринт Кармы"),
    ("05-zdorovye", "zdorovye.html", "Здоровье"),
    ("06-sovmestimost", "sovmestimost.html", "Совместимость"),
    ("07-astrologiya-bonus", "astrologiya.html", "Астрология"),
    ("08-rodologiya", "rodologiya.html", "Родология"),
    ("09-biznes-finansy", "biznes-finansy.html", "Бизнес / Финансы"),
    ("10-professiya-kariera", "professiya-kariera.html", "Профессия / Карьера"),
    ("11-amuletostroenie", "amuletostroenie.html", "Амулетостроение"),
    ("12-taro-rasklad", "taro-rasklad.html", "Таро-расклад"),
    ("13-manticheskaya-praktika", "manticheskaya-praktika.html", "Мантическая практика"),
    ("14-regressonumerologiya", "regressonumerologiya.html", "Регрессонумерология"),
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def clean(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def extract_one(pattern: str, text: str, default: str = "") -> str:
    found = re.search(pattern, text, re.S)
    return clean(found.group(1)) if found else default


def parse_detail(slug: str, filename: str, fallback_title: str) -> Card:
    text = (ROOT / "details" / filename).read_text()
    title = extract_one(r"<h1>(.*?)</h1>", text, fallback_title)
    price = extract_one(r'<div class="price">(.*?)</div>', text, "")
    lead = extract_one(r'<p class="lead">(.*?)</p>', text, "")
    eyebrow = extract_one(r'<p class="eyebrow">(.*?)</p>', text, "Раздел")
    list_section = re.search(r'<ul class="items" id="detail-items">(.*?)</ul>', text, re.S)
    item_source = list_section.group(1) if list_section else text
    items = [
        clean(item)
        for item in re.findall(r"<li>\s*<span[^>]*>.*?</span>\s*<div>\s*<h3>(.*?)</h3>", item_source, re.S)
    ]

    if title in {"Программа судьбы", "Лабиринт Кармы", "Здоровье", "Совместимость"}:
        note = "Этот раздел входит в пакет 4 главных раздела."
    elif title == "Астрология":
        note = "Отдельно стоит €50, в пакете идёт бонусом."
    elif title.startswith("Пакет"):
        note = "Пакет: 4 главных раздела + бонус Астрология."
    else:
        note = "Можно заказать отдельным разделом."

    return Card(
        slug=slug,
        title=title,
        eyebrow=eyebrow,
        price=price or None,
        lead=lead,
        items=items,
        note=note,
    )


def parse_visual_materials() -> Card:
    text = (ROOT / "index.html").read_text()
    js_section = re.search(r"const visualMaterials = \[(.*?)\];", text, re.S)
    if js_section:
        labels = [
            clean(item)
            for item in re.findall(r'label:\s*\{\s*ru:\s*"([^"]+)"', js_section.group(1), re.S)
        ]
    else:
        section = re.search(
            r"<h2>Визуальные материалы</h2>.*?"
            r'<div class="gallery visual-gallery">(.*?)</div>\s*</div>\s*</section>',
            text,
            re.S,
        )
        labels = [clean(item) for item in re.findall(r"<span>(.*?)</span>", section.group(1), re.S)] if section else []
    return Card(
        slug="15-vizualnye-materialy",
        title="Визуальные материалы",
        eyebrow="Раздел каталога",
        price=None,
        lead="Схемы, графики, мандалы и образные материалы из разделов каталога.",
        items=labels,
        note="12 визуальных материалов собраны в одном блоке.",
        kind="visuals",
    )


def build_cards() -> list[Card]:
    main = Card(
        slug="01-glavnaya-kartochka",
        title="Фелиция",
        eyebrow="Каталог консультаций",
        price=None,
        lead="Нумерология, Таро, астрология, руны, родовые программы, совместимость, бизнес-направления и авторские практики.",
        items=["1,5-2 часа", "5-15 страниц", "Аудио / видео", "Поддержка 30 дней"],
        note="12 сфер консультаций: личность, судьба, род, карма, профессия, отношения и жизненные циклы.",
        kind="main",
    )
    cards = [main]
    cards.extend(parse_detail(*entry) for entry in DETAIL_ORDER)
    cards.append(parse_visual_materials())
    return cards


def gradient_background(size: tuple[int, int]) -> Image.Image:
    width, height = size
    scale = 16
    small_w = max(1, width // scale)
    small_h = max(1, height // scale)
    img = Image.new("RGB", (small_w, small_h), CREAM)
    px = img.load()
    for y in range(small_h):
        for x in range(small_w):
            t = y / max(small_h - 1, 1)
            side = abs(x - small_w / 2) / (small_w / 2)
            blue = max(0, (t - 0.08) * 60) + side * 8
            warm = max(0, 1 - t) * 7
            r = int(255 - blue * 0.9)
            g = int(250 - blue * 0.15 - warm * 0.2)
            b = int(240 + blue * 0.95 - warm)
            px[x, y] = (max(235, min(255, r)), max(238, min(255, g)), max(236, min(255, b)))
    return img.resize(size, Image.Resampling.BICUBIC)


def draw_star(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, fill: str) -> None:
    pts = []
    for i in range(8):
        angle = -math.pi / 2 + i * math.pi / 4
        rr = r if i % 2 == 0 else r * 0.28
        pts.append((cx + math.cos(angle) * rr, cy + math.sin(angle) * rr))
    draw.polygon(pts, fill=fill)


def text_width(draw: ImageDraw.ImageDraw, text: str, ft: ImageFont.FreeTypeFont) -> int:
    if not text:
        return 0
    box = draw.textbbox((0, 0), text, font=ft)
    return box[2] - box[0]


def text_height(draw: ImageDraw.ImageDraw, text: str, ft: ImageFont.FreeTypeFont) -> int:
    box = draw.textbbox((0, 0), text or "A", font=ft)
    return box[3] - box[1]


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, ft: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for raw in text.split("\n"):
        words = raw.split()
        line = ""
        for word in words:
            candidate = word if not line else f"{line} {word}"
            if text_width(draw, candidate, ft) <= max_width:
                line = candidate
            else:
                if line:
                    lines.append(line)
                if text_width(draw, word, ft) > max_width:
                    chunks = textwrap.wrap(word, width=max(5, int(max_width / max(ft.size * 0.58, 1))))
                    lines.extend(chunks[:-1])
                    line = chunks[-1] if chunks else word
                else:
                    line = word
        if line:
            lines.append(line)
    return lines


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    ft: ImageFont.FreeTypeFont,
    fill: str,
    spacing: int = 8,
) -> None:
    x1, y1, x2, y2 = box
    lines = wrap_lines(draw, text, ft, x2 - x1)
    heights = [text_height(draw, line, ft) for line in lines]
    total = sum(heights) + spacing * max(0, len(lines) - 1)
    y = y1 + ((y2 - y1) - total) / 2
    for line, h in zip(lines, heights):
        w = text_width(draw, line, ft)
        draw.text((x1 + ((x2 - x1) - w) / 2, y), line, font=ft, fill=fill)
        y += h + spacing


def fit_text_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_path: str,
    max_width: int,
    max_height: int,
    start: int,
    min_size: int,
    spacing: int = 8,
) -> ImageFont.FreeTypeFont:
    for size in range(start, min_size - 1, -2):
        ft = font(font_path, size)
        lines = wrap_lines(draw, text, ft, max_width)
        height = sum(text_height(draw, line, ft) for line in lines) + spacing * max(0, len(lines) - 1)
        if height <= max_height:
            return ft
    return font(font_path, min_size)


def draw_pill(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    ft: ImageFont.FreeTypeFont,
    fill: str = "#fffcf5",
    outline: str = LINE,
    text_fill: str = INK,
    radius: int = 18,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2)
    draw_centered_text(draw, (box[0] + 18, box[1] + 4, box[2] - 18, box[3] - 4), text, ft, text_fill, spacing=2)


def make_number_badge(value: str, diameter: int, border: int = 2) -> Image.Image:
    key = (value, diameter, border)
    if key in NUMBER_BADGE_CACHE:
        return NUMBER_BADGE_CACHE[key].copy()

    scale = 4
    size = diameter * scale
    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge)
    inset = border * scale // 2
    bd.ellipse(
        (inset, inset, size - inset - 1, size - inset - 1),
        fill="#fffdf8",
        outline=LINE,
        width=border * scale,
    )

    ft = font(ARIAL_BOLD, max(12, int(diameter * 0.43)) * scale)
    bbox = bd.textbbox((0, 0), value, font=ft)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    bd.text((size / 2 - tw / 2 - bbox[0], size / 2 - th / 2 - bbox[1]), value, font=ft, fill=GOLD)

    badge = badge.resize((diameter, diameter), Image.Resampling.LANCZOS)
    NUMBER_BADGE_CACHE[key] = badge
    return badge.copy()


def paste_logo(img: Image.Image, cx: int, cy: int, radius: int) -> None:
    draw = ImageDraw.Draw(img)
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((cx - radius - 10, cy - radius - 2, cx + radius + 10, cy + radius + 18), fill=(0, 0, 0, 38))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(shadow)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill="#fffdf7", outline=GOLD, width=5)
    logo_path = ROOT / "assets" / "elar-logo-reference.png"
    logo = Image.open(logo_path).convert("RGBA")
    logo.thumbnail((radius * 1.35, radius * 1.35), Image.LANCZOS)
    img.alpha_composite(logo, (cx - logo.width // 2, cy - logo.height // 2))


def draw_header(img: Image.Image, header_h: int) -> None:
    draw = ImageDraw.Draw(img)
    w = img.width
    draw.rectangle((0, 0, w, header_h), fill=NAVY)
    for x in range(w):
        shade = int(18 * (x / max(w - 1, 1)))
        draw.line((x, 0, x, header_h), fill=(12, 48 + shade, 76 + shade))
    draw.line((0, header_h - 3, w, header_h - 3), fill=GOLD, width=3)

    brand_ft = font(GEORGIA_BOLD, 58 if w == 1080 else 60)
    code_ft = font(GEORGIA, 38 if w == 1080 else 40)
    meta_ft = font(ARIAL_BOLD, 24 if w == 1080 else 28)

    draw.text((76, 82), "Фелиция", font=brand_ft, fill=PALE_GOLD)
    draw.text((78, 148), "14 / 41", font=code_ft, fill=PALE_GOLD)

    meta = ["Нумерология", "Таро", "Астрология", "Руны"]
    y = 74
    for line in meta:
        tw = text_width(draw, line, meta_ft)
        draw.text((w - 76 - tw, y), line, font=meta_ft, fill="#eef2f7")
        y += 34 if w == 1080 else 38


def draw_eyebrow(draw: ImageDraw.ImageDraw, y: int, text: str, width: int) -> None:
    text = text.upper()
    ft = font(ARIAL_BOLD, 22)
    tw = text_width(draw, text, ft)
    cx = width // 2
    draw.line((cx - tw // 2 - 110, y + 13, cx - tw // 2 - 28, y + 13), fill=GOLD, width=2)
    draw.line((cx + tw // 2 + 28, y + 13, cx + tw // 2 + 110, y + 13), fill=GOLD, width=2)
    draw.text((cx - tw // 2, y), text, font=ft, fill=GOLD)


def draw_price_badge(draw: ImageDraw.ImageDraw, cx: int, cy: int, text: str, radius: int) -> None:
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=GREEN, outline=GOLD, width=5)
    size = 42 if radius <= 56 else 50
    while size >= 34:
        ft = font(GEORGIA_BOLD, size)
        bbox = draw.textbbox((0, 0), text, font=ft)
        if bbox[2] - bbox[0] <= radius * 2 - 20 and bbox[3] - bbox[1] <= radius * 2 - 22:
            break
        size -= 2
    ft = font(GEORGIA_BOLD, size)
    bbox = draw.textbbox((0, 0), text, font=ft)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1]), text, font=ft, fill=PALE_GOLD)


def draw_number_badge(draw: ImageDraw.ImageDraw, cx: int, cy: int, value: str, label: str, radius: int) -> None:
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=GREEN, outline=GOLD, width=5)
    size = int(radius * 1.12) if radius > 85 else int(radius * 1.18)
    min_size = int(radius * 0.86)
    while size >= min_size:
        ft = font(GEORGIA_BOLD, size)
        bbox = draw.textbbox((0, 0), value, font=ft)
        if bbox[2] - bbox[0] <= radius * 2 - 34 and bbox[3] - bbox[1] <= radius * 1.08:
            break
        size -= 2
    ft = font(GEORGIA_BOLD, size)
    bbox = draw.textbbox((0, 0), value, font=ft)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    number_center_y = cy - int(radius * 0.02)
    draw.text((cx - tw / 2 - bbox[0], number_center_y - th / 2 - bbox[1]), value, font=ft, fill=PALE_GOLD)
    pill_w = 120 if radius > 85 else 146
    draw.rounded_rectangle((cx - pill_w // 2, cy + radius - 28, cx + pill_w // 2, cy + radius + 6), radius=16, fill=PALE_GOLD, outline=GOLD, width=1)
    lft = font(ARIAL_BOLD, 14 if radius > 85 else 16)
    draw_centered_text(draw, (cx - pill_w // 2, cy + radius - 27, cx + pill_w // 2, cy + radius + 5), label.upper(), lft, INK, spacing=0)


def column_layout(count: int, max_cols: int) -> int:
    if count <= 11:
        return 1
    return min(max_cols, 2)


def draw_item_list(
    draw: ImageDraw.ImageDraw,
    items: list[str],
    box: tuple[int, int, int, int],
    max_cols: int,
    start_size: int,
    min_size: int,
) -> None:
    x1, y1, x2, y2 = box
    cols = column_layout(len(items), max_cols)
    gap_x = 18
    gap_y = 8
    rows = math.ceil(len(items) / cols)
    col_w = int((x2 - x1 - gap_x * (cols - 1)) / cols)
    row_h = int((y2 - y1 - gap_y * (rows - 1)) / rows)

    size = start_size
    while size >= min_size:
        ft = font(ARIAL_BOLD, size)
        ok = True
        for item in items:
            lines = wrap_lines(draw, item, ft, col_w - 44)
            total_h = sum(text_height(draw, line, ft) for line in lines) + 2 * max(0, len(lines) - 1)
            if total_h > row_h - 8:
                ok = False
                break
        if ok:
            break
        size -= 1
    ft = font(ARIAL_BOLD, max(min_size, size))

    for idx, item in enumerate(items):
        col = idx % cols
        row = idx // cols
        x = x1 + col * (col_w + gap_x)
        y = y1 + row * (row_h + gap_y)
        draw_pill(draw, (x, y, x + col_w, y + row_h), item, ft, fill="#fffdf8", outline=LINE, text_fill=INK, radius=18)


def readable_rows(items: list[str], cols: int) -> list[list[str | None]]:
    rows = math.ceil(len(items) / cols)
    result: list[list[str | None]] = []
    for row in range(rows):
        result.append([])
        for col in range(cols):
            idx = row * cols + col
            result[-1].append(items[idx] if idx < len(items) else None)
    return result


def item_descriptions_for(card: Card) -> dict[str, str] | None:
    if card.slug == "08-rodologiya":
        return {"Прогностика": RODOLOGIYA_PROGNOSTIKA_DESCRIPTION}
    return None


def description_font(title_ft: ImageFont.FreeTypeFont) -> ImageFont.FreeTypeFont:
    return font(ARIAL_BOLD, title_ft.size)


def lines_height(draw: ImageDraw.ImageDraw, lines: list[str], ft: ImageFont.FreeTypeFont, spacing: int) -> int:
    return sum(text_height(draw, line, ft) for line in lines) + spacing * max(0, len(lines) - 1)


def manual_lines_fit(draw: ImageDraw.ImageDraw, lines: list[str], ft: ImageFont.FreeTypeFont, max_width: int) -> bool:
    return all(text_width(draw, line, ft) <= max_width for line in lines)


def measure_readable_list(
    draw: ImageDraw.ImageDraw,
    rows: list[list[str | None]],
    ft: ImageFont.FreeTypeFont,
    col_w: int,
    gap_y: int,
    descriptions: dict[str, str] | None = None,
) -> tuple[int, list[tuple[int, list[tuple[list[str], list[str], ImageFont.FreeTypeFont | None]]]]]:
    number_d = max(36, int(ft.size * 1.55))
    text_w = col_w - number_d - 30
    measured: list[tuple[int, list[tuple[list[str], list[str], ImageFont.FreeTypeFont | None]]]] = []
    total = 0
    for row in rows:
        row_lines: list[tuple[list[str], list[str], ImageFont.FreeTypeFont | None]] = []
        row_text_h = 0
        for item in row:
            title = item or ""
            preserve_manual_lines = bool(title and descriptions and title in descriptions)
            if title and descriptions and title in descriptions:
                title = descriptions[title]
            if preserve_manual_lines:
                title_lines = title.split("\n")
                if not manual_lines_fit(draw, title_lines, ft, text_w):
                    text_h = 100000
                    row_text_h = max(row_text_h, text_h)
                    row_lines.append((title_lines, [], None))
                    continue
            else:
                title_lines = wrap_lines(draw, title, ft, text_w)
            text_h = lines_height(draw, title_lines, ft, 4)
            desc_lines: list[str] = []
            desc_ft: ImageFont.FreeTypeFont | None = None
            row_text_h = max(row_text_h, text_h)
            row_lines.append((title_lines, desc_lines, desc_ft))
        row_h = max(number_d + 8, row_text_h + 18)
        measured.append((row_h, row_lines))
        total += row_h
    total += gap_y * max(0, len(rows) - 1)
    return total, measured


def draw_readable_item_list(
    img: Image.Image,
    draw: ImageDraw.ImageDraw,
    items: list[str],
    box: tuple[int, int, int, int],
    start_size: int,
    min_size: int,
    max_cols: int = 2,
    start_index: int = 1,
    force_cols: int | None = None,
    descriptions: dict[str, str] | None = None,
) -> None:
    x1, y1, x2, y2 = box
    if force_cols:
        cols = max(1, min(max_cols, force_cols))
    elif len(items) <= 6:
        cols = 1
    elif len(items) > 16 and max_cols >= 3:
        cols = 3
    else:
        cols = 2
    gap_x = 20 if cols == 3 else 26
    gap_y = 9 if y2 - y1 < 650 else 12
    col_w = int((x2 - x1 - gap_x * (cols - 1)) / cols)
    rows = readable_rows(items, cols)

    best_ft = font(ARIAL_BOLD, min_size)
    best_total, best_measured = measure_readable_list(draw, rows, best_ft, col_w, gap_y, descriptions)
    for size in range(start_size, min_size - 1, -1):
        ft = font(ARIAL_BOLD, size)
        total, measured = measure_readable_list(draw, rows, ft, col_w, gap_y, descriptions)
        if total <= y2 - y1:
            best_ft, best_total, best_measured = ft, total, measured
            break

    number_d = max(36, int(best_ft.size * 1.55))
    text_w = col_w - number_d - 30
    y = y1 + max(0, (y2 - y1 - best_total) // 2)
    counter = start_index
    for row, (row_h, row_lines) in zip(rows, best_measured):
        for col, item in enumerate(row):
            if item is None:
                continue
            x = x1 + col * (col_w + gap_x)
            draw.rounded_rectangle((x, y, x + col_w, y + row_h), radius=17, fill="#fffdf8", outline=LINE, width=2)
            badge_cx = x + 18 + number_d // 2
            badge_cy = y + row_h // 2
            badge = make_number_badge(f"{counter:02d}", number_d)
            img.alpha_composite(badge, (badge_cx - number_d // 2, badge_cy - number_d // 2))
            title_lines, desc_lines, desc_ft = row_lines[col]
            text_h = lines_height(draw, title_lines, best_ft, 4)
            if desc_lines and desc_ft:
                text_h += lines_height(draw, desc_lines, desc_ft, 4)
            ty = y + (row_h - text_h) / 2
            tx = x + number_d + 30
            for line in title_lines:
                bbox = draw.textbbox((0, 0), line, font=best_ft)
                line_h = bbox[3] - bbox[1]
                draw.text((tx, ty - bbox[1]), line, font=best_ft, fill=INK)
                ty += line_h + 4
            if desc_lines and desc_ft:
                for line in desc_lines:
                    bbox = draw.textbbox((0, 0), line, font=desc_ft)
                    line_h = bbox[3] - bbox[1]
                    draw.text((tx, ty - bbox[1]), line, font=desc_ft, fill=INK)
                    ty += line_h + 4
            counter += 1
        y += row_h + gap_y


def draw_package_list_feed(img: Image.Image, draw: ImageDraw.ImageDraw, card: Card) -> None:
    primary = card.items[:4]
    bonus = card.items[4:5]
    details = card.items[5:9]
    price = card.items[9:10]

    draw_composition_heading(draw, 624, "СОСТАВ ПАКЕТА", 1080, size=23)
    draw_readable_item_list(
        img,
        draw,
        primary,
        (88, 660, 992, 778),
        start_size=29,
        min_size=21,
        max_cols=2,
        force_cols=2,
    )
    draw_readable_item_list(
        img,
        draw,
        bonus,
        (190, 788, 890, 846),
        start_size=29,
        min_size=21,
        max_cols=1,
        start_index=5,
    )

    draw_composition_heading(draw, 870, "ФОРМАТ И МАТЕРИАЛЫ", 1080, size=22)
    draw_readable_item_list(
        img,
        draw,
        details,
        (88, 906, 992, 1020),
        start_size=28,
        min_size=18,
        max_cols=2,
        start_index=6,
        force_cols=2,
    )
    draw_readable_item_list(
        img,
        draw,
        price,
        (120, 1032, 960, 1108),
        start_size=27,
        min_size=18,
        max_cols=1,
        start_index=10,
    )


def draw_package_list_story(img: Image.Image, draw: ImageDraw.ImageDraw, card: Card) -> None:
    primary = card.items[:4]
    bonus = card.items[4:5]
    details = card.items[5:9]
    price = card.items[9:10]

    draw_composition_heading(draw, 765, "СОСТАВ ПАКЕТА", 1080, size=28)
    draw_readable_item_list(
        img,
        draw,
        primary,
        (78, 810, 1002, 968),
        start_size=36,
        min_size=25,
        max_cols=2,
        force_cols=2,
    )
    draw_readable_item_list(
        img,
        draw,
        bonus,
        (178, 980, 902, 1052),
        start_size=36,
        min_size=25,
        max_cols=1,
        start_index=5,
    )

    draw_composition_heading(draw, 1086, "ФОРМАТ И МАТЕРИАЛЫ", 1080, size=27)
    draw_readable_item_list(
        img,
        draw,
        details,
        (78, 1130, 1002, 1294),
        start_size=34,
        min_size=22,
        max_cols=2,
        start_index=6,
        force_cols=2,
    )
    draw_readable_item_list(
        img,
        draw,
        price,
        (108, 1310, 972, 1430),
        start_size=36,
        min_size=24,
        max_cols=1,
        start_index=10,
    )


def draw_rodologiya_list_feed(img: Image.Image, draw: ImageDraw.ImageDraw, card: Card) -> None:
    draw_readable_item_list(
        img,
        draw,
        card.items[:8],
        (88, 618, 992, 820),
        start_size=23,
        min_size=19,
        max_cols=2,
        force_cols=2,
    )
    draw_readable_item_list(
        img,
        draw,
        card.items[8:10],
        (88, 834, 992, 900),
        start_size=22,
        min_size=18,
        max_cols=2,
        start_index=9,
        force_cols=2,
    )
    draw_readable_item_list(
        img,
        draw,
        ["Прогностика"],
        (88, 914, 992, 1055),
        start_size=22,
        min_size=18,
        max_cols=1,
        start_index=11,
        descriptions=item_descriptions_for(card),
    )
    draw_readable_item_list(
        img,
        draw,
        card.items[11:12],
        (88, 1068, 992, 1162),
        start_size=22,
        min_size=18,
        max_cols=1,
        start_index=12,
    )


def draw_rodologiya_list_story(img: Image.Image, draw: ImageDraw.ImageDraw, card: Card) -> None:
    draw_readable_item_list(
        img,
        draw,
        card.items[:8],
        (78, 770, 1002, 1064),
        start_size=31,
        min_size=24,
        max_cols=2,
        force_cols=2,
    )
    draw_readable_item_list(
        img,
        draw,
        card.items[8:10],
        (78, 1082, 1002, 1168),
        start_size=29,
        min_size=22,
        max_cols=2,
        start_index=9,
        force_cols=2,
    )
    draw_readable_item_list(
        img,
        draw,
        ["Прогностика"],
        (78, 1190, 1002, 1374),
        start_size=28,
        min_size=22,
        max_cols=1,
        start_index=11,
        descriptions=item_descriptions_for(card),
    )
    draw_readable_item_list(
        img,
        draw,
        card.items[11:12],
        (78, 1392, 1002, 1544),
        start_size=29,
        min_size=22,
        max_cols=1,
        start_index=12,
    )


def draw_stats(draw: ImageDraw.ImageDraw, items: list[str], box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    gap = 18
    col_w = (x2 - x1 - gap) // 2
    row_h = (y2 - y1 - gap) // 2
    ft = font(ARIAL_BOLD, 27)
    for idx, item in enumerate(items[:4]):
        col = idx % 2
        row = idx // 2
        x = x1 + col * (col_w + gap)
        y = y1 + row * (row_h + gap)
        draw_pill(draw, (x, y, x + col_w, y + row_h), item, ft, radius=15)


def draw_cta(draw: ImageDraw.ImageDraw, y: int, width: int, label: str = "ЗАПИСАТЬСЯ") -> None:
    cta_w = min(590, width - 260)
    x = (width - cta_w) // 2
    draw.rounded_rectangle((x, y, x + cta_w, y + 66), radius=32, fill=GREEN, outline=GOLD, width=3)
    ft = font(ARIAL_BOLD, 28)
    draw_centered_text(draw, (x, y + 4, x + cta_w, y + 62), label, ft, "#fffaf3", spacing=0)


def decorate(draw: ImageDraw.ImageDraw, width: int, height: int) -> None:
    draw_star(draw, 142, 468 if height < 1500 else 590, 24, "#ead49b")
    draw_star(draw, width - 140, 620 if height < 1500 else 780, 34, BLUE_STAR)
    draw.arc((width - 190, 230, width + 120, 400), 198, 350, fill="#dbe9d7", width=3)
    draw.arc((-80, height - 170, 220, height + 40), 250, 100, fill="#dbe9d7", width=3)
    draw.line((68, height - 116, 220, height - 245), fill="#eadcad", width=2)


def composition_heading(card: Card) -> str:
    if card.kind == "visuals":
        return "ЧТО ВХОДИТ В РАЗДЕЛ"
    if card.title.startswith("Пакет") or "пакет" in card.eyebrow.lower():
        return "ЧТО ВХОДИТ В ПАКЕТ"
    return "ЧТО ВХОДИТ В РАЗДЕЛ"


def draw_composition_heading(draw: ImageDraw.ImageDraw, y: int, text: str, width: int, size: int = 22) -> None:
    ft = font(ARIAL_BOLD, size)
    tw = text_width(draw, text, ft)
    draw.text(((width - tw) / 2, y), text, font=ft, fill=GOLD)


def draw_feed_card(card: Card, index: int) -> Image.Image:
    img = gradient_background((1080, 1350)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    draw_header(img, 220)
    paste_logo(img, 540, 220, 66)
    decorate(draw, 1080, 1350)

    if card.kind == "main":
        draw_eyebrow(draw, 352, "Каталог", 1080)
        title_ft = font(GEORGIA_BOLD, 58)
        draw_centered_text(draw, (180, 402, 900, 482), card.title, title_ft, NAVY)
        draw_number_badge(draw, 540, 610, "12", "сфер", 108)
        lead_ft = fit_text_font(draw, card.lead, ARIAL, 760, 96, 29, 22, spacing=6)
        draw_centered_text(draw, (160, 750, 920, 852), card.lead, lead_ft, INK, spacing=6)
        draw_stats(draw, card.items, (145, 895, 935, 1086))
        draw_cta(draw, 1126, 1080)
        note_ft = font(ARIAL, 18)
        draw_centered_text(draw, (92, 1222, 988, 1288), card.note, note_ft, MUTED, spacing=4)
        return img.convert("RGB")

    draw_eyebrow(draw, 326, card.eyebrow, 1080)
    title_ft = fit_text_font(draw, card.title, GEORGIA_BOLD, 800, 84, 48, 34, spacing=4)
    draw_centered_text(draw, (140, 365, 940, 450), card.title, title_ft, NAVY, spacing=4)
    if card.slug == "02-paket":
        draw_number_badge(draw, 540, 505, "5", "разделов", 60)
    elif card.price:
        draw_price_badge(draw, 540, 505, card.price, 55)
    else:
        draw_number_badge(draw, 540, 505, str(len(card.items)), "материалов", 60)
    if card.slug == "02-paket":
        draw_package_list_feed(img, draw, card)
        draw_cta(draw, 1162, 1080)
        note_ft = font(ARIAL, 18)
        draw_centered_text(draw, (120, 1248, 960, 1300), card.note, note_ft, MUTED, spacing=4)
        return img.convert("RGB")
    draw_composition_heading(draw, 580, composition_heading(card), 1080, size=23)
    if card.slug == "08-rodologiya":
        draw_rodologiya_list_feed(img, draw, card)
        draw_cta(draw, 1182, 1080)
        note_ft = font(ARIAL, 18)
        draw_centered_text(draw, (120, 1268, 960, 1318), card.note, note_ft, MUTED, spacing=4)
        return img.convert("RGB")
    draw_readable_item_list(
        img,
        draw,
        card.items,
        (88, 625, 992, 1138),
        start_size=26,
        min_size=16,
        max_cols=3,
        descriptions=item_descriptions_for(card),
    )
    draw_cta(draw, 1182, 1080)
    note_ft = font(ARIAL, 18)
    draw_centered_text(draw, (120, 1268, 960, 1318), card.note, note_ft, MUTED, spacing=4)
    return img.convert("RGB")


def draw_story_card(card: Card, index: int) -> Image.Image:
    img = gradient_background((1080, 1920)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    draw_header(img, 255)
    paste_logo(img, 540, 255, 72)
    decorate(draw, 1080, 1920)

    if card.kind == "main":
        draw_eyebrow(draw, 420, "Каталог", 1080)
        title_ft = font(GEORGIA_BOLD, 68)
        draw_centered_text(draw, (140, 470, 940, 560), card.title, title_ft, NAVY)
        draw_number_badge(draw, 540, 720, "12", "сфер", 126)
        lead_ft = fit_text_font(draw, card.lead, ARIAL, 800, 130, 34, 24, spacing=8)
        draw_centered_text(draw, (140, 890, 940, 1038), card.lead, lead_ft, INK, spacing=8)
        draw_stats(draw, card.items, (130, 1100, 950, 1360))
        draw_cta(draw, 1498, 1080)
        note_ft = font(ARIAL, 24)
        draw_centered_text(draw, (100, 1620, 980, 1725), card.note, note_ft, MUTED, spacing=6)
        return img.convert("RGB")

    draw_eyebrow(draw, 392, card.eyebrow, 1080)
    title_ft = fit_text_font(draw, card.title, GEORGIA_BOLD, 840, 108, 58, 38, spacing=6)
    draw_centered_text(draw, (120, 445, 960, 555), card.title, title_ft, NAVY, spacing=6)
    if card.slug == "02-paket":
        draw_number_badge(draw, 540, 620, "5", "разделов", 66)
    elif card.price:
        draw_price_badge(draw, 540, 620, card.price, 62)
    else:
        draw_number_badge(draw, 540, 620, str(len(card.items)), "материалов", 66)
    if card.slug == "02-paket":
        draw_package_list_story(img, draw, card)
        draw_cta(draw, 1532, 1080)
        note_ft = font(ARIAL, 23)
        draw_centered_text(draw, (110, 1640, 970, 1735), card.note, note_ft, MUTED, spacing=6)
        return img.convert("RGB")
    draw_composition_heading(draw, 712, composition_heading(card), 1080, size=28)
    if card.slug == "08-rodologiya":
        draw_rodologiya_list_story(img, draw, card)
        draw_cta(draw, 1608, 1080)
        note_ft = font(ARIAL, 23)
        draw_centered_text(draw, (110, 1710, 970, 1805), card.note, note_ft, MUTED, spacing=6)
        return img.convert("RGB")
    draw_readable_item_list(
        img,
        draw,
        card.items,
        (78, 770, 1002, 1538),
        start_size=33,
        min_size=21,
        max_cols=2,
        descriptions=item_descriptions_for(card),
    )
    draw_cta(draw, 1608, 1080)
    note_ft = font(ARIAL, 23)
    draw_centered_text(draw, (110, 1710, 970, 1805), card.note, note_ft, MUTED, spacing=6)
    return img.convert("RGB")


def save_contact_sheet(paths: list[Path], dest: Path, thumb_size: tuple[int, int]) -> None:
    thumbs = []
    for path in paths:
        img = Image.open(path).convert("RGB")
        img.thumbnail(thumb_size, Image.LANCZOS)
        canvas = Image.new("RGB", thumb_size, "white")
        canvas.paste(img, ((thumb_size[0] - img.width) // 2, (thumb_size[1] - img.height) // 2))
        thumbs.append(canvas)
    cols = 5
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * thumb_size[0], rows * thumb_size[1]), "#f5f5f5")
    for i, thumb in enumerate(thumbs):
        x = (i % cols) * thumb_size[0]
        y = (i // cols) * thumb_size[1]
        sheet.paste(thumb, (x, y))
    sheet.save(dest)


def main() -> None:
    FEED_DIR.mkdir(parents=True, exist_ok=True)
    STORY_DIR.mkdir(parents=True, exist_ok=True)
    cards = build_cards()
    feed_paths = []
    story_paths = []

    for idx, card in enumerate(cards, 1):
        feed_path = FEED_DIR / f"{card.slug}.png"
        story_path = STORY_DIR / f"{card.slug}-story.png"
        draw_feed_card(card, idx).save(feed_path, optimize=True)
        draw_story_card(card, idx).save(story_path, optimize=True)
        feed_paths.append(feed_path)
        story_paths.append(story_path)

    save_contact_sheet(feed_paths, OUT_ROOT / "preview-facebook-posts.png", (216, 270))
    save_contact_sheet(story_paths, OUT_ROOT / "preview-stories.png", (135, 240))

    index_lines = [
        "# Социальные карточки Фелиция",
        "",
        "Источник: текущие файлы сайта `index.html` и `details/*.html`.",
        "",
        "## Facebook posts",
    ]
    index_lines.extend(f"- `facebook-posts/{path.name}`" for path in feed_paths)
    index_lines.extend(["", "## Stories"])
    index_lines.extend(f"- `stories/{path.name}`" for path in story_paths)
    (OUT_ROOT / "INDEX.md").write_text("\n".join(index_lines) + "\n")

    print(f"cards={len(cards)}")
    print(f"feed={len(feed_paths)} {FEED_DIR}")
    print(f"stories={len(story_paths)} {STORY_DIR}")
    print(f"preview_feed={OUT_ROOT / 'preview-facebook-posts.png'}")
    print(f"preview_stories={OUT_ROOT / 'preview-stories.png'}")


if __name__ == "__main__":
    main()
