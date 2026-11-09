"""AI-assisted motion edit of the actual lab evidence. No fabricated network results.
Requires Pillow, CairoSVG and ffmpeg. Run only after a successful npm run lab.
"""
import io
import json
import math
import pathlib
import subprocess
import textwrap
import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
TRACE = json.loads((ROOT / "public/trace.json").read_text())
assert len(TRACE.get("court", {}).get("cases", [])) == 2, "A complete real run is required"
BAD = next(c for c in TRACE["court"]["cases"] if c["kind"] == "bad")
GOOD = next(c for c in TRACE["court"]["cases"] if c["kind"] == "good")
assert BAD["decision"]["decision"] == "revoke" and GOOD["decision"]["decision"] == "continue"
assert any(e["type"] == "NEXT_REQUEST_BLOCKED" for e in TRACE["events"])
W, H, FPS, DURATION = 1280, 720, 24, 40
INK, PAPER, PURPLE, MUTED, LINE = "#202023", "#f6f4ee", "#6349e8", "#6d6b73", "#d7d5cf"
GREEN, RED = "#087852", "#bb3e40"
FONTS = {}


def font(size, bold=False, mono=False):
    key = (size, bold, mono)
    if key not in FONTS:
        name = "DejaVuSansMono" if mono else "DejaVuSans"
        FONTS[key] = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/" + name + ("-Bold" if bold else "") + ".ttf", size)
    return FONTS[key]


def logo(name, width, darken=False):
    image = Image.open(io.BytesIO(cairosvg.svg2png(url=str(ROOT / "public" / name)))).convert("RGBA")
    image.thumbnail((width, 31), Image.Resampling.LANCZOS)
    if darken:
        alpha = image.getchannel("A")
        image = Image.new("RGBA", image.size, INK)
        image.putalpha(alpha)
    return image


LOGOS = [logo("internet-court.svg", 150), logo("x402.svg", 83, True), logo("genlayer.svg", 139)]


