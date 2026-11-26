# HQ decks and portfolio facts

`facts.py` is the single source for the HQ Leaders meeting deck, the four project learning decks and
`src/content/os/portfolio.json` (Company OS project dashboards and project guides).

```bash
pip install python-pptx pillow
python meeting.py && python project.py      # writes the .pptx next to this folder's parent (../)
# copy the decks to src/content/os/files/ (names in src/app/os/api/files/[key]/route.ts)
```
`python export_json.py` rewrites src/content/os/portfolio.json.
`render.ps1` exports slides to PNG through PowerPoint for a visual check (Windows).
