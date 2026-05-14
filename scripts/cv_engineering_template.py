"""
Layout modeled after a classic one-column engineering CV (e.g. UI Illinois style):
  • Centered ALL CAPS name, contact row with | separators and blue hyperlinks
  • ALL CAPS section titles + full-width horizontal rule
  • Education / Experience: left–right alignment via tab stops (dates right)
  • Times New Roman, ~0.75\" margins, US Letter
"""
from __future__ import annotations

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

FONT = "Times New Roman"
BODY = 11
NAME = 16
SECTION = 11
MARGIN = Inches(0.75)
# Right tab for dates / right column (Letter 8.5\" − 2×0.75\" margin → body ends ~7.75\" from page left)
TAB_RIGHT = Inches(7.72)


def _rfonts(run, name: str = FONT) -> None:
    r = run._element
    rpr = r.get_or_add_rPr()
    fonts = OxmlElement("w:rFonts")
    fonts.set(qn("w:ascii"), name)
    fonts.set(qn("w:hAnsi"), name)
    fonts.set(qn("w:cs"), name)
    fonts.set(qn("w:eastAsia"), name)
    rpr.insert(0, fonts)


def _set_run(run, *, bold: bool = False, italic: bool = False, size: int = BODY, color: RGBColor | None = None) -> None:
    run.font.name = FONT
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color is not None:
        run.font.color.rgb = color
    _rfonts(run)


def add_hyperlink(paragraph, text: str, url: str) -> None:
    part = paragraph.part
    r_id = part.relate_to(url, RT.HYPERLINK, is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), r_id)
    new_run = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "0563C1")
    u = OxmlElement("w:u")
    u.set(qn("w:val"), "single")
    rfonts = OxmlElement("w:rFonts")
    rfonts.set(qn("w:ascii"), FONT)
    rfonts.set(qn("w:hAnsi"), FONT)
    rpr.append(rfonts)
    rpr.append(color)
    rpr.append(u)
    new_run.append(rpr)
    t = OxmlElement("w:t")
    t.set(qn("xml:space"), "preserve")
    t.text = text
    new_run.append(t)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


def apply_page(doc: Document) -> None:
    s = doc.sections[0]
    s.left_margin = s.right_margin = MARGIN
    s.top_margin = s.bottom_margin = MARGIN
    s.page_height = Inches(11)
    s.page_width = Inches(8.5)


def add_name_block(doc: Document, name_caps: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(name_caps)
    _set_run(r, bold=True, size=NAME)


def add_contact_row(
    doc: Document,
    phone: str,
    email: str,
    email_url: str,
    github_label: str,
    github_url: str,
    linkedin_label: str,
    linkedin_url: str,
) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(14)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    r = p.add_run(phone)
    _set_run(r, size=BODY - 1)
    sep = p.add_run("  |  ")
    _set_run(sep, size=BODY - 1)
    add_hyperlink(p, email, email_url)
    sep2 = p.add_run("  |  ")
    _set_run(sep2, size=BODY - 1)
    add_hyperlink(p, github_label, github_url)
    sep3 = p.add_run("  |  ")
    _set_run(sep3, size=BODY - 1)
    add_hyperlink(p, linkedin_label, linkedin_url)


def _section_rule(paragraph) -> None:
    p = paragraph._p
    ppr = p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "12")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "000000")
    pbdr.append(bottom)
    ppr.append(pbdr)


def add_section_title(doc: Document, title_caps: str, *, space_before: int = 12) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title_caps.upper())
    _set_run(r, bold=True, size=SECTION)
    _section_rule(p)


def add_subheading_two_rows(
    doc: Document,
    left_top: str,
    right_top: str,
    left_bottom: str,
    right_bottom: str,
    *,
    space_before: int = 4,
) -> None:
    """Two-row header like master-resume \\resumeSubheading: bold | bold, then italic | italic."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.tab_stops.add_tab_stop(TAB_RIGHT, WD_TAB_ALIGNMENT.RIGHT)
    a = p.add_run(left_top)
    _set_run(a, bold=True, size=BODY)
    p.add_run("\t")
    b = p.add_run(right_top)
    _set_run(b, bold=True, size=BODY)

    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(6)
    p2.paragraph_format.tab_stops.add_tab_stop(TAB_RIGHT, WD_TAB_ALIGNMENT.RIGHT)
    c = p2.add_run(left_bottom)
    _set_run(c, italic=True, size=BODY - 1)
    p2.add_run("\t")
    d = p2.add_run(right_bottom)
    _set_run(d, italic=True, size=BODY - 1)


def add_bullets(doc: Document, items: list[str]) -> None:
    for t in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        p.paragraph_format.line_spacing = 1.06
        p.paragraph_format.left_indent = Inches(0.25)
        p.paragraph_format.first_line_indent = Inches(-0.2)
        r = p.add_run(t)
        _set_run(r, size=BODY)


def add_skills_category_bullet(doc: Document, label: str, body: str) -> None:
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = 1.06
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.first_line_indent = Inches(-0.2)
    lb = p.add_run(f"{label}: ")
    _set_run(lb, bold=True, size=BODY)
    rb = p.add_run(body)
    _set_run(rb, size=BODY)


def add_project_title_line(doc: Document, title: str, dates: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.tab_stops.add_tab_stop(TAB_RIGHT, WD_TAB_ALIGNMENT.RIGHT)
    r1 = p.add_run(title)
    _set_run(r1, bold=True, size=BODY)
    p.add_run("\t")
    r2 = p.add_run(dates)
    _set_run(r2, size=BODY)


def add_italic_subheading(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text)
    _set_run(r, italic=True, size=BODY)


def polish_doc_fonts(doc: Document) -> None:
    for p in doc.paragraphs:
        for r in p.runs:
            if r.font.size:
                _rfonts(r)
    for t in doc.tables:
        for row in t.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    for r in p.runs:
                        _rfonts(r)
