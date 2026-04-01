from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


OUTPUT_PATH = Path(r"E:\Maze\output\pdf\maze-app-summary.pdf")

TITLE = "Maze App Summary"
SUBTITLE = "Evidence-based one-page overview generated from the repository"

WHAT_IT_IS = (
    "Maze is a mobile UX insight engine with a FastAPI backend, Next.js web app, "
    "and iOS/Android SDKs that send authenticated event batches."
)
WHAT_IT_IS_2 = (
    "It helps teams capture product interactions, detect UX friction, and review "
    "insights, issues, sessions, heatmaps, usage, and screenshots."
)

WHO_ITS_FOR = (
    "Primary user: product and growth teams shipping mobile onboarding or other "
    "high-friction journeys who need workspace-level UX visibility."
)

FEATURES = [
    "Email/password sign up and sign in with workspace-scoped sessions.",
    "Generate live or test API keys for SDK event ingestion.",
    "Ingest batched mobile events with deduplication and metadata masking.",
    "Detect UX issues such as drop-off, rage taps, dead taps, slow response, and form friction.",
    "Show dashboard insights, issue snapshots, session summaries, and heatmaps.",
    "Track workspace usage and integration health from recent ingestion activity.",
    "Upload screenshots and serve short-lived signed screenshot URLs.",
]

ARCHITECTURE = [
    "SDKs (iOS and Android) send event batches with X-API-Key to POST /events; screenshot uploads go to POST /screenshots.",
    "FastAPI routers handle auth, workspace settings, ingestion, insights, usage, integrations, and screenshots.",
    "The backend validates tokens/API keys, sanitizes metadata, writes sessions/events to PostgreSQL, and refreshes issue and insight snapshots.",
    "Next.js stores the backend auth token in an HTTP-only cookie and fetches backend data for dashboard, heatmap, settings, usage, and profile views.",
    "Screenshot files are stored on disk under the backend storage directory and exposed through signed file URLs.",
]

HOW_TO_RUN = [
    "Start PostgreSQL and initialize the Maze database with backend/maze.sql.",
    "In backend/.env, set DATABASE_URL and AUTH_SECRET, then run: pip install -r requirements.txt",
    "Start backend: uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload",
    "In web/, run: npm install",
    "Start web: npm run dev, then open http://127.0.0.1:3000 and create a workspace at /signup",
]

NOT_FOUND = [
    "External hosting/deployment setup: Not found in repo.",
]


def wrap_text(text: str, font_name: str, font_size: int, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if stringWidth(trial, font_name, font_size) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped_text(c: canvas.Canvas, text: str, x: float, y: float, width: float, font_name: str, font_size: int, color=colors.black, leading: float | None = None) -> float:
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    leading = leading or (font_size + 3)
    for line in wrap_text(text, font_name, font_size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(c: canvas.Canvas, items: list[str], x: float, y: float, width: float, bullet_color, text_color, font_name="Helvetica", font_size=9, leading=12, bullet_gap=11) -> float:
    for item in items:
        wrapped = wrap_text(item, font_name, font_size, width - bullet_gap)
        if not wrapped:
            continue
        c.setFillColor(bullet_color)
        c.setFont("Helvetica-Bold", font_size)
        c.drawString(x, y, "-")
        c.setFillColor(text_color)
        c.setFont(font_name, font_size)
        c.drawString(x + bullet_gap, y, wrapped[0])
        y -= leading
        for line in wrapped[1:]:
            c.drawString(x + bullet_gap, y, line)
            y -= leading
        y -= 2
    return y


def section_heading(c: canvas.Canvas, label: str, x: float, y: float) -> float:
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x, y, label.upper())
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1)
    c.line(x, y - 4, x + 220, y - 4)
    return y - 16


def build_pdf() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT_PATH), pagesize=letter)
    width, height = letter

    margin = 40
    gutter = 24
    header_h = 92
    body_top = height - margin - header_h
    col_w = (width - (2 * margin) - gutter) / 2
    left_x = margin
    right_x = margin + col_w + gutter

    c.setFillColor(colors.HexColor("#E2E8F0"))
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.roundRect(margin - 10, margin - 8, width - (2 * margin) + 20, height - (2 * margin) + 16, 14, stroke=0, fill=1)

    c.setFillColor(colors.HexColor("#0F172A"))
    c.roundRect(margin, height - margin - header_h, width - (2 * margin), header_h, 14, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#38BDF8"))
    c.rect(margin, height - margin - header_h, 10, header_h, stroke=0, fill=1)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(margin + 24, height - margin - 30, TITLE)
    c.setFillColor(colors.HexColor("#CBD5E1"))
    c.setFont("Helvetica", 10)
    c.drawString(margin + 24, height - margin - 48, SUBTITLE)

    pill_x = width - margin - 160
    pill_y = height - margin - 38
    c.setFillColor(colors.HexColor("#1E293B"))
    c.roundRect(pill_x, pill_y - 8, 132, 24, 12, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#93C5FD"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(pill_x + 66, pill_y, "FastAPI + Next.js + SDKs")

    y_left = section_heading(c, "What it is", left_x, body_top)
    y_left = draw_wrapped_text(c, WHAT_IT_IS, left_x, y_left, col_w, "Helvetica", 9)
    y_left = draw_wrapped_text(c, WHAT_IT_IS_2, left_x, y_left - 2, col_w, "Helvetica", 9)

    y_left = section_heading(c, "Who it's for", left_x, y_left - 8)
    y_left = draw_wrapped_text(c, WHO_ITS_FOR, left_x, y_left, col_w, "Helvetica", 9)

    y_left = section_heading(c, "What it does", left_x, y_left - 8)
    y_left = draw_bullets(c, FEATURES, left_x, y_left, col_w, colors.HexColor("#0284C7"), colors.HexColor("#111827"))

    y_right = section_heading(c, "How it works", right_x, body_top)
    y_right = draw_bullets(c, ARCHITECTURE, right_x, y_right, col_w, colors.HexColor("#0F766E"), colors.HexColor("#111827"))

    y_right = section_heading(c, "How to run", right_x, y_right - 2)
    y_right = draw_bullets(c, HOW_TO_RUN, right_x, y_right, col_w, colors.HexColor("#B45309"), colors.HexColor("#111827"))

    y_right = section_heading(c, "Not found", right_x, y_right - 2)
    y_right = draw_bullets(c, NOT_FOUND, right_x, y_right, col_w, colors.HexColor("#7C3AED"), colors.HexColor("#111827"))

    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.line(margin + col_w + gutter / 2, margin + 12, margin + col_w + gutter / 2, body_top + 6)

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 8)
    c.drawString(margin, margin - 2, "Source basis: README, backend/app, web/app, web/lib, backend/maze.sql, and MAZE_INTEGRATION.md")

    c.showPage()
    c.save()


if __name__ == "__main__":
    build_pdf()
