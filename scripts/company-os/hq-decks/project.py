"""Four project learning decks: <Project> — Project Overview and Team Learning."""
import os
from kit import Deck, C, M, W, H, A, cover, section, clean
from facts import *

OUT = os.environ.get("DECK_OUT", os.path.join(os.path.dirname(__file__), ".."))
SRC = {"SITE": "ielsco.com / gif.ielsco.com and their source", "OS": "Company OS (live, 26 Nov 2026)", "FND": "Founder decisions, Nov 2026",
       "AGR": "Division Manager Appointment Agreements"}
MONTHS = {"01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"}


def fmt(date):
    if date == "TBC":
        return "TBC"
    return f"{int(date[8:])} {MONTHS[date[5:7]]} {date[:4]}"


def build(pj):
    title = pj["name"]
    d = Deck(f"{title} · Team Learning", f"{title} — Project Overview and Team Learning")
    acc = C[pj["accent"]]
    logo = (pj["logo"], 1.9 if pj["logo"] != "happy.png" else 1.3) if pj["logo"] and pj["logo"] not in ("gif_navy.png",) else (("gif_white.png", 1.2) if pj["logo"] == "gif_navy.png" else None)
    if pj["logo"] == "circleblue.png":
        logo = ("circle-white.png", 2.2)
    cover(d, f"Project #{pj['rank']} of 4 · Team learning", f"{title}\nProject overview", pj["one_liner"],
          f"Internal learning deck for HQ Leaders and division members  ·  As of {AS_OF}", logo=logo)

    s = d.slide()
    d.head(s, "How to use this deck", "Study it before you start working on the project.",
           "Every fact carries its source. Anything we could not find is marked To be confirmed: never fill those gaps with guesses.")
    for i, (k, v) in enumerate(SRC.items()):
        x = M + i * 3.07
        d.box(s, x, 2.4, 2.9, 1.3, fill=C["SOFT"])
        d.text(s, k, x + 0.25, 2.55, 2.5, 0.4, size=18, bold=True, color=acc)
        d.text(s, v, x + 0.25, 3.0, 2.5, 0.6, size=10.5, color=C["INK"])
    d.text(s, "Contents", M, 4.1, 3, 0.3, size=10, bold=True, color=C["STEEL"])
    d.bullets(s, ["Background and purpose · Who it is for · What we run", "Where it stands now · Timeline December 2026 – August 2027",
                  "What it takes to run · Who does what · Dependencies and risks", "KPIs and data · Immediate priorities · Questions still open · Where to find it"],
              M, 4.45, 11.5, 2, size=13, gap=6)

    s = d.slide()
    d.head(s, "Background and purpose", f"Why {title} exists.")
    d.bullets(s, pj["background"], M, 2.05, 7.4, 4.6, size=13, gap=10)
    d.box(s, M + 7.8, 2.05, W - 2 * M - 7.8, 4.5, fill=C["SOFT"])
    d.box(s, M + 7.8, 2.05, W - 2 * M - 7.8, 0.08, fill=acc, radius=False)
    d.text(s, "Who it is for", M + 8.05, 2.35, 3.8, 0.3, size=10, bold=True, color=C["STEEL"])
    d.text(s, pj["audience"], M + 8.05, 2.7, W - 2 * M - 8.3, 1.4, size=13, color=C["NAVY"], bold=True)
    d.text(s, "Priority", M + 8.05, 4.35, 3.8, 0.3, size=10, bold=True, color=C["STEEL"])
    d.text(s, f"#{pj['rank']} of the four HQ projects (Dec 2026 – Aug 2027). Priority guides where time goes when work clashes; it never means a project waits.",
           M + 8.05, 4.7, W - 2 * M - 8.3, 1.6, size=11.5, color=C["INK"])

    s = d.slide()
    d.head(s, "What we run", "The product or programme, in facts.")
    d.bullets(s, pj["what"], M, 2.05, W - 2 * M, 4.6, size=14, gap=12)

    s = d.slide()
    d.head(s, "Where it stands", "Status on " + AS_OF + ".")
    d.box(s, M, 2.05, W - 2 * M, 1.5, fill=C["SOFT"])
    d.box(s, M, 2.05, 0.08, 1.5, fill=acc, radius=False)
    d.text(s, pj["status"], M + 0.35, 2.25, W - 2 * M - 0.6, 1.2, size=14, color=C["NAVY"])
    d.text(s, "Live data Company OS can show for this project", M, 3.9, 8, 0.3, size=10, bold=True, color=C["STEEL"])
    d.bullets(s, pj["live"], M, 4.25, W - 2 * M, 2.4, size=12.5, gap=8)

    s = d.slide()
    d.head(s, "Timeline", "December 2026 to August 2027.", "Milestones from the Company OS Master Timeline (TL- numbers) and the website.")
    rows = [["Date", "Milestone", "Source"]] + [[fmt(dt), lab, SRC.get(src.split()[0], src)] for dt, lab, src in pj["milestones"]]
    rh = min(0.42, 4.6 / len(rows))
    d.table(s, rows, M, 2.05, W - 2 * M, [1.6, 8.3, 2.23], rowh=rh, size=9.5 if len(rows) > 10 else 11)

    s = d.slide()
    d.head(s, "What it takes to run", "Key operational requirements.")
    half = (len(pj["ops"]) + 1) // 2
    for col, items in enumerate([pj["ops"][:half], pj["ops"][half:]]):
        y = 2.1
        for it in items:
            x = M + col * 6.15
            d.box(s, x, y, 5.95, 1.0, fill=C["SOFT"])
            d.box(s, x, y, 0.07, 1.0, fill=acc, radius=False)
            d.text(s, it, x + 0.3, y + 0.18, 5.45, 0.7, size=12, color=C["INK"], valign="m")
            y += 1.15

    s = d.slide()
    d.head(s, "Who does what", "Department and division involvement.", "Proposed from the job agreements, the Master Timeline and the published roles. Confirmed at the HQ Leaders meeting.")
    rows = [["Department", "Division", "Manager", "Role", "Contribution"]]
    for code in DIV_ORDER:
        if code in pj["divisions"]:
            role, txt = pj["divisions"][code]
            dv = DIVISIONS[code]
            rows.append([DEPARTMENTS[dv["dept"]]["name"].replace(" Department", ""), dv["name"], dv["manager"],
                         {"t": role, "fill": "FDF6CC" if role.startswith("Lead") else None}, txt])
    d.table(s, rows, M, 2.2, W - 2 * M, [1.5, 1.4, 1.2, 1.5, W - 2 * M - 5.6], rowh=0.6, size=10.5)

    s = d.slide()
    d.head(s, "Dependencies and risks", "What could hold us up.")
    for i, (lab, items) in enumerate([("Depends on", pj["dependencies"]), ("Risks and issues", pj["risks"])]):
        x = M + i * 6.15
        d.box(s, x, 2.05, 5.95, 4.6, fill=C["SOFT"])
        d.text(s, lab, x + 0.3, 2.25, 5, 0.35, size=15, bold=True, color=C["NAVY"])
        d.bullets(s, items, x + 0.3, 2.75, 5.4, 3.8, size=12, gap=8)

    s = d.slide()
    d.head(s, "KPIs and data", "What we measure.", "KPI IDs are from the Company OS KPI Dictionary. No numerical target applies until a founder sets one in writing.")
    d.bullets(s, pj["kpis"], M, 2.2, W - 2 * M, 4.3, size=14, gap=10)

    s = d.slide()
    d.head(s, "Immediate priorities", "The next four weeks.")
    for i, it in enumerate(pj["next"]):
        y = 2.1 + i * 1.12
        d.text(s, f"{i + 1}", M, y, 0.6, 0.8, size=30, font="EB Garamond", color=acc)
        d.box(s, M + 0.7, y, W - 2 * M - 0.7, 0.95, fill=C["SOFT"])
        d.text(s, it, M + 1.0, y + 0.15, W - 2 * M - 1.3, 0.7, size=14, color=C["NAVY"], bold=True, valign="m")

    s = d.slide()
    d.head(s, "Still to be confirmed", "Questions we need answered.", "Bring answers to your department discussion or log them as decisions in Company OS.")
    y = 2.15
    for it in pj["tbc"]:
        d.tbc(s, M, y + 0.04, "TBC")
        d.text(s, it, M + 0.75, y, W - 2 * M - 0.8, 0.45, size=13, color=C["INK"])
        y += 0.62

    s = d.slide(dark=True)
    d.head(s, "Where to find it", "In Company OS.", dark=True)
    links = [("Project dashboard", f"os.ielsco.com/os/portfolio/{pj['key']}"), ("Tasks for this project", "os.ielsco.com/os/tasks → filter Project"),
             ("Guides and SOPs", "os.ielsco.com/os/handbook"), ("Your division workspace", "os.ielsco.com/os/d/<code>")]
    if pj["key"] == "gif":
        links.insert(1, ("GIF programme register", "os.ielsco.com/os/gif (facts, decisions, risks, budget)"))
    for i, (lab, url) in enumerate(links):
        d.text(s, lab, M, 2.05 + i * 0.85, 4.5, 0.4, size=16, bold=True, color=C["WHITE"])
        d.text(s, url, M + 4.6, 2.08 + i * 0.85, 7.5, 0.4, size=14, color=C["BUTTER"])
    fname = f"{title.replace(' ', '-')}-Project-Overview-and-Team-Learning.pptx"
    return d.save(os.path.join(OUT, fname))


if __name__ == "__main__":
    for pj in PROJECTS:
        print(build(pj))
