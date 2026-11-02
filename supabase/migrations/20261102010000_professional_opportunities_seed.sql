-- Initial professional listings (2026-11-02): the Albania pilot with PT Ficotama Bina Trampil.
-- Sources, and nothing else: the partner's "Infografis Albania" PDF and its five recruitment posters (Hospitality,
-- Agriculture, Textile/Penjahit, Poultry Farm, Construction). Where the sources disagree (construction and poultry pay,
-- whether accommodation applies to every role) the listing says so in salary_note / confirm_notes and asks people to
-- confirm with the partner instead of picking one figure. Responsibilities are left empty where the material lists none.
-- `on conflict do nothing` keeps staff edits if this ever runs again.

insert into public.recruitment_partners (slug, name, short_name, website_url, email, whatsapp, phone, about)
values ('ficotama-bina-trampil', 'PT Ficotama Bina Trampil', 'FBT', 'https://www.ficotama.com/', 'pt_fbt@yahoo.com', '+6282125508988',
  '(021) 884 3037 / (021) 884 3038',
  'Indonesian overseas recruitment company that runs the recruitment, selection, placement procedures and employment contracts for these jobs. Its recruitment material asks candidates to send a CV and a 3x4 photo by WhatsApp or email.')
on conflict (slug) do nothing;

with p as (select id from public.recruitment_partners where slug = 'ficotama-bina-trampil'),
common as (
  select
    'Vlorë is a coastal city in southern Albania, in the Balkans. Capital: Tirana. Currency: Albanian lek (ALL). Climate: Mediterranean, with warm summers and cool winters.'::text as location_note,
    array['ID card (KTP)', 'Family card (KK)', 'Birth certificate', 'BPJS card', 'Passport', 'Diploma (ijazah)', 'Marriage book (if married)', 'Permission letter and heir letter (surat izin dan waris)']::text[] as documents,
    'Send your CV and a 3x4 photo to the partner by WhatsApp or email (as its recruitment posters ask), or contact it through its official channels below.'::text as how_to,
    'Partner''s Albania infographic and recruitment posters (received 2 November 2026).'::text as source
)
insert into public.professional_opportunities (slug, title, country_code, city, industry, positions, employment_type, summary, description,
  responsibilities, requirements, gender, age_min, age_max, experience, salary_min, salary_max, salary_currency, salary_period, salary_status,
  salary_note, benefits, working_hours, contract_duration, openings, location_note, documents, confirm_notes, partner_id,
  application_instructions, status, publication, featured, source_note)
select v.slug, v.title, 'AL', v.city, v.industry, v.positions, 'contract', v.summary, v.description, v.responsibilities, v.requirements, v.gender,
  20, 45, v.experience, v.salary_min, v.salary_max, v.salary_currency, 'month', v.salary_status, v.salary_note, v.benefits,
  '8 hours a day, 6 days a week', '2 years, renewable', v.openings, case when v.city is null then null else c.location_note end, c.documents, v.confirm_notes,
  p.id, c.how_to, 'open', 'published', v.featured, c.source
