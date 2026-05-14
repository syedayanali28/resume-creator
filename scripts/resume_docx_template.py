"""
Shared Word resume styling: Times New Roman, balanced margins, readable spacing,
section rules, and typographic separators (en dash for ranges, middle dot in headers).
"""
from __future__ import annotations

import re
from typing import Iterable

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

# Comfortable print margins (readable “gutter” without wasting space)
MARGIN_LR = Inches(0.72)
MARGIN_TB = Inches(0.6)

FONT_NAME = "Times New Roman"
BODY_PT = 11
NAME_PT = 16
SECTION_PT = 11

# Optional: keep semicolons out of body copy. Em dash discouraged (use en dash or parentheses).
_BANNED = re.compile(r"[;\u2014]")


def scrub(text: str) -> str:
    """Normalize semicolons. Keep en dashes (–) for pretty date ranges."""
    t = text.replace("\u2014", " – ")  # em dash → spaced en dash
    if ";" in t:
        t = t.replace("; ", ". ").replace(";", ". ")
    while "  " in t:
        t = t.replace("  ", " ")
    return t.strip()


def endash_range(a: str, b: str) -> str:
    """Typographic date range: Jun 2022–Jun 2026 (en dash, no spaces)."""
    return f"{a}\u2013{b}"


def assert_clean(lines: Iterable[str]) -> None:
    for line in lines:
        if _BANNED.search(line):
            raise ValueError(f"Resume line contains banned punctuation: {line!r}")


def _set_run_font(run, name: str = FONT_NAME, size_pt: int = BODY_PT) -> None:
    run.font.name = name
    run.font.size = Pt(size_pt)
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = OxmlElement("w:rFonts")
    rFonts.set(qn("w:ascii"), name)
    rFonts.set(qn("w:hAnsi"), name)
    rFonts.set(qn("w:cs"), name)
    rFonts.set(qn("w:eastAsia"), name)
    rPr.insert(0, rFonts)


def apply_resume_page_setup(doc: Document) -> None:
    sect = doc.sections[0]
    sect.left_margin = sect.right_margin = MARGIN_LR
    sect.top_margin = sect.bottom_margin = MARGIN_TB
    sect.page_height = Inches(11)
    sect.page_width = Inches(8.5)


def _paragraph_bottom_border(paragraph, *, color: str = "BBBBBB", sz: str = "6") -> None:
    p = paragraph._p
    pPr = p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), sz)
    bottom.set(qn("w:space"), "2")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def apply_body_styles(doc: Document) -> None:
    for name in ("Normal", "List Paragraph"):
        if name in doc.styles:
            st = doc.styles[name]
            st.font.name = FONT_NAME
            st.font.size = Pt(BODY_PT)
    if "List Bullet" in doc.styles:
        st = doc.styles["List Bullet"]
        st.font.name = FONT_NAME
        st.font.size = Pt(BODY_PT)


def polish_all_runs_times(doc: Document, body_pt: int = BODY_PT) -> None:
    """Force Times New Roman on every run (python-docx styles are not always inherited)."""
    def _polish_paragraph(p) -> None:
        # Slightly roomier body text without blowing page count
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        p.paragraph_format.line_spacing = 1.08
        if p.style and p.style.name == "List Bullet":
            p.paragraph_format.space_after = Pt(4)
        for r in p.runs:
            sz = int(r.font.size.pt) if r.font.size else body_pt
            _set_run_font(r, FONT_NAME, sz)

    for p in doc.paragraphs:
        _polish_paragraph(p)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    _polish_paragraph(p)


def add_name_header(doc: Document, name: str, contact_line: str) -> None:
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(4)
    r = title.add_run(name)
    r.bold = True
    r.font.size = Pt(NAME_PT)
    _set_run_font(r, FONT_NAME, NAME_PT)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.paragraph_format.space_after = Pt(14)
    r = sub.add_run(scrub(contact_line))
    _set_run_font(r, FONT_NAME, BODY_PT - 1)

    rule = doc.add_paragraph()
    rule.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rule.paragraph_format.space_after = Pt(10)
    rr = rule.add_run("\u2015" * 44)
    _set_run_font(rr, FONT_NAME, 8)


def add_section_heading(doc: Document, text: str, *, first: bool = False) -> None:
    p = doc.add_paragraph()
    if first:
        p.paragraph_format.space_before = Pt(2)
    else:
        p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(f"  {text.upper()}  ")
    r.bold = True
    r.font.size = Pt(SECTION_PT)
    _set_run_font(r, FONT_NAME, SECTION_PT)
    _paragraph_bottom_border(p)


def add_job_title_line(doc: Document, company: str, date_range: str) -> None:
    """Company left, dates right on one line (matches common resume PDFs)."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    # Right tab just inside the right margin (8.5in page, ~0.72in margins → ~7.06in body width from left margin start)
    p.paragraph_format.tab_stops.add_tab_stop(Inches(7.78), WD_TAB_ALIGNMENT.RIGHT)
    r1 = p.add_run(company)
    r1.bold = True
    _set_run_font(r1, FONT_NAME, BODY_PT)
    p.add_run("\t")
    r2 = p.add_run(scrub(date_range))
    _set_run_font(r2, FONT_NAME, BODY_PT)


def add_job_meta_line(doc: Document, role: str, location: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    # Middle dot separators read cleaner than pipes in body text
    meta = scrub(f"{role}  \u00b7  {location}")
    r = p.add_run(meta)
    r.italic = True
    _set_run_font(r, FONT_NAME, BODY_PT - 1)


def add_bullets(doc: Document, items: list[str]) -> None:
    for raw in items:
        text = scrub(raw)
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        p.paragraph_format.line_spacing = 1.08
        p.paragraph_format.left_indent = Inches(0.28)
        p.paragraph_format.first_line_indent = Inches(-0.22)
        r = p.add_run(text)
        _set_run_font(r, FONT_NAME, BODY_PT)


def add_job_spacer(doc: Document) -> None:
    """Air between employers."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(0)
