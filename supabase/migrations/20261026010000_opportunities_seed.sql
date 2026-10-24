-- Starter opportunity board (2026-10-26). Well-known, long-running programs with their OFFICIAL pages only.
-- Deliberately no deadlines and no detailed eligibility: those change every cycle, and nothing here was confirmed for
-- the current cycle. Each row says "check the official page" until staff verify the current call and fill in
-- deadline / eligibility / documents and set verification = 'verified' (Dashboard → Admin → Opportunities).
-- verification 'link_checked' = the official URL answered on checked_on; it says nothing about dates.
-- Chevening is 'unverified': its site blocks automated checks (it opened in a browser during the 2026-10-17 audit).
insert into public.opportunities
  (slug, title, organizer, category, summary, regions, open_to, study_level, funding, deadline_note, official_url, verification, checked_on, status, featured, is_iels_program)
values
  ('gif-singapore', 'Global Impact Fellowship (GIF) Singapore', 'IELSco', 'fellowship',
   'IELSco''s own leadership and project-incubation program: a 4-day, 3-night boot camp at the National University of Singapore for youth from across Southeast Asia. Self-funded.',
   '{SG}', 'Youth across Southeast Asia', 'non_degree', 'self_funded', 'Batch 2 registration closed on 21 September 2026. The next batch will be announced on the GIF page.',
   'https://ielsco.com/events/gif', 'verified', '2026-10-26', 'published', true, true),
  ('chevening-scholarships', 'Chevening Scholarships', 'UK Government (FCDO)', 'scholarship',
   'The UK government''s global scholarship program for one-year master''s degrees at UK universities, for people with leadership potential.',
   '{GB}', 'Citizens of Chevening-eligible countries', 'masters', 'fully_funded', 'Dates change every cycle: check the official page.',
   'https://www.chevening.org/scholarships/', 'unverified', null, 'published', true, false),
  ('australia-awards-indonesia', 'Australia Awards Scholarships (Indonesia)', 'Australian Government', 'scholarship',
   'Long-term awards for Indonesians to study a master''s or doctoral degree at an Australian university.',
   '{AU}', 'Indonesian citizens', 'masters', 'fully_funded', 'Dates change every cycle: check the official page.',
   'https://www.australiaawardsindonesia.org/', 'link_checked', '2026-10-25', 'published', true, false),
  ('erasmus-mundus-joint-masters', 'Erasmus Mundus Joint Masters scholarships', 'European Commission (EACEA)', 'scholarship',
   'Joint master''s programs run by university consortia in several European countries. Each program selects its own scholarship holders.',
   '{multiple}', 'Students worldwide (rules differ by program)', 'masters', 'fully_funded', 'Each program has its own deadline, often between October and January.',
   'https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en', 'link_checked', '2026-10-25', 'published', true, false),
  ('daad-scholarships', 'DAAD scholarships for study and research in Germany', 'DAAD (German Academic Exchange Service)', 'scholarship',
   'DAAD''s scholarship database lists funding for master''s, doctoral and research stays in Germany by country of origin and field.',
   '{DE}', 'Depends on the scholarship', 'any', 'unknown', 'Search the database for your country and field; each listing has its own dates.',
   'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/', 'link_checked', '2026-10-25', 'published', false, false),
  ('fulbright-indonesia', 'Fulbright scholarships for Indonesians', 'AMINEF (American Indonesian Exchange Foundation)', 'scholarship',
   'Fulbright programs for Indonesians to study or research in the United States, administered by AMINEF.',
   '{US}', 'Indonesian citizens', 'masters', 'fully_funded', 'Dates change every cycle: check the official page.',
   'https://www.aminef.or.id/', 'link_checked', '2026-10-25', 'published', false, false),
  ('lpdp', 'LPDP scholarships', 'LPDP (Indonesian Endowment Fund for Education)', 'scholarship',
   'Indonesian government scholarships for master''s and doctoral study in Indonesia and abroad.',
   '{multiple}', 'Indonesian citizens', 'masters', 'fully_funded', 'Registration opens in batches: check the official page.',
   'https://lpdp.kemenkeu.go.id/', 'link_checked', '2026-10-25', 'published', true, false),
  ('mext-japan', 'Japanese Government (MEXT) Scholarship', 'Government of Japan (MEXT)', 'scholarship',
   'Scholarships for international students to study at Japanese universities, applied for through Japanese embassies or universities.',
   '{JP}', 'Citizens of countries with diplomatic relations with Japan', 'any', 'fully_funded', 'Embassy-track dates differ by country: check the official page and your local Japanese embassy.',
   'https://www.studyinjapan.go.jp/en/', 'link_checked', '2026-10-25', 'published', false, false),
  ('global-korea-scholarship', 'Global Korea Scholarship (GKS)', 'Government of Korea (NIIED)', 'scholarship',
   'Korean government scholarships for international students in undergraduate and graduate programs in Korea.',
   '{KR}', 'International students (quotas by country)', 'any', 'fully_funded', 'Dates change every cycle: check the official page.',
   'https://www.studyinkorea.go.kr/', 'link_checked', '2026-10-25', 'published', false, false),
  ('yseali', 'Young Southeast Asian Leaders Initiative (YSEALI)', 'U.S. Department of State', 'fellowship',
   'U.S. government initiative for young leaders in Southeast Asia, with exchanges, workshops, seed grants and an online network.',
   '{multiple}', 'Southeast Asian youth (age limits per program)', 'non_degree', 'unknown', 'Each YSEALI program opens separately: check the official page.',
   'https://asean.usmission.gov/yseali/', 'link_checked', '2026-10-25', 'published', true, false),
  ('stipendium-hungaricum', 'Stipendium Hungaricum', 'Tempus Public Foundation (Hungary)', 'scholarship',
   'Hungarian government scholarships for bachelor''s, master''s and doctoral study in Hungary for students from partner countries.',
   '{HU}', 'Citizens of partner countries', 'any', 'fully_funded', 'Dates change every cycle: check the official page.',
   'https://stipendiumhungaricum.hu/', 'link_checked', '2026-10-25', 'published', false, false),
  ('manaaki-new-zealand', 'Manaaki New Zealand Scholarships', 'New Zealand Ministry of Foreign Affairs and Trade', 'scholarship',
   'New Zealand government scholarships for study in New Zealand and short-term training, for citizens of eligible countries.',
   '{NZ}', 'Citizens of eligible countries', 'any', 'fully_funded', 'Dates change every cycle: check the official page.',
   'https://www.nzscholarships.govt.nz/', 'link_checked', '2026-10-25', 'published', false, false)
on conflict (slug) do nothing;

-- GIF Batch 2's registration deadline is confirmed on the IELSco site (src/data/gif.ts).
update public.opportunities set deadline = '2026-09-21' where slug = 'gif-singapore' and deadline is null;