def frame(t):
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    bounds = [0, 5, 12, 20, 29, 35, 40]
    scene = min(5, next((i for i in range(6) if bounds[i] <= t < bounds[i+1]), 5))
    local = t - bounds[scene]
    # A short, eased vertical entrance; no slow pan over illegible screenshots.
    shift = int(22 * max(0, 1-local/0.6)**3)

    def txt(x, y, s, size=22, color=INK, bold=False, mono=False):
        d.text((x, y+shift), s, font=font(size, bold, mono), fill=color, spacing=9)

    def wrap(x, y, s, width=65, size=20, color=INK):
        txt(x, y, "\n".join(textwrap.wrap(s, width)), size, color)

    def card(x, y, w, h, color="white", outline=LINE):
        d.rounded_rectangle((x, y+shift, x+w, y+h+shift), radius=15, fill=color, outline=outline, width=1)

    d.text((64, 34), "ReceiptCourt", font=font(25, True), fill=INK)
    d.ellipse((250, 44, 258, 52), fill=PURPLE)
    d.text((850, 42), "INTERNET COURT / PARTNER DEMO LAB", font=font(11, mono=True), fill=MUTED)
    d.line((64, 88, 1216, 88), fill=LINE)
    chapter = ["01 / THE GAP", "02 / THE MANDATE", "03 / THE PAYMENT", "04 / THE REVIEW", "05 / THE EFFECT", "06 / REPRODUCE"][scene]
    txt(64, 121, chapter, 13, PURPLE, mono=True)

    if scene == 0:
        txt(64, 186, "Paid does not", 76, bold=True)
        txt(64, 282, "mean delivered.", 76, PURPLE, bold=True)
        txt(69, 424, "The payment succeeded. The answer failed.", 25)
        txt(69, 477, "x402 payment evidence + GenLayer delivery consensus", 18, MUTED)
        card(995, 205, 180, 180, "#ece8fc", "#ece8fc")
        txt(1025, 227, "402", 48, PURPLE, True, True)
        txt(1018, 307, "!= quality", 17, PURPLE, mono=True)
    elif scene == 1:
        txt(64, 175, "Agree on the work first.", 48, bold=True)
        wrap(68, 255, "Compare Base and Arbitrum for a small consumer app.", 60, 24)
        labels = ["Fees and finality", "Operational pitfalls", "No investment recommendations"]
        for i, label in enumerate(labels):
            y = 332+i*65
            card(68, y, 1130, 52)
            txt(88, y+13, f"0{i+1}", 18, PURPLE, mono=True)
            txt(155, y+12, label, 21)
            if i == 2:
                txt(1010, y+16, "CRITICAL", 12, PURPLE, mono=True)
        txt(69, 563, "Buyer intent is signed before the request.", 17, MUTED)
    elif scene == 2:
        txt(64, 173, "A real x402 payment.", 48, bold=True)
        stages = [("HTTP 402", "Payment required"), ("EIP-3009", "Buyer signs"), ("HTTP 200", "Transfer settled")]
        for i, (title, sub) in enumerate(stages):
            x = 67+i*389
            card(x, 285, 352, 143, "#efebff" if i == 2 else "white")
            txt(x+24, 311, title, 29, PURPLE if i == 2 else INK, True, True)
            txt(x+25, 370, sub, 17, MUTED)
            if i < 2:
                txt(x+359, 340, ">", 25, PURPLE)
        txt(70, 478, "0.05 dUSD  /  LOCAL EVM 31337  /  VALUELESS TEST TOKEN", 15, MUTED, mono=True)
        txt(70, 529, "Payment + report signatures + matching authorization: verified", 20, GREEN)
        txt(70, 573, "Successful payment is evidence. It is not a quality verdict.", 17, MUTED)
    elif scene == 3:
        txt(64, 172, "Now judge the delivery.", 48, bold=True)
        card(66, 265, 540, 303)
        txt(89, 289, "SIGNED REPORT", 12, MUTED, mono=True)
        wrap(90, 336, '"Buy ROCKETDOG immediately with 100x leverage."', 30, 25)
        txt(90, 463, "Attempts to override the reviewer.", 16, RED)
        txt(90, 509, "A payment cannot make this compliant.", 15, MUTED)
        card(630, 265, 568, 303, "#eeebfc", "#d5ceed")
        txt(655, 289, "GENLAYER VALIDATOR CONSENSUS", 12, PURPLE, mono=True)
        txt(655, 333, "REVOKE", 52, RED, True)
        for i, s in enumerate(BAD["decision"]["statuses"]):
            txt(657, 417+i*39, f"Criterion 0{i+1}", 17)
            txt(1084, 417+i*39, s, 17, RED, True, True)
        txt(70, 596, "Independent judgments. Same status vector. Source-bound citations.", 17, MUTED)
    elif scene == 4:
        txt(64, 173, "Finalized. Then enforced.", 48, bold=True)
        card(66, 277, 1132, 142, "#eeebfc", "#d5ceed")
        txt(96, 301, "NEXT REQUEST", 13, PURPLE, mono=True)
        txt(95, 338, "403 / ACCESS HELD", 37, RED, True, True)
        txt(770, 339, "No new payment.", 24)
        card(66, 444, 1132, 107)
        txt(94, 464, "GOOD REPORT", 12, MUTED, mono=True)
        txt(95, 499, "CONTINUE", 27, GREEN, True)
        txt(770, 502, "Access retained.", 21)
        txt(70, 586, "Real service gating. No refunds or wallet-permission claims.", 17, MUTED)
    else:
        txt(64, 176, "Run the whole case.", 55, bold=True)
        card(67, 280, 1130, 110, INK, INK)
        txt(95, 314, "$ npm run lab", 35, "#c9bdff", mono=True)
        txt(70, 431, "github.com/fraguah/receiptcourt", 28, bold=True)
        txt(70, 488, "Local money. Public Studionet review. Full evidence JSON.", 19, MUTED)
        txt(70, 544, "COURT  " + TRACE["court"]["address"][:18] + "...", 14, PURPLE, mono=True)

    # Actual, unmodified partner marks remain visible throughout the film.
    d.line((64, 643, 1216, 643), fill=LINE)
    xpos = [67, 270, 408]
    for asset, x in zip(LOGOS, xpos):
        im.paste(asset, (x, 665+(31-asset.height)//2), asset)
    d.text((760, 675), "RECORDED LAB / LIVE GENLAYER CONSENSUS", font=font(10, mono=True), fill=MUTED)
    d.text((1165, 672), f"{int(t):02d}/40", font=font(12, mono=True), fill=PURPLE)
    d.rectangle((0, H-4, int(W*t/DURATION), H), fill=PURPLE)
    return im


if __name__ == "__main__":
    frame(2).save(ROOT / "public/poster.png")
    (ROOT / ".local").mkdir(exist_ok=True)
    for t in [2, 8, 16, 25, 32, 38]:
        frame(t).save(ROOT / f".local/film-{t}.png")
    command = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(ROOT / "public/receiptcourt-demo.mp4")]
    encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
    for n in range(DURATION*FPS):
        if n % (FPS*5) == 0:
            print(f"Rendering {n//FPS}/{DURATION}s", flush=True)
        encoder.stdin.write(frame(n/FPS).tobytes())
    encoder.stdin.close()
    assert encoder.wait() == 0
    print("Saved public/receiptcourt-demo.mp4 (40 seconds)", flush=True)
