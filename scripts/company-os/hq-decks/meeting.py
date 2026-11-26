"""HQ Leaders Meeting #1 deck (60 minutes)."""
import os
from pptx.util import Inches
from kit import Deck, C, M, W, H, A, cover, section, clean
from facts import *

OUT = os.environ.get("DECK_OUT", os.path.join(os.path.dirname(__file__), ".."))


def build():
    d = Deck("HQ Leaders Meeting #1", "HQ Leaders Meeting #1 — 26 November 2026")
    cover(d, "HQ Leaders Meeting #1", "One structure.\nFour projects.\nOne operating system.",
          "Recruitment first, then IELS Circle, GIF, Elco AI and IELS Course, December 2026 to August 2027.",
          "Thursday 26 November 2026  ·  60 minutes  ·  Arba (CEO) and Farrel (COO) with the six HQ Leaders",
          notes="Welcome. This is our first meeting as HQ Leaders in the new structure. Three parts, 60 minutes. We leave with one shared picture and clear owners.")

    # 2. Why we are meeting
    s = d.slide(notes="Read the three outcomes out loud. Everything tonight serves these.")
    d.head(s, "Why we are meeting", "Tonight we leave with three things.")
    outs = [("1", "Recruitment is the immediate priority", "Applications close on 29 Nov. We agree who screens which roles and the dates from 30 Nov to 9 Dec."),
            ("2", "Everyone knows the four projects", "IELS Circle, GIF, Elco AI and IELS Course in that order, December 2026 to August 2027, and what your division owns in each."),
            ("3", "Company OS is where we work", "Your department page, your division workspace, project dashboards, guides and SOPs, and one task table.")]
    for i, (n, t, b) in enumerate(outs):
        x = M + i * 4.1
        d.box(s, x, 2.25, 3.85, 3.2, fill=C["SOFT"])
        d.text(s, n, x + 0.3, 2.45, 1, 0.8, size=40, font="EB Garamond", color=C["STEEL"])
        d.text(s, t, x + 0.3, 3.35, 3.3, 0.8, size=16, bold=True, color=C["NAVY"])
        d.text(s, b, x + 0.3, 4.25, 3.3, 1.7, size=12, color=C["INK"])

    # 3. Agenda
    s = d.slide(notes="Keep time strictly. Part 1 is a status check, not a recruitment workshop.")
    d.head(s, "Agenda · 60 minutes", "Three parts, strictly timed.")
    parts = [("Part 1", "Recruitment", "10 min", "0:00 – 0:10", "Status, open roles, who screens what, dates to 9 Dec.", "All"),
             ("Part 2", "Four main projects", "30 min", "0:10 – 0:40", "IELS Circle · GIF · Elco AI · IELS Course. Timeline Dec 2026 – Aug 2027 and each division’s part.", "All"),
             ("Part 3", "Department discussions", "20 min", "0:40 – 1:00", "Operations Department with Farrel. Growth Department with Arba. Run in parallel.", "Split")]
    y = 2.2
    for p, t, mins, clock, body, who in parts:
        d.box(s, M, y, W - 2 * M, 1.3, fill=C["SOFT"])
        d.box(s, M, y, 0.08, 1.3, fill=C["BUTTER"], radius=False)
        d.text(s, p.upper(), M + 0.35, y + 0.22, 1.5, 0.25, size=9, bold=True, color=C["STEEL"], spacing=150)
        d.text(s, t, M + 0.35, y + 0.48, 3.5, 0.5, size=20, font="EB Garamond", color=C["NAVY"])
        d.text(s, body, M + 4.1, y + 0.3, 5.6, 0.8, size=12, color=C["INK"])
        d.chip(s, mins, W - M - 2.45, y + 0.3, C["NAVY"], w=1.0, size=11)
        d.text(s, clock, W - M - 2.45, y + 0.72, 2.2, 0.3, size=10, color=C["MUTED"])
        y += 1.5

    # 4. Structure
    s = d.slide(notes="Name each leader. Stress the three changes at the bottom.")
    d.head(s, "Our structure", "Two departments, six divisions, one HQ.")
    d.box(s, 4.45, 1.95, 4.45, 0.75, fill=C["NAVY"])
    d.text(s, "HQ · Arba (Co-Founder & CEO) · Farrel (Co-Founder & COO)", 4.55, 2.12, 4.25, 0.4, size=11.5, bold=True, color=C["WHITE"], align="c")
    for i, key in enumerate(["operations", "growth"]):
        dep = DEPARTMENTS[key]
        x = M + i * 6.25
        d.box(s, x, 3.0, 5.9, 0.62, fill=C["STEEL"])
        d.text(s, f"{dep['name']}  ·  with {dep['lead']}", x + 0.2, 3.13, 5.5, 0.4, size=13, bold=True, color=C["WHITE"])
        for j, code in enumerate(dep["divisions"]):
            dv = DIVISIONS[code]
            xx = x + j * 1.99
            d.box(s, xx, 3.78, 1.9, 1.75, fill=C["SOFT"])
            d.text(s, dv["name"], xx + 0.15, 3.92, 1.65, 0.35, size=13.5, bold=True, color=C["NAVY"])
            d.text(s, dv["manager"], xx + 0.15, 4.27, 1.65, 0.3, size=11, color=C["STEEL"], bold=True)
            d.text(s, dv["purpose"], xx + 0.15, 4.58, 1.65, 0.95, size=8.5, color=C["INK"])
    d.text(s, "What changed", M, 5.78, 3, 0.3, size=10, bold=True, color=C["STEEL"])
    d.bullets(s, ["Community and Learning are no longer separate divisions. Their work moves into People, Growth and Operations.",
                  "Partnership is now Business, with five partnership categories.",
                  "Growth and Marketing are separate: Growth distributes and grows, Marketing sets content strategy and briefs Creative."],
              M, 6.05, W - 2 * M, 1.0, size=10.5, gap=2)

    # Part 1
    section(d, "01", "Recruitment", "Our immediate priority. A status check and next steps only.", "10 minutes",
            notes="Ten minutes. Yasmine leads this part with Farrel.")

    s = d.slide(notes="Key message: 38 applications, none screened yet. Screening must start this week.")
    d.head(s, "Part 1 · Recruitment status", "38 applications in. None screened yet.", RECRUITMENT["name"] + " · window " + RECRUITMENT["window"])
    stats = [("38", "submitted applications", "8–26 Nov, Company OS"), ("0", "screened so far", "all at “New application”"),
             ("17", "published roles", "31 places + Content Creator (open)"), ("3 days", "until applications close", "29 Nov, 23:59 WIB")]
    for i, (v, l, h) in enumerate(stats):
        x = M + i * 3.07
        d.box(s, x, 2.3, 2.9, 1.55, fill=C["SOFT"])
        d.text(s, v, x + 0.25, 2.42, 2.5, 0.75, size=34, font="EB Garamond", color=C["NAVY"])
        d.text(s, l, x + 0.25, 3.13, 2.5, 0.3, size=11.5, bold=True, color=C["INK"])
        d.text(s, h, x + 0.25, 3.43, 2.5, 0.3, size=9.5, color=C["MUTED"])
    d.text(s, "Dates already published on ielsco.com/careers", M, 4.15, 6, 0.3, size=10, bold=True, color=C["STEEL"])
    tl = RECRUITMENT["timeline"][:7]
    seg = (W - 2 * M) / len(tl)
    d.box(s, M, 4.75, W - 2 * M, 0.05, fill=C["MIST"], radius=False)
    for i, (when, what, note) in enumerate(tl):
        x = M + i * seg
        d.box(s, x, 4.66, 0.22, 0.22, fill=C["BUTTER"] if i == 0 else C["NAVY"])
        d.text(s, when, x, 4.98, seg - 0.1, 0.3, size=11, bold=True, color=C["NAVY"])
        d.text(s, what, x, 5.28, seg - 0.12, 0.5, size=10, bold=True, color=C["INK"])
        d.text(s, note, x, 5.75, seg - 0.12, 0.9, size=8.5, color=C["MUTED"])

    s = d.slide(notes="Roles are shown under the division that would own them in the new structure. This mapping is a proposal: confirm or change it tonight. Flag Creative: no first-choice applicants yet.")
    d.head(s, "Part 1 · Open roles by division", "Where each role lands in the new structure.", "First-choice applications per role, live from Company OS. Mapping is proposed: confirm tonight.")
    cols = [("OPS", "Operations"), ("PAR", "Business"), ("PPL", "People"), ("GRO", "Growth"), ("MKT", "Marketing"), ("CRE", "Creative")]
    cw = (W - 2 * M - 0.25 * 5) / 6
    for i, (code, label) in enumerate(cols):
        x = M + i * (cw + 0.25)
        roles = [r for r in ROLES if r[5] == code]
        d.box(s, x, 2.3, cw, 0.5, fill=C["NAVY"])
        d.text(s, label, x + 0.12, 2.4, cw - 0.2, 0.3, size=12, bold=True, color=C["WHITE"])
        y = 2.95
        for rid, title, scope, places, pub, prop, first in roles:
            d.box(s, x, y, cw, 0.78, fill=C["SOFT"])
            d.text(s, f"{rid} · {title}", x + 0.12, y + 0.08, cw - 0.2, 0.3, size=9.5, bold=True, color=C["NAVY"])
            d.text(s, (f"{places} place{'' if places == 1 else 's'}" if places else 'places open') + f"  ·  {first} first-choice", x + 0.12, y + 0.4, cw - 0.2, 0.3, size=8.5,
                   color=C["RED"] if first == 0 else C["MUTED"], bold=first == 0)
            y += 0.86
    unplaced = [r for r in ROLES if r[5] is None]
    d.text(s, "Not placed yet: " + ", ".join(f"{r[0]} {r[1]} ({r[3]} places, {r[6]} first-choice)" for r in unplaced)
           + ". Creative (K1, K2), Social Media (G2) and People Branding (P1) have no first-choice applicants.", M, 6.55, W - 2 * M, 0.5, size=10, color=C["INK"])

    s = d.slide(notes="Assign owners now. Write names on the slide if needed. Everything goes into Company OS → Recruitment.")
    d.head(s, "Part 1 · Next steps this week", "Who does what before 9 December.")
    rows = [["When", "What", "Who", "Where"],
            ["Now – 29 Nov", "Screen applications for your own roles as they arrive (CV screening stage)", "Each HQ Leader for their division", "OS → Recruitment"],
            ["29 Nov 23:59", "Applications close. No silent extension: any extension is a founder decision", "Yasmine", "OS → Recruitment"],
            ["30 Nov", "Send the group-session schedule to every complete application", "Yasmine · Arba approves", "Email"],
            ["1 – 4 Dec", "Group sessions: each leader joins the session(s) for their roles", "All HQ Leaders", "Calendar"],
            ["5 – 8 Dec", "Evaluate candidates in words, shortlist per role", "Each HQ Leader", "OS → Recruitment"],
            ["9 Dec", "Decisions and offers", "Arba and Farrel", "Email"],
            ["10 – 18 Dec", "Acceptance, reserve list, orientation and OS onboarding", "Yasmine with each leader", "OS → People"]]
    d.table(s, rows, M, 2.1, W - 2 * M, [1.6, 5.9, 2.9, 1.73], rowh=0.5, size=10.5)
    d.text(s, "Open: Creative needs a sourcing push before 29 Nov (no first-choice applicants for K1/K2). Recruiters need a recruitment grant in Company OS.",
           M, 6.35, W - 2 * M, 0.5, size=10.5, color=C["RED"], bold=True)

    # Part 2
    section(d, "02", "Four main projects", "IELS Circle · Global Impact Fellowship · Elco AI · IELS Course. December 2026 to August 2027.", "30 minutes",
            notes="About 6 minutes per project plus 6 minutes for the matrix and questions.")

    s = d.slide(notes="The order is the overall priority. Lower priority does not mean ignored.")
    d.head(s, "Part 2 · Priorities in order", "One portfolio, ranked.", "Priority order guides where time goes when two things clash. It does not mean the lower ones wait.")
    for i, pj in enumerate(PROJECTS):
        x = M + i * 3.07
        acc = C[pj["accent"]]
        d.box(s, x, 2.35, 2.9, 4.2, fill=C["SOFT"])
        d.box(s, x, 2.35, 2.9, 0.08, fill=acc, radius=False)
        d.text(s, f"#{pj['rank']}", x + 0.25, 2.6, 1, 0.6, size=30, font="EB Garamond", color=acc)
        d.text(s, pj["name"], x + 0.25, 3.25, 2.5, 0.45, size=16, bold=True, color=C["NAVY"])
        d.text(s, pj["one_liner"], x + 0.25, 3.75, 2.45, 1.1, size=10.5, color=C["INK"])
        lead = [DIVISIONS[k]["name"] for k, v in pj["divisions"].items() if v[0].startswith("Lead")]
        d.text(s, "Lead: " + " + ".join(lead), x + 0.25, 4.95, 2.45, 0.3, size=10, bold=True, color=C["STEEL"])
        d.text(s, clean(pj["status"])[:170] + ("…" if len(clean(pj["status"])) > 170 else ""), x + 0.25, 5.3, 2.45, 1.2, size=8.5, color=C["MUTED"])

    # timeline
    s = d.slide(notes="Walk left to right. Point at the gates for GIF and at the empty IELS Course row: we must fill it.")
    d.head(s, "Part 2 · Timeline", "December 2026 to August 2027.", "Milestones from the Company OS Master Timeline and the website. Empty means not planned yet.")
    months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]
    mm = {"2026-12": 0, "2027-01": 1, "2027-02": 2, "2027-03": 3, "2027-04": 4, "2027-05": 5, "2027-06": 6, "2027-07": 7, "2027-08": 8}
    x0, lab = M + 1.9, 1.8
    cwid = (W - M - x0) / 9
    for i, mo in enumerate(months):
        d.box(s, x0 + i * cwid, 2.15, cwid - 0.04, 0.32, fill=C["NAVY"] if i % 2 == 0 else C["STEEL"], radius=False)
        d.text(s, mo + (" ’26" if i == 0 else " ’27" if i == 1 else ""), x0 + i * cwid, 2.2, cwid, 0.25, size=9.5, bold=True, color=C["WHITE"], align="c")
    y = 2.6
    for pj in PROJECTS:
        acc = C[pj["accent"]]
        d.text(s, pj["name"], M, y + 0.1, lab, 0.4, size=11, bold=True, color=C["NAVY"])
        d.box(s, x0, y, W - M - x0, 0.95, fill=C["SOFT"], radius=False)
        placed = {}
        for date, label, src in pj["milestones"]:
            if date[:7] not in mm:
                continue
            col = mm[date[:7]]
            k = placed.get(col, 0)
            placed[col] = k + 1
            if k > 1:
                continue
            xx = x0 + col * cwid + 0.06
            d.box(s, xx, y + 0.08 + k * 0.44, 0.1, 0.1, fill=acc)
            short = label.split(" (TL")[0].split(" —")[0]
            d.text(s, f"{int(date[8:])} · {short}", xx + 0.14, y + 0.03 + k * 0.44, cwid - 0.22, 0.42, size=6.8, color=C["INK"])
        if not any(dt[:7] in mm for dt, _, _ in pj["milestones"]):
            d.text(s, "No dated milestones yet: cohort calendar, first payment and targets are To be confirmed.", x0 + 0.2, y + 0.33, 8, 0.3, size=10, color=C["AMBER"], bold=True)
        y += 1.05
    d.text(s, "Also on the calendar: odd-semester exams 7 Dec – 15 Jan · year-end break 21 Dec – 3 Jan · Ramadan ~8 Feb – 9 Mar · even-semester exams 7 – 25 Jun.",
           M, 6.78, W - 2 * M, 0.25, size=8.5, color=C["MUTED"])

    # one slide per project
    for pj in PROJECTS:
        s = d.slide(notes=f"{pj['name']}: what it is, where it stands, what each division does. Ask each leader to say their line out loud.")
        acc = C[pj["accent"]]
        d.head(s, f"Part 2 · #{pj['rank']} {pj['name']}", pj["one_liner"], size=24)
        d.text(s, "What it is", M, 2.0, 5.5, 0.3, size=10, bold=True, color=C["STEEL"])
        d.bullets(s, [clean(w) for w in pj["what"][:4]], M, 2.3, 5.9, 2.6, size=12, gap=6)
        d.box(s, M, 5.0, 5.9, 1.65, fill=C["SOFT"])
        d.text(s, "Where it stands", M + 0.2, 5.12, 5.5, 0.3, size=10, bold=True, color=C["STEEL"])
        d.text(s, clean(pj["status"]), M + 0.2, 5.42, 5.5, 1.2, size=11, color=C["INK"])
        x = M + 6.3
        d.text(s, "What each division does (proposed, confirm in Part 3)", x, 2.0, 6, 0.3, size=10, bold=True, color=C["STEEL"])
        rows = [["Division", "Role", "Contribution"]]
        for code in DIV_ORDER:
            if code in pj["divisions"]:
                role, txt = pj["divisions"][code]
                rows.append([DIVISIONS[code]["name"], {"t": role, "fill": "FDF6CC" if role.startswith("Lead") else None}, txt])
        d.table(s, rows, x, 2.3, W - M - x, [1.15, 1.1, W - M - x - 2.25], rowh=0.6, size=8.8)
        d.text(s, "To be confirmed: " + "; ".join(pj["tbc"][:3]), x, 6.6, W - M - x, 0.4, size=8.5, color=C["AMBER"], bold=True)

    # matrix
    s = d.slide(notes="This is the one picture to remember. Each leader: where are you Lead?")
    d.head(s, "Part 2 · Who leads what", "Every division works on every project.", "L = leads the workstream · S = supports. Proposed from job agreements, the Master Timeline and the published roles.")
    rows = [["Division", "Manager"] + [p["name"] for p in PROJECTS]]
    for code in DIV_ORDER:
        dv = DIVISIONS[code]
        r = [dv["name"], dv["manager"]]
        for pj in PROJECTS:
            role = pj["divisions"].get(code, ("", ""))[0]
            r.append({"t": "L" if role.startswith("Lead") else ("S" if role else "–"), "fill": "FDF6CC" if role.startswith("Lead") else None})
        rows.append(r)
    t = d.table(s, rows, M, 2.25, W - 2 * M, [2.4, 1.6] + [(W - 2 * M - 4.0) / 4] * 4, rowh=0.55, size=12)
    for r in range(1, len(rows)):
        for c in range(2, 6):
            t.cell(r, c).text_frame.paragraphs[0].alignment = 2
    d.text(s, "Department leads: Operations Department with Farrel (Operations, Business, People) · Growth Department with Arba (Growth, Marketing, Creative).",
           M, 6.25, W - 2 * M, 0.4, size=11, color=C["INK"])

    # Part 3
    section(d, "03", "Department discussions", "Operations with Farrel · Growth with Arba. In parallel.", "20 minutes",
            notes="Split into two rooms or breakout rooms. Each group answers the same four questions for its divisions.")
    s = d.slide(notes="Each group writes answers directly into Company OS (department page → Decisions / tasks) before closing.")
    d.head(s, "Part 3 · Department discussions", "Five questions, two rooms.")
    for i, key in enumerate(["operations", "growth"]):
        dep = DEPARTMENTS[key]
        x = M + i * 6.25
        d.box(s, x, 1.95, 5.9, 4.85, fill=C["SOFT"])
        d.box(s, x, 1.95, 5.9, 0.75, fill=C["NAVY"])
        d.text(s, f"{dep['name']} · with {dep['lead']}", x + 0.25, 2.1, 5.4, 0.3, size=14, bold=True, color=C["WHITE"])
        d.text(s, " · ".join(f"{DIVISIONS[c]['name']} ({DIVISIONS[c]['manager']})" for c in dep["divisions"]), x + 0.25, 2.4, 5.4, 0.3, size=9.5, color="D5DEE6")
        qs = (["Confirm the Lead/Support lines for GIF, Circle and IELS Course.",
               "GIF: who owns the next gate (G0, 11 Dec) and the partner research due 18 Dec?",
               "Business: agree the five partnership categories and move every partner into one.",
               "People: recruitment screening split, onboarding 14–18 Dec, delegate support process.",
               "Each division: top 3 tasks for the next 2 weeks, entered in the task table with a PIC and deadline."]
              if key == "operations" else
              ["Confirm the Lead/Support lines for Elco AI, Circle and GIF campaigns.",
               "Marketing: content pillars and the December calendar; first briefs to Creative this week.",
               "Creative: the request queue, revision rule (how many rounds) and file delivery folder.",
               "Growth: KOL/UGC shortlist, distribution plan per channel, one experiment for December.",
               "Each division: top 3 tasks for the next 2 weeks, entered in the task table with a PIC and deadline."])
        d.bullets(s, qs, x + 0.25, 2.95, 5.4, 3.7, size=13, gap=10, bullet="→")

    # OS
    s = d.slide(notes="Show the OS live if there is time: Departments page and the task table.")
    d.head(s, "Company OS", "Where your work lives from tomorrow.", "Sign in at os.ielsco.com with your work Google account. WhatsApp is for quick coordination, never the only record.")
    for i, (label, url, desc) in enumerate(OS_LINKS):
        x = M + (i % 3) * 4.1
        y = 2.35 + (i // 3) * 2.05
        d.box(s, x, y, 3.85, 1.8, fill=C["SOFT"])
        d.text(s, label, x + 0.25, y + 0.22, 3.4, 0.35, size=15, bold=True, color=C["NAVY"])
        d.text(s, url, x + 0.25, y + 0.65, 3.4, 0.3, size=10, color=C["STEEL"], bold=True)
        d.text(s, desc, x + 0.25, y + 1.0, 3.4, 0.6, size=10.5, color=C["INK"])

    # close
    s = d.slide(dark=True, notes="Read out decisions made. Confirm the next meeting.")
    d.head(s, "Before we close", "What we agree tonight.", dark=True)
    d.bullets(s, ["Recruitment owners and dates to 9 Dec (Part 1)",
                  "Lead/Support matrix for the four projects, with changes",
                  "Where Community and Learning work now sits, and where the L1 Learning Content Developer role goes",
                  "Each division's top 3 tasks for the next two weeks, in the task table with PIC and deadline",
                  "Next HQ Leaders meeting: date TBC (proposed weekly, 30–60 minutes)"],
              M, 2.0, 11.5, 3.5, size=15, color=C["WHITE"], gap=12, bcolor=C["BUTTER"])
    d.text(s, "Materials: Company OS → Handbook → HQ Leaders Meeting #1. Project learning decks for each project are in the same place.", M, 6.1, 11.5, 0.5, size=12, color="D5DEE6")
    return d.save(os.path.join(OUT, "HQ-Leaders-Meeting-01-2026-11-26.pptx"))


if __name__ == "__main__":
    print(build())
