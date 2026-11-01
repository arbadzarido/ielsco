# Run from public/images:  python ../../scripts/tone-photos.py   (needs Pillow). Writes public/images/site/*.webp.
# IELSco photography treatment (one place to change it): documentary monochrome with a subtle brand duotone
# (navy #1A2534 shadows -> warm white #FBF8F4 highlights), gentle contrast, max 1600px, WebP q78.
# Most of the authentic archive is already black-and-white; toning every photo the same way makes them read as one set.
from PIL import Image, ImageEnhance, ImageOps
JOBS = {
  "contents/careers/iels_team_0.png": "community-in-person.webp",
  "contents/careers/iels_team_1.png": "team-campus-visit.webp",
  "contents/general/iels_global_gateway.png": "online-session.webp",
  "contents/careers/iels_team_2.png": "online-cohort.webp",
  "contents/general/iels_gathering.png": "gathering.webp",
  "contents/careers/iels_team_3.png": "team-portrait.webp",
  "contents/general/landing_page_1.png": "speaker.webp",
  "contents/general/landing_page_2.png": "discussion.webp",
  # IELS Circle meetups (circle.ielsco.com community moments), used on /careers.
  "people/circle/iels-thailand.png": "circle-bangkok.webp",
  "people/circle/iels-malaysia.png": "circle-kuala-lumpur.webp",
  "people/circle/iels-cambodia.png": "circle-phnom-penh.webp",
  "people/circle/iels-vietnam.png": "circle-ho-chi-minh.webp",
}
for src, out in JOBS.items():
    im = Image.open(src).convert("RGB")
    im.thumbnail((1600, 1600), Image.LANCZOS)
    g = ImageOps.autocontrast(im.convert("L"), cutoff=0.5)
    g = ImageEnhance.Contrast(g).enhance(1.04)
    toned = ImageOps.colorize(g, black="#1A2534", white="#FBF8F4", mid="#8E949B")
    toned.save("site/" + out, "WEBP", quality=78, method=6)
    print(out, toned.size)
