"""Slide kit for the HQ Leaders decks. Same design system as the IELSco x Elco AI BD decks
(output/bd-partnership-decks/source/lib.js): 16:9, navy/steel/butter palette, EB Garamond headlines, Plus Jakarta Sans
body, combo logo top right, footer with deck name and page number."""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

A = os.path.join(os.path.dirname(__file__), "a")
C = dict(NAVY="304156", STEEL="577B90", MIST="DCDFE3", BUTTER="F9E15B", RED="CB2129", INK="1F2B3A", SOFT="F3F5F7",
         WHITE="FFFFFF", MUTED="6B7A8C", LINE="E3E7EC", GREEN="2E7D5B", AMBER="B07A12", SKY="5BC2E7", DEEP="102129",
         TEAL="3E9396", CORAL="E06C5A", CIRCLE="2F6FB5", PALE="EEF2F6", BUTTERSOFT="FDF6CC")
HF, BF = "EB Garamond", "Plus Jakarta Sans"
W, H, M = 13.333, 7.5, 0.6


def clean(t):
    import re
    return re.sub(r"\s*\((SITE|OS|FND|AGR|OS facts|SITE docs|SITE / product|OS live stats, 26 Nov|FND, 24 Nov)\)", "", t)


def rgb(h):
    return RGBColor.from_string(h)


class Deck:
    def __init__(self, name, title):
        self.p = Presentation()
        self.p.slide_width, self.p.slide_height = Inches(W), Inches(H)
        self.name, self.n = name, 0
        self.p.core_properties.title = title
        self.p.core_properties.author = "IELSco HQ"
        self.blank = self.p.slide_layouts[6]

    # ── primitives ──────────────────────────────────────────────────────────────────────────────────────────────
    def slide(self, dark=False, bg=None, logo=True, footer=True, notes=None):
        s = self.p.slides.add_slide(self.blank)
        self.n += 1
        fill = s.background.fill
        fill.solid()
        fill.fore_color.rgb = rgb(bg or (C["NAVY"] if dark else C["WHITE"]))
        if logo:
            s.shapes.add_picture(os.path.join(A, "combo_white.png" if dark else "combo_navy.png"), Inches(W - M - 1.85), Inches(0.42), Inches(1.85))
        if footer:
            col = "AFC0CE" if dark else C["MUTED"]
            self.text(s, f"IELSco HQ  ·  {self.name}  ·  Internal", M, H - 0.42, 8, 0.25, size=8, color=col)
            self.text(s, f"{self.n:02d}", W - M - 1, H - 0.42, 1, 0.25, size=8, color=col, align="r")
        if notes:
            s.notes_slide.notes_text_frame.text = notes
        return s

    def text(self, s, t, x, y, w, h, size=12, color=None, bold=False, font=None, align="l", valign="t", italic=False, spacing=None, line=None):
        tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        tf.vertical_anchor = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}[valign]
        items = t if isinstance(t, list) else [t]
        for i, item in enumerate(items):
            para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            para.alignment = {"l": PP_ALIGN.LEFT, "c": PP_ALIGN.CENTER, "r": PP_ALIGN.RIGHT}[align]
            if line:
                para.line_spacing = line
            runs = item if isinstance(item, tuple) and isinstance(item[0], tuple) else ((item, {}),) if not isinstance(item, tuple) else (item,)
            for txt, st in runs:
                r = para.add_run()
                r.text = txt
                f = r.font
                f.name = st.get("font", font or BF)
                f.size = Pt(st.get("size", size))
                f.bold = st.get("bold", bold)
                f.italic = st.get("italic", italic)
                f.color.rgb = rgb(st.get("color", color or C["INK"]))
                if spacing:
                    r.font._element.set("spc", str(spacing))
        return tb

    def bullets(self, s, items, x, y, w, h, size=12, color=None, gap=6, bullet="•", bcolor=None):
        tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        for i, it in enumerate(items):
            para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            para.space_after = Pt(gap)
            sub = isinstance(it, tuple) and it[0] == "sub"
            body = it[1] if sub else it
            if bullet:
                r = para.add_run()
                r.text = ("    – " if sub else bullet + "  ")
                r.font.name, r.font.size = BF, Pt(size - (1 if sub else 0))
                r.font.color.rgb = rgb(bcolor or C["STEEL"])
                r.font.bold = True
            parts = body if isinstance(body, list) else [body]
            for part in parts:
                bold = False
                if isinstance(part, tuple):
                    part, bold = part[0], True
                r = para.add_run()
                r.text = part
                r.font.name, r.font.size, r.font.bold = BF, Pt(size - (1 if sub else 0)), bold
                r.font.color.rgb = rgb(color or C["INK"])
        return tb

    def box(self, s, x, y, w, h, fill=None, line=None, radius=True, lw=0.75):
        shp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
        if radius:
            shp.adjustments[0] = min(0.12, 0.18 / max(min(w, h), 0.2))
        if fill:
            shp.fill.solid()
            shp.fill.fore_color.rgb = rgb(fill)
        else:
            shp.fill.background()
        if line:
            shp.line.color.rgb = rgb(line)
            shp.line.width = Pt(lw)
        else:
            shp.line.fill.background()
        shp.shadow.inherit = False
        shp.text_frame.text = ""
        return shp

    def head(self, s, kicker, title, sub=None, dark=False, w=10.2, y=0.42, size=30):
        self.text(s, kicker.upper(), M, y, 9, 0.28, size=9.5, bold=True, color=C["BUTTER"] if dark else C["STEEL"], spacing=200)
        self.text(s, title, M, y + 0.3, w, 0.9, size=size, font=HF, color=C["WHITE"] if dark else C["NAVY"], line=0.95)
        if sub:
            self.text(s, sub, M, y + 1.18, min(w + 1.4, W - 2 * M), 0.5, size=12.5, color="D5DEE6" if dark else C["MUTED"])

    def chip(self, s, label, x, y, fill, color="FFFFFF", w=None, size=9):
        w = w or (0.16 + 0.075 * len(label))
        b = self.box(s, x, y, w, 0.27, fill=fill)
        self.text(s, label, x, y + 0.035, w, 0.22, size=size, bold=True, color=color, align="c")
        return w

    def card(self, s, x, y, w, h, title, body, accent=None, fill=None, tsize=13, bsize=10.5, kicker=None):
        self.box(s, x, y, w, h, fill=fill or C["SOFT"])
        if accent:
            self.box(s, x, y, 0.07, h, fill=accent, radius=False)
        yy = y + 0.2
        if kicker:
            self.text(s, kicker.upper(), x + 0.25, yy, w - 0.4, 0.22, size=8, bold=True, color=accent or C["STEEL"], spacing=150)
            yy += 0.27
        self.text(s, title, x + 0.25, yy, w - 0.45, 0.4, size=tsize, bold=True, color=C["NAVY"])
        if isinstance(body, list):
            self.bullets(s, body, x + 0.25, yy + 0.42, w - 0.45, h - (yy - y) - 0.5, size=bsize, gap=3)
        elif body:
            self.text(s, body, x + 0.25, yy + 0.42, w - 0.45, h - (yy - y) - 0.5, size=bsize, color=C["INK"])

    def table(self, s, rows, x, y, w, colw, rowh=0.36, size=10, head_fill=None, zebra=True, bold_first=False, fills=None):
        nrows, ncols = len(rows), len(rows[0])
        shp = s.shapes.add_table(nrows, ncols, Inches(x), Inches(y), Inches(w), Inches(rowh * nrows))
        tbl = shp.table
        tblPr = tbl._tbl.tblPr
        tblPr.set("firstRow", "1"); tblPr.set("bandRow", "0")
        style = tblPr.find("{http://schemas.openxmlformats.org/drawingml/2006/main}tableStyleId")
        if style is None:
            from lxml import etree
            style = etree.SubElement(tblPr, "{http://schemas.openxmlformats.org/drawingml/2006/main}tableStyleId")
        style.text = "{2D5ABB26-0587-4C30-8999-92F81FD0307C}"  # No Style, No Grid
        for i, cw in enumerate(colw):
            tbl.columns[i].width = Inches(cw)
        for r in range(nrows):
            tbl.rows[r].height = Inches(rowh)
            for c in range(ncols):
                cell = tbl.cell(r, c)
                val = rows[r][c]
                fill = None
                if isinstance(val, dict):
                    fill, val = val.get("fill"), val.get("t", "")
                cell.margin_left = cell.margin_right = Inches(0.08)
                cell.margin_top = cell.margin_bottom = Inches(0.03)
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                tf = cell.text_frame
                tf.word_wrap = True
                tf.text = ""
                para = tf.paragraphs[0]
                run = para.add_run()
                run.text = str(val)
                run.font.name = BF
                run.font.size = Pt(size)
                run.font.bold = r == 0 or (bold_first and c == 0)
                run.font.color.rgb = rgb(C["WHITE"] if r == 0 else C["INK"])
                cell.fill.solid()
                if r == 0:
                    cell.fill.fore_color.rgb = rgb(head_fill or C["NAVY"])
                elif fill:
                    cell.fill.fore_color.rgb = rgb(fill)
                else:
                    cell.fill.fore_color.rgb = rgb(C["SOFT"] if (zebra and r % 2 == 0) else C["WHITE"])
        return tbl

    def tbc(self, s, x, y, text="To be confirmed"):
        return self.chip(s, text, x, y, C["BUTTERSOFT"], color=C["AMBER"], size=8.5)

    def save(self, path):
        self.p.save(path)
        return path


