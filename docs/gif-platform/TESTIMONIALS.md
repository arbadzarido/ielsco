# GIF 2026 testimonials: collection kit (internal)

Status: **three slots prepared, none published.** The site shows a "delegate stories will appear here" notice until a
slot is set to `status: "approved"` in Admin → Content → Testimonials. The admin refuses `approved` unless the entry has
the real quote, `consent: true` and a `consent_reference` (where the signed consent is kept).

| Slot | Participant | Quote | Written consent | Published |
|---|---|---|---|---|
| 1 | GIF 2026 participant 1 (to be named) | pending | pending | no |
| 2 | GIF 2026 participant 2 (to be named) | pending | pending | no |
| 3 | GIF 2026 participant 3 (to be named) | pending | pending | no |

## 1. How to collect (10 minutes per person)

1. Send the questions below by WhatsApp or have a short voice/video call. Voice notes are fine: they sound most natural.
2. Transcribe their words. You may cut and reorder sentences, fix spelling, and translate from Indonesian, but **do not add
   ideas, facts or feelings they didn't say**. Keep their slang and energy.
3. Send them the final quote and ask them to reply "Saya setuju" / "I agree" to: *"IELSco may publish this quote with my
   first name, school/university and photo on gif.ielsco.com and IELSco social media. I can withdraw this at any time."*
   For anyone under 18, the parent/guardian replies too.
4. Save the approval screenshot in the GIF Drive folder; that path is the `consent_reference`.
5. Enter in Admin → Content: `{ "quote": "...", "name": "First name", "role": "GIF 2026 delegate, <school>", "consent": true, "status": "approved", "consent_reference": "Drive/GIF/Testimonials/<name>.png" }`.

## 2. Questions (pick 4–5; ask for stories, not adjectives)

- What was going through your head the night before you flew to Singapore?
- What's one moment from the four days you keep telling your friends about?
- Was there a moment you felt completely out of your comfort zone? What happened?
- What did your team argue about, and how did you sort it out?
- What changed in your project idea between Day 1 and the awarding?
- Who did you meet that you're still in touch with? Why them?
- If a friend asked "is GIF worth it?", what would you honestly say?
- What would you tell yourself before applying?

Follow-ups that unlock detail: *"What did that look like?"*, *"What did you say then?"*, *"How did that feel, honestly?"*

## 3. Shapes that read naturally

- **Moment → feeling → change**: one specific scene, how it felt, what's different now.
- **Before → after**: what they expected vs. what actually happened.
- **The honest one**: a doubt or fear, then why they're glad they went.

Length: 25–60 words. One idea per quote. First person. Keep "literally", "lowkey", "jujur", "gila", exclamation marks if they used them.

## 4. Tone samples — INTERNAL ONLY, NOT REAL QUOTES, NEVER PUBLISH

These are invented to show the target tone to the person collecting quotes. They describe no real person or event.

> [SAMPLE — NOT A REAL TESTIMONIAL] "Okay so the first night I honestly thought I'd made a mistake, everyone seemed so
> confident. By the last day my team was finishing each other's sentences during the pitch. I still can't believe that was us."

> [SAMPLE — NOT A REAL TESTIMONIAL] "Jujur aku kira bakal kayak study tour biasa. Ternyata tiap hari kita bongkar ide
> project sampai malam, dan aku pulang dengan rencana yang beneran bisa dijalanin."

> [SAMPLE — NOT A REAL TESTIMONIAL] "My favourite moment wasn't even on the schedule — it was arguing about our problem
> statement on the MRT and realising we'd been solving the wrong thing."

Avoid: "life-changing experience", "unforgettable journey", "broadened my horizons", "I highly recommend" — generic phrases
that sound written by a marketer, not a student.

## 5. Mentor profiles

Publish only confirmed mentors: name, photo (file in `apps/gif/public/photos/`), role, organisation and a short bio, each
approved by the mentor. Until then the site shows five "Mentor profile coming soon" placeholders.
