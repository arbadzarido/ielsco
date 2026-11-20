-- Activate the GIF Summer 2027 eligibility tasks (Reels 1–4, Story activation, Fellowship feedback, Letters to the Future).
-- Apply AFTER the code that knows about assignment tracks (PR with 20261124000000) is deployed; before that, the older UI
-- would count active eligibility tasks as Day 1–4 work. Idempotent.
update public.gif_assignments set is_active = true where edition = 'GIF 2026' and track = 'eligibility' and not is_active
  and slug in ('reels-1', 'reels-2', 'reels-3', 'reels-4', 'story-activation', 'fellowship-feedback', 'letters-to-the-future');
