from pathlib import Path
import sys
from PIL import Image, ImageOps, ImageDraw

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"P:\MeetPlanning\rendered_word")
pages = sorted(root.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
out = root / "contacts"
out.mkdir(exist_ok=True)
thumb_w = 520
for batch_i in range(0, len(pages), 4):
    batch = pages[batch_i:batch_i+4]
    thumbs = []
    for p in batch:
        im = Image.open(p).convert("RGB")
        h = round(im.height * thumb_w / im.width)
        im = im.resize((thumb_w, h))
        canvas = Image.new("RGB", (thumb_w + 20, h + 50), "#dddddd")
        canvas.paste(im, (10, 35))
        ImageDraw.Draw(canvas).text((10, 8), p.stem, fill="black")
        thumbs.append(canvas)
    max_h = max(i.height for i in thumbs)
    sheet = Image.new("RGB", (sum(i.width for i in thumbs), max_h), "white")
    x = 0
    for im in thumbs:
        sheet.paste(im, (x, 0))
        x += im.width
    sheet.save(out / f"contact-{batch_i//4+1:02d}.png")
print(f"pages={len(pages)} contacts={len(list(out.glob('contact-*.png')))}")
