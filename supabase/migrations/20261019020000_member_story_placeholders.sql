-- 15 internal editorial placeholders for under-represented countries (idempotent, matched by slug). They carry a
-- target country, a topic direction, interview questions and media/consent requirements only: no names, quotes or
-- photos of real people. kind = 'placeholder' can never be published (check constraint + trigger in
-- 20261019000000_member_stories.sql) and never appears in the public view. To feature a real member, an editor
-- creates a new story (or uses a submission) and archives the placeholder.
with briefs (slug, country, title, story_type, topic) as (values
  ('placeholder-my-1', 'MY', 'Malaysia: studying in English at a Malaysian or international campus', 'study_abroad',
   'A student in Malaysia whose degree is taught in English: adjusting to academic English, presentations and group work with classmates from many countries.'),
  ('placeholder-my-2', 'MY', 'Malaysia: a first job or internship in a multilingual workplace', 'career',
   'A young professional in Malaysia switching between Malay, English and other languages at work, and what English opened up for their career.'),
  ('placeholder-th-1', 'TH', 'Thailand: from shy speaker to presenting in English', 'community',
   'A Thai learner who built speaking confidence through a club, community or online sessions, and the moment it clicked.'),
  ('placeholder-th-2', 'TH', 'Thailand: an exchange or summer program abroad', 'exchange',
   'A Thai student on an exchange, summer school or short program in another country: preparation, surprises and what changed.'),
  ('placeholder-kh-1', 'KH', 'Cambodia: volunteering and community projects', 'volunteering',
   'A young Cambodian leading or joining a volunteer or community project, working with international partners in English.'),
  ('placeholder-kh-2', 'KH', 'Cambodia: scholarship journey', 'study_abroad',
   'A Cambodian student who applied for a scholarship (in Cambodia or abroad): the application, interviews in English and the result, whatever it was.'),
  ('placeholder-vn-1', 'VN', 'Vietnam: building a tech or creative career with English', 'career',
   'A Vietnamese developer, designer or creator working with international clients or teams: documentation, meetings and online learning in English.'),
  ('placeholder-vn-2', 'VN', 'Vietnam: preparing for study abroad', 'study_abroad',
   'A Vietnamese student preparing for or starting study abroad: tests, applications and the first weeks in a new country.'),
  ('placeholder-vn-3', 'VN', 'Vietnam: starting a small business or student startup', 'entrepreneurship',
   'A young Vietnamese founder or side-project builder: customers, pitching, competitions or partners where English mattered.'),
  ('placeholder-ph-1', 'PH', 'Philippines: teaching or tutoring English across Southeast Asia', 'career',
   'A Filipino tutor or teacher who works with learners from other SEA countries: what they learned about learners and cultures.'),
  ('placeholder-ph-2', 'PH', 'Philippines: a student leader in a regional program', 'international_program',
   'A Filipino student who joined a regional youth program, conference or delegation and worked with peers from across ASEAN.'),
  ('placeholder-mm-1', 'MM', 'Myanmar: continuing education against the odds', 'study_abroad',
   'A young person from Myanmar who kept learning through online courses, community classes or study abroad. Handle safety and privacy with extra care.'),
  ('placeholder-mm-2', 'MM', 'Myanmar: finding community online', 'community',
   'A learner from Myanmar who found practice partners, mentors or friends through online communities.'),
  ('placeholder-la-1', 'LA', 'Laos: first international experience', 'exchange',
   'A Lao student or young professional on their first trip, exchange or regional event abroad: expectations versus reality.'),
  ('placeholder-la-2', 'LA', 'Laos: learning English outside the classroom', 'community',
   'A Lao learner who improved through self-study, media, volunteering or community sessions, and what they would tell others starting out.')
)
insert into public.member_stories (kind, status, slug, title, category, story_type, author_name, target_country, editorial_brief, issues)
select 'placeholder', 'draft', b.slug, '[Placeholder] ' || b.title, 'circle', b.story_type, '', b.country,
  jsonb_build_object(
    'topic_direction', b.topic,
    'interview_questions', jsonb_build_array(
      'Who are you, where are you from, and what do you do or study now?',
      'Where were you before this journey, and what did you want to change?',
      'What was the hardest part, and how did you deal with it?',
      'Where did English come in? Describe one specific moment.',
      'What was the turning point?',
      'What is different for you now?',
      'What would you tell a young person in Southeast Asia starting the same path?'),
    'media_requirements', jsonb_build_array(
      'A clear, recent photo of the member (for the avatar), supplied by the member',
      '1 landscape photo for the banner (at least 1600 px wide)',
      '2 to 6 photos from the journey, with a short caption for each, supplied by the member',
      'JPEG, PNG or WebP, up to 8 MB each; no photos of other people without their permission'),
    'consent_requirements', jsonb_build_array(
      'Written consent to publish the story on circle.ielsco.com',
      'Separate consent to show name, role, country and photos',
      'Separate opt-in if the member is happy to be contacted about an Instagram feature',
      'Corrections and withdrawal: support@ielsco.com')),
  '["Editorial placeholder: no member, quotes or photos yet. Never publishable."]'::jsonb
from briefs b
on conflict do nothing;
