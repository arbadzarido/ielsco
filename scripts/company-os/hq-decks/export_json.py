"""Writes src/content/os/portfolio.json from facts.py (run from this folder)."""
import json, os
import facts

out = dict(asOf=facts.AS_OF, projects=[dict(p) for p in facts.PROJECTS], divisions=facts.DIVISIONS, commonKpis=facts.COMMON_KPIS,
           recruitment=dict(facts.RECRUITMENT, roles=[dict(id=r[0], title=r[1], scope=r[2], places=r[3], published=r[4], proposed=r[5], firstChoice=r[6]) for r in facts.ROLES]))
for p in out["projects"]:
    p["divisions"] = {k: {"role": v[0], "contribution": v[1]} for k, v in p["divisions"].items()}
    p["milestones"] = [{"date": d, "label": l, "source": s} for d, l, s in p["milestones"]]
    p["recruitment"] = None
dest = os.path.join(os.path.dirname(__file__), "..", "..", "..", "src", "content", "os", "portfolio.json")
open(dest, "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=1))
print(dest)