# ── shared slide patterns ─────────────────────────────────────────────────────────────────────────────────────────
def cover(d, kicker, title, sub, date_line, logo=None, notes=None):
    s = d.slide(dark=True, logo=False, footer=False, notes=notes)
    s.shapes.add_picture(os.path.join(A, "combo_white.png"), Inches(M), Inches(0.6), Inches(2.4))
    if logo:
        s.shapes.add_picture(os.path.join(A, logo[0]), Inches(W - M - logo[1]), Inches(0.5), Inches(logo[1]))
    d.box(s, M, 2.35, 0.9, 0.07, fill=C["BUTTER"], radius=False)
    d.text(s, kicker.upper(), M, 2.6, 10, 0.3, size=11, bold=True, color=C["BUTTER"], spacing=250)
    d.text(s, title, M, 3.0, 11.5, 2.3, size=44, font=HF, color=C["WHITE"], line=0.92)
    d.text(s, sub, M, 5.45, 11, 0.8, size=15, color="D5DEE6")
    d.text(s, date_line, M, H - 1.0, 11, 0.3, size=11, color="AFC0CE")
    return s


def section(d, num, title, sub, minutes=None, notes=None):
    s = d.slide(dark=True, notes=notes)
    d.text(s, num, M, 2.1, 3, 1.2, size=72, font=HF, color=C["BUTTER"])
    d.text(s, title, M, 3.35, 11, 1.0, size=40, font=HF, color=C["WHITE"])
    d.text(s, sub, M, 4.4, 10.5, 0.8, size=15, color="D5DEE6")
    if minutes:
        d.chip(s, minutes, M, 5.35, C["BUTTER"], color=C["NAVY"], size=11, w=1.4)
    return s