from p, common c, (values
  ('albania-sewing-operator', 'Sewing Operator', 'Vlorë', 'Textile & Garment', array['Sewing operator (seamstress)'],
   'Sewing-machine work in Albania''s textile and garment industry. The partner''s poster says it needs 150 people.',
   'Seamstress jobs in a textile and garment factory in Vlorë, Albania, recruited by PT Ficotama Bina Trampil.',
   array['Operate sewing machines in textile and garment production']::text[],
   array['Women aged 20 to 45', '1 to 2 years of experience operating sewing machines', 'Medically fit to work']::text[],
   'female', '1 to 2 years using sewing machines (seamstress)', 50000::numeric, 50000::numeric, 'ALL', 'stated', 'Net monthly salary listed in the partner''s infographic and poster.',
   array['Accommodation provided', 'Health insurance', 'Meal allowance of 5,000 ALL a month', 'Work equipment provided', 'Overtime pay available',
     'Salary review after the 90-day probation', 'Water, gas and electricity covered by the employer', 'Flight ticket home covered by the employer',
     '21 days of annual leave', 'Official work permit for 1 year, renewable']::text[],
   150, '{}'::text[], true),

  ('albania-agriculture-worker', 'Agriculture Worker', 'Vlorë', 'Agriculture', array['Agriculture worker'],
   'Farm work in Albania for men and women with agricultural experience.',
   'Agriculture jobs in Vlorë, Albania, recruited by PT Ficotama Bina Trampil.',
   '{}'::text[],
   array['Men or women aged 20 to 45', 'Experience in agriculture', 'Medically fit to work']::text[],
   'any', 'Relevant agricultural experience', 50000, 50000, 'ALL', 'stated', 'Net monthly salary listed in the partner''s infographic and poster.',
   array['Health insurance', 'Meal allowance of 5,000 ALL a month', 'Work equipment provided', 'Overtime pay available',
     'Salary review after the 90-day probation', 'Water, gas and electricity covered by the employer', 'Flight ticket home covered by the employer',
     '21 days of annual leave', 'Official work permit for 1 year, renewable']::text[],
   null::int, array['Accommodation: the agriculture poster does not mention it, while the partner''s Albania infographic lists free accommodation for workers. Ask the partner whether it applies to this role.']::text[], true),

  ('albania-construction-worker', 'Construction Worker', 'Vlorë', 'Construction',
   array['Tiler', 'Glass cutter and aluminium frame installer', 'Shuttering carpenter', 'Construction worker', 'Heavy equipment operator', 'Excavator and bulldozer operator', 'Mechanic'],
   'Skilled construction jobs in Albania, from tiling and shuttering carpentry to heavy-equipment operation.',
   'Construction jobs in Vlorë, Albania, recruited by PT Ficotama Bina Trampil. The partner lists several trades under this listing.',
   '{}'::text[],
   array['Men aged 20 to 45', 'Experience in the trade you apply for', 'Medically fit to work']::text[],
   'male', 'Relevant construction experience in the trade', 70000, 80000, 'ALL', 'to_confirm',
   'The partner''s infographic lists 70,000 ALL net a month; its construction poster lists 80,000 ALL. Confirm the figure for your trade with the partner.',
   array['Health insurance', 'Meal allowance of 10,000 ALL a month', 'Work equipment provided', 'Overtime pay available',
     'Salary review after the 90-day probation', 'Water, gas and electricity covered by the employer', 'Flight ticket home covered by the employer',
     '21 days of annual leave', 'Official work permit for 1 year, renewable']::text[],
   null, array['Salary: 70,000 ALL (infographic) or 80,000 ALL (poster).', 'Accommodation: the construction poster does not mention it, while the partner''s Albania infographic lists free accommodation for workers. Ask the partner whether it applies to this role.']::text[], true),

  ('albania-hotel-cleaner', 'Hotel Cleaner', 'Vlorë', 'Hospitality & Tourism', array['Hotel cleaner'],
   'Housekeeping and cleaning work in Albania''s hospitality sector.',
   'Hotel cleaning jobs in Vlorë, Albania, recruited by PT Ficotama Bina Trampil.',
   '{}'::text[],
   array['Men or women aged 20 to 45', 'Experience in hospitality or cleaning', 'Medically fit to work']::text[],
   'any', 'Relevant hospitality experience', 50000, 50000, 'ALL', 'stated', 'Net monthly salary listed in the partner''s infographic.',
   array['Accommodation provided', 'Health insurance', 'Meal allowance of 5,000 ALL a month', 'Overtime pay available', 'Work equipment provided',
     'Salary review after the 90-day probation', 'Water, gas and electricity covered by the employer', 'Flight ticket home covered by the employer',
     '21 days of annual leave', 'Official work permit for 1 year, renewable']::text[],
   null, '{}'::text[], true),

  ('albania-waiter-waitress', 'Waiter / Waitress', null, 'Hospitality & Tourism', array['Waiter', 'Waitress'],
   'Restaurant and hotel service roles in Albania''s hospitality sector.',
   'Waiting jobs in Albania listed on the partner''s hospitality poster. The work city and full terms are not stated there.',
   '{}'::text[],
   array['Men or women aged 20 to 45', 'Experience in food and beverage service']::text[],
   'any', 'Relevant hospitality experience', 50000, null, 'ALL', 'to_confirm',
   'The hospitality poster lists a minimum of 50,000 ALL a month for cooks, waiters and general workers. Confirm the figure for this role with the partner.',
   array['Health insurance', 'Meal allowance of 5,000 ALL a month', 'Work equipment provided', 'Overtime pay available', 'Salary review after the 90-day probation']::text[],
   null, array['The hospitality poster doesn''t state the work city or accommodation for this role. The 2-year contract and working hours come from the partner''s general Albania infographic. Confirm all terms with the partner.']::text[], false),

  ('albania-cook', 'Cook', null, 'Hospitality & Tourism', array['Cook'],
   'Kitchen roles in Albania''s hospitality sector.',
   'Cook jobs in Albania listed on the partner''s hospitality poster. The work city and full terms are not stated there.',
   '{}'::text[],
   array['Men or women aged 20 to 45', 'Experience working as a cook']::text[],
   'any', 'Relevant kitchen experience', 50000, null, 'ALL', 'to_confirm',
   'The hospitality poster lists a minimum of 50,000 ALL a month for cooks, waiters and general workers. Confirm the figure for this role with the partner.',
   array['Health insurance', 'Meal allowance of 5,000 ALL a month', 'Work equipment provided', 'Overtime pay available', 'Salary review after the 90-day probation']::text[],
   null, array['Salary, work city and accommodation for this role need the partner''s confirmation. The 2-year contract and working hours come from the partner''s general Albania infographic.']::text[], false),

  ('albania-hospitality-general-worker', 'General Worker (Hospitality)', null, 'Hospitality & Tourism', array['General worker'],
   'General support roles in Albania''s hospitality sector.',
   'General worker jobs in Albania listed on the partner''s hospitality poster. The work city and full terms are not stated there.',
   '{}'::text[],
   array['Men or women aged 20 to 45', 'Experience in hospitality work']::text[],
   'any', 'Relevant hospitality experience', 50000, null, 'ALL', 'to_confirm',
   'The hospitality poster lists a minimum of 50,000 ALL a month for cooks, waiters and general workers. Confirm the figure for this role with the partner.',
   array['Health insurance', 'Meal allowance of 5,000 ALL a month', 'Work equipment provided', 'Overtime pay available', 'Salary review after the 90-day probation']::text[],
   null, array['Salary, duties, work city and accommodation for this role need the partner''s confirmation. The 2-year contract and working hours come from the partner''s general Albania infographic.']::text[], false),

  ('albania-poultry-worker', 'Poultry Worker', 'Vlorë', 'Poultry & Livestock',
   array['Veterinarian', 'Chicken processing worker', 'Poultry feed operator', 'General farm worker'],
   'Poultry farm jobs in Albania, from veterinary work to processing and feed operation.',
   'Poultry farm jobs in Vlorë, Albania, recruited by PT Ficotama Bina Trampil. The partner lists several roles under this listing.',
   '{}'::text[],
   array['Men or women aged 20 to 45', 'Experience in poultry or livestock work (a veterinary qualification for the veterinarian role)', 'Medically fit to work']::text[],
   'any', 'Relevant poultry or livestock experience', 70000, null, 'ALL', 'to_confirm',
   'The partner''s infographic lists 70,000 ALL net a month; its poultry farm poster lists 800 EUR a month. Confirm the figure for your role with the partner.',
   array['Accommodation provided', 'Health insurance', 'Meal allowance of 5,000 ALL a month', 'Work equipment provided', 'Overtime pay available',
     'Water, gas and electricity covered by the employer', 'Flight ticket home covered by the employer', '21 days of annual leave',
     'Official work permit for 1 year, renewable']::text[],
   null, array['Salary: 70,000 ALL (infographic) or 800 EUR (poster).', 'The poultry poster does not mention a salary review after probation.']::text[], true)
) as v(slug, title, city, industry, positions, summary, description, responsibilities, requirements, gender, experience, salary_min, salary_max,
       salary_currency, salary_status, salary_note, benefits, openings, confirm_notes, featured)
on conflict (slug) do nothing;
