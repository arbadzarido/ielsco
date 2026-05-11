// src/data/courses.ts

export type MentorId = "arba" | "dhila" | "hana";
export type CourseTrack = "grammar" | "standardized-test" | "speaking" | "work-abroad" | "writing" | "scholarship-essay";
export type PackageType = "intensive" | "extensive" | "custom";

export interface Mentor {
  id: MentorId;
  name: string;
  role: string;
  image: string;
  instagram: string;
  linkedin: string;
  highlights: { emoji: string; text: string }[];
  tracks: CourseTrack[];
  tagline: string;
}

export interface CurriculumSession {
  session: number;
  title: string;
  objectives: string[];
  activities: string[];
  materials: string;
}

export interface CoursePackage {
  id: string;
  name: string;
  type: PackageType;
  sessions: number;
  mentorId: MentorId;
  trackId: CourseTrack;
  pricePerSession: number;
  loungeAccess: boolean;
  loungeValue: number;
  totalPrice: number;
  description: string;
  outcomes: string[];
  curriculum: CurriculumSession[];
  level: string;
  badge: string;
}

// ─── MENTORS ─────────────────────────────────────────────────────────────────

export const MENTORS: Mentor[] = [
  {
    id: "arba",
    name: "Arbadza Rido",
    role: "Principal of Operations & Business",
    image: "/images/people/directors/arba.png",
    instagram: "https://instagram.com/arbadzarido",
    linkedin: "https://linkedin.com/in/arbadzarido",
    highlights: [
      { emoji: "🏫", text: "EFL & ESL Teacher, 3+ years across Southeast Asia" },
      { emoji: "📋", text: "TEFL & TESL Certified — Arizona State University" },
      { emoji: "🏢", text: "Project Manager, Pertamina Training & Consulting" },
      { emoji: "🎯", text: "IELTS Band 8.0 · TOEFL iBT 110+" },
    ],
    tracks: ["grammar", "standardized-test"],
    tagline: "Grammar & Test Prep",
  },
  {
    id: "dhila",
    name: "Fadhila Qurotul Aini",
    role: "Principal of Growth & Finance",
    image: "/images/people/directors/dhila2.png",
    instagram: "https://www.instagram.com/fadhilaqa._/",
    linkedin: "https://linkedin.com/in/fadhilaqa/",
    highlights: [
      { emoji: "🌏", text: "International ops & outreach across global networks" },
      { emoji: "💼", text: "Marketing & Ops Intern, IFAAS — 7 months remote" },
      { emoji: "🗣️", text: "Cross-cultural English communication specialist" },
      { emoji: "📄", text: "TOEIC 905 · C1 Professional English" },
    ],
    tracks: ["speaking", "work-abroad"],
    tagline: "Speaking & Professional English",
  },
];

// ─── PRICING ─────────────────────────────────────────────────────────────────

export const PRICE_PER_SESSION = 90000;
export const LOUNGE_VALUE = 200000;

// ─── CURRICULUM: GRAMMAR ─────────────────────────────────────────────────────

const grammarIntensive: CurriculumSession[] = [
  { session: 1, title: "Diagnostic & Foundations — Tenses & Sentence Structure", objectives: ["Identify personal grammar gaps via placement test", "Master present, past, and future tense distinctions", "Understand simple vs. compound vs. complex sentences"], activities: ["Placement mini-test (15 min)", "Error analysis of 10 self-written sentences", "Tense transformation drills"], materials: "IELS Grammar Starter Kit PDF + Error Log Template" },
  { session: 2, title: "The Perfect Tenses — Present, Past & Future Perfect", objectives: ["Differentiate simple vs. perfect tenses in context", "Use perfect tenses in professional emails and reports", "Avoid common Indonesian speaker errors"], activities: ["Timeline visualization exercise", "Email rewrite challenge", "Partner grammar check"], materials: "Perfect Tense Cheat Sheet PDF" },
  { session: 3, title: "Conditionals — Zero to Third & Mixed", objectives: ["Use all conditional types accurately", "Apply conditionals in business and academic writing", "Understand subjunctive mood basics"], activities: ["Conditional gap-fill in business scenarios", "Story-building with conditionals", "Common errors quiz"], materials: "Conditional Quick Reference Card" },
  { session: 4, title: "Passive Voice & Formal Register", objectives: ["Know when and why to use passive voice", "Transform active sentences to formal passive", "Identify passive overuse"], activities: ["News article analysis", "Report writing simulation", "Register comparison exercise"], materials: "Academic & Business Register Guide PDF" },
  { session: 5, title: "Articles, Determiners & Noun Phrases", objectives: ["Master a/an/the usage rules for Indonesian speakers", "Understand countable vs. uncountable distinctions", "Build complex noun phrases confidently"], activities: ["Article-deletion exercise", "Gap-fill in formal writing samples", "Personalized error drill"], materials: "Article Mastery Worksheet" },
  { session: 6, title: "Prepositions & Collocations", objectives: ["Memorize the top 50 most misused prepositions", "Learn verb-preposition and adjective-preposition collocations", "Build collocation awareness in reading"], activities: ["Collocation matching game", "Preposition bingo (spoken)", "Short paragraph writing with target collocations"], materials: "IELS Top 100 Collocations List PDF" },
  { session: 7, title: "Relative Clauses & Sentence Complexity", objectives: ["Use defining and non-defining relative clauses", "Embed relative clauses in academic writing", "Avoid dangling and misplaced modifiers"], activities: ["Sentence combining tasks", "Editing a paragraph for clause complexity", "Mock IELTS Writing Task 1 sentence analysis"], materials: "Advanced Sentence Structures Worksheet" },
  { session: 8, title: "Final Review, Applied Test & Certificate", objectives: ["Consolidate all grammar areas", "Apply grammar in timed writing tasks", "Reflect on personal progress since Session 1"], activities: ["Post-test (grammar mastery assessment)", "Final writing task review and peer feedback", "Personal error log review and goal-setting"], materials: "Post-Test + Progress Report + IELS Certificate" },
];

const grammarExtensive: CurriculumSession[] = [
  ...grammarIntensive.slice(0, 7),
  { session: 8, title: "Modal Verbs — Ability, Permission, Obligation & Probability", objectives: ["Distinguish modal verbs by meaning and formality", "Use modals in workplace communication", "Avoid common modal mistakes"], activities: ["Email tone analysis (should vs. must vs. might)", "Modal verb roleplay scenarios", "Correction drill"], materials: "Modal Verb Master Chart PDF" },
  { session: 9, title: "Reported Speech & Academic Citation Language", objectives: ["Convert direct speech to reported speech accurately", "Use reporting verbs for academic writing", "Quote and paraphrase professionally"], activities: ["News report transformation task", "Research paper phrase matching", "Short literature review draft"], materials: "Reporting Verbs & Academic Phrases Bank" },
  { session: 10, title: "Gerunds vs. Infinitives — When & Why", objectives: ["Know which verbs take gerunds, infinitives, or both", "Apply this in formal and informal writing", "Understand meaning changes"], activities: ["Error correction of 20 authentic sentences", "Gap-fill in professional writing", "Speed quiz"], materials: "Gerund & Infinitive Complete List PDF" },
  { session: 11, title: "Punctuation, Capitalization & Academic Conventions", objectives: ["Master comma, semicolon, and colon usage", "Apply capitalization in formal documents", "Format academic and business text properly"], activities: ["Unpunctuated paragraph exercise", "Email vs. essay punctuation comparison", "Style guide analysis"], materials: "IELS Punctuation & Style Guide" },
  { session: 12, title: "Coherence & Cohesion — Linking & Transitional Language", objectives: ["Use discourse markers to improve flow", "Organize paragraphs logically", "Avoid overusing 'furthermore' and 'however'"], activities: ["Scrambled paragraph reordering", "Transitional language audit", "Cohesion-building paragraph task"], materials: "Discourse Markers Reference Sheet" },
  { session: 13, title: "Word Formation — Prefixes, Suffixes & Derivation", objectives: ["Expand vocabulary through word families", "Use nominalizations in academic writing", "Understand register shifts through word choice"], activities: ["Word formation crossword", "Academic vocabulary transformation drill", "IELTS-style vocabulary task"], materials: "Word Formation & Academic Word List Workbook" },
  { session: 14, title: "Grammar in Context — Business, Academic & Digital Writing", objectives: ["Apply all grammar rules across different registers", "Adapt grammar choices to audience and purpose", "Identify grammar in real-world professional documents"], activities: ["Multi-genre writing comparison", "Editing a real LinkedIn post / business proposal", "Grammar audit of own writing sample"], materials: "Real-World Writing Samples Collection" },
  { session: 15, title: "Common Pitfalls for Indonesian Speakers — Deep Dive", objectives: ["Tackle L1 interference errors systematically", "Build metacognitive grammar awareness", "Create a personal error correction plan"], activities: ["Indonesian-English contrastive analysis", "Personalized error log review", "Partner error-spotting challenge"], materials: "Indonesian Speakers Error Guide PDF" },
  { session: 16, title: "Grammar for Standardized Tests — IELTS/TOEFL Overview", objectives: ["Understand how grammar is tested in IELTS/TOEFL", "Apply grammar to Writing Task 1 & 2 and TOEFL essays", "Score-focused grammar strategy"], activities: ["Scored writing samples analysis", "Grammar improvement editing task", "Q&A on test-specific grammar rules"], materials: "Test Grammar Checklist PDF" },
  { session: 17, title: "Editing & Proofreading Like a Professional", objectives: ["Build a systematic proofreading method", "Identify and fix errors in your own writing", "Use self-editing checklists"], activities: ["Timed editing challenge (1000-word document)", "Peer review swap", "Build personal proofreading checklist"], materials: "IELS Professional Editing Checklist" },
  { session: 18, title: "Mid-Program Review & Personalized Sprint", objectives: ["Identify remaining personal weak spots", "Target specific grammar areas for final push", "Celebrate progress and recalibrate goals"], activities: ["Mid-point assessment", "Personalized drill session based on errors", "Goal re-setting for final 3 sessions"], materials: "Mid-Point Report + Personalized Drill Packet" },
  { session: 19, title: "Applied Grammar — Writing a Professional Report", objectives: ["Apply all grammar in an extended writing task", "Structure and write a business or academic report", "Self-edit using all tools acquired"], activities: ["Timed report writing (30 min)", "Peer and mentor feedback", "Revision session"], materials: "Report Template + Evaluation Rubric" },
  { session: 20, title: "Applied Grammar — Verbal Communication & Grammar in Speaking", objectives: ["Transfer grammar awareness to spoken English", "Use correct tenses and structures when speaking", "Reduce spoken grammar errors in presentations"], activities: ["Grammar-monitored speaking task", "Error recording and playback reflection", "Spoken grammar correction drill"], materials: "Speaking Grammar Monitor Sheet" },
  { session: 21, title: "Final Assessment, Portfolio Review & Certification", objectives: ["Demonstrate mastery across all grammar domains", "Present a 'before vs. after' writing portfolio", "Earn IELS Grammar Certificate"], activities: ["Final grammar test", "Portfolio presentation (5 min)", "Certificate ceremony + IELS Lounge onboarding"], materials: "Final Test + Portfolio Rubric + IELS Certificate" },
];

// ─── CURRICULUM: STANDARDIZED TEST ───────────────────────────────────────────

const testPrepIntensive: CurriculumSession[] = [
  { session: 1, title: "Test Orientation — Format, Scoring & Strategy Blueprint", objectives: ["Understand your target test's format and scoring", "Identify strongest and weakest sections", "Build a score-maximization strategy"], activities: ["Diagnostic mini-test", "Score gap analysis", "Study plan creation"], materials: "Test Format Overview PDF + Study Plan Template" },
  { session: 2, title: "Reading Strategies — Speed, Scanning & Inference", objectives: ["Apply skimming and scanning techniques", "Identify question types and their tricks", "Improve reading speed without losing comprehension"], activities: ["Timed reading drills", "Question type mapping exercise", "Vocabulary in context exercise"], materials: "Reading Strategies Cheat Sheet" },
  { session: 3, title: "Listening Skills — Predictions, Note-Taking & Focus", objectives: ["Predict content from context before listening", "Take fast and effective notes", "Handle accents and connected speech"], activities: ["Note-taking drills on authentic recordings", "Accent exposure (British, American, Australian)", "Question type practice"], materials: "Listening Note-Taking Template" },
  { session: 4, title: "Writing Task 1 / Integrated Task — Data & Visual Reporting", objectives: ["Describe graphs, charts, tables, and diagrams", "Write clear data commentary in formal register", "Meet word count and time requirements"], activities: ["Graph description modeling", "Timed writing practice (20 min)", "Mentor feedback"], materials: "Task 1 Band 7+ Model Answers" },
  { session: 5, title: "Writing Task 2 / Independent Task — Essay Mastery", objectives: ["Plan and write a coherent academic essay", "Use task response, coherence, vocabulary, grammar (IELTS rubric)", "Handle opinion, discussion, and problem-solution prompts"], activities: ["Timed essay practice (40 min)", "Self-score using band descriptors", "Mentor annotated feedback"], materials: "Task 2 Essay Templates + High-Scoring Vocabulary" },
  { session: 6, title: "Speaking (IELTS) / Speaking Section (TOEFL)", objectives: ["Structure spoken answers using PEEL/STAR", "Handle Part 1, 2, and 3 (IELTS) or Tasks 1–6 (TOEFL)", "Improve pronunciation and reduce hesitation under pressure"], activities: ["Mock speaking test (full run)", "Recording analysis and feedback", "Vocabulary for abstract topics"], materials: "Speaking Answer Templates + Topic Vocabulary Bank" },
  { session: 7, title: "Full Mock Test & Intensive Score Analysis", objectives: ["Experience full test conditions", "Identify score-limiting patterns", "Build confidence through repetition"], activities: ["Full 2-hour simulated test", "Section-by-section score analysis", "Priority drill list for Session 8"], materials: "Annotated Mock Test + Score Tracker" },
  { session: 8, title: "Final Mock, Personalized Feedback & Certificate", objectives: ["Confirm score readiness with one final practice", "Address test anxiety strategies", "Complete the program with actionable next steps"], activities: ["Final section-targeted mock", "Mentor debrief and strategy finalization", "Certificate award"], materials: "Test Day Checklist + IELS Test Prep Certificate" },
];

const testPrepExtensive: CurriculumSession[] = [
  ...testPrepIntensive.slice(0, 7),
  { session: 8, title: "Advanced Reading — Complex Texts & Inference Chains", objectives: ["Tackle academic and abstract reading passages", "Build inference chains across paragraphs", "Master matching headings and summary completion"], activities: ["Cambridge past paper reading drills", "Inference mapping exercise", "Speed drill: 3 passages in 60 min"], materials: "Advanced Reading Practice Pack" },
  { session: 9, title: "Advanced Listening — Lectures, Debates & Rapid Speech", objectives: ["Follow complex academic lectures and debates", "Handle rapid native-speed speech without panic", "Distinguish main points from supporting details"], activities: ["TED Talk segment note-taking", "Multiple speakers conversation drills", "Question prediction practice"], materials: "Advanced Listening Transcripts + Answer Analysis" },
  { session: 10, title: "Writing Task 1 Mastery — All Graph Types & Academic Tone", objectives: ["Handle all 6 IELTS Task 1 visual types (bar, line, pie, table, map, process)", "Write with precise academic language and tone", "Consistently hit Band 7+ criteria"], activities: ["Timed Task 1 under exam conditions", "Band descriptor self-scoring", "Rewrite a Band 5 response to Band 7+"], materials: "All Graph Types Model Answers + Band Descriptor Rubric" },
  { session: 11, title: "Writing Task 2 Deep Dive — All 5 Essay Types", objectives: ["Master opinion, discussion, advantage/disadvantage, problem-solution, and two-part prompts", "Differentiate structure and approach for each type", "Build a flexible essay planning system"], activities: ["Essay type identification drill (20 prompts)", "Timed planning + writing (45 min)", "Mentor annotated band feedback"], materials: "5-Type Essay Framework Cards" },
  { session: 12, title: "TOEIC Focus — Business English & Real-World Test Strategy", objectives: ["Understand TOEIC scoring structure (L&R + S&W)", "Apply business English vocabulary in test context", "Tackle Part 5–7 grammar and reading items"], activities: ["TOEIC Part 5 & 6 grammar drills", "Business email reading comprehension", "Listening conversation practice (Parts 3–4)"], materials: "TOEIC Strategy Workbook" },
  { session: 13, title: "Speaking Part 2 & 3 — Fluency Under Pressure", objectives: ["Speak for 2 minutes without hesitation on any topic (IELTS Part 2)", "Give extended, developed answers in Part 3", "Manage nerves and thinking time strategically"], activities: ["10 Part 2 cue card practices (timed)", "Part 3 topic expansion drill", "Self-recording and playback analysis"], materials: "IELTS Part 2 Topic Bank (50 cards)" },
  { session: 14, title: "Vocabulary for Scores — Academic Word List & Paraphrasing", objectives: ["Use AWL vocabulary accurately in test contexts", "Paraphrase exam prompts without distorting meaning", "Avoid word repetition in Writing Tasks"], activities: ["AWL gap-fill in past paper writing", "Paraphrase challenge: 15 test sentences", "Synonym web-building exercise"], materials: "AWL Test Vocabulary Builder + Paraphrasing Guide" },
  { session: 15, title: "TOEFL iBT Focus — Integrated Skills & Response Strategy", objectives: ["Handle TOEFL Integrated Reading + Listening + Writing tasks", "Synthesize information from two sources under time pressure", "Respond to Independent Speaking tasks with a clear structure"], activities: ["Full TOEFL Integrated Writing task (20 min)", "Independent speaking task practice (4 questions)", "Mentor feedback on TOEFL scoring criteria"], materials: "TOEFL iBT Response Templates" },
  { session: 16, title: "Error Patterns & Personalized Weak Spot Sprint", objectives: ["Identify recurring error patterns in practice tests", "Target the 3 biggest score-limiting areas", "Build a final preparation sprint plan"], activities: ["Error log analysis from Sessions 1–15", "Personalized drill set", "Score projection and strategy adjustment"], materials: "Error Pattern Analysis Sheet" },
  { session: 17, title: "Test-Day Simulation #1 — Full Practice Exam", objectives: ["Complete a full timed practice test under exam conditions", "Build mental stamina and pacing confidence", "Identify last-minute improvement areas"], activities: ["Full 3-hour practice exam", "Score calculation and analysis", "Rest and recovery strategy debrief"], materials: "Full Practice Test Set A + Answer Key" },
  { session: 18, title: "Test-Day Simulation #2 — Score Refinement", objectives: ["Repeat exam simulation with targeted improvements", "Compare scores across sessions to track growth", "Finalize test-day strategy and logistics"], activities: ["Full 3-hour practice test (different paper)", "Before vs. after score comparison", "Logistics checklist: what to bring, mental prep"], materials: "Full Practice Test Set B + Comparative Score Tracker" },
  { session: 19, title: "Speaking Confidence Sprint — High-Stakes Oral Performance", objectives: ["Simulate the full IELTS Speaking test under realistic pressure", "Receive detailed rubric-based spoken feedback", "Polish final fillers, tone, and pronunciation"], activities: ["Full IELTS Speaking mock (Parts 1–3)", "Mentor rubric feedback (fluency, coherence, vocab, grammar, pronunciation)", "Final pronunciation correction session"], materials: "Speaking Rubric Self-Assessment Card" },
  { session: 20, title: "Final Vocabulary & Grammar Polish", objectives: ["Eliminate last grammar and vocabulary errors in writing", "Strengthen lexical resource and grammatical range", "Review all corrected writing tasks from the program"], activities: ["Review and upgrade 3 previous writing tasks", "Vocabulary precision challenge", "Final writing grammar audit"], materials: "Writing Polish Checklist + AWL Final Review" },
  { session: 21, title: "Final Review, Strategy Debrief & Certificate", objectives: ["Consolidate all test strategies across all sections", "Leave with a clear, personalised test-day plan", "Earn IELS Test Prep Certificate"], activities: ["30-min targeted practice by section", "Personal test-day strategy document", "Certificate award + final score projection"], materials: "Test-Day Action Plan + IELS Test Prep Certificate" },
];

// ─── CURRICULUM: SPEAKING ─────────────────────────────────────────────────────

const speakingIntensive: CurriculumSession[] = [
  { session: 1, title: "Speaking Audit — Your Voice, Your Gaps", objectives: ["Assess current speaking level and identify key challenges", "Understand the difference between fluency, accuracy, and pronunciation", "Set personal speaking goals for the program"], activities: ["3-minute self-introduction recording and feedback", "Speaking fluency diagnostic", "Gap analysis and personalized learning map"], materials: "IELS Speaking Diagnostic Rubric + Goal-Setting Template" },
  { session: 2, title: "Pronunciation & Clarity — Sounds That Matter Most", objectives: ["Master the phonemes most challenging for Indonesian speakers", "Reduce heavy accent where it impairs clarity", "Understand stress, rhythm, and intonation patterns"], activities: ["Minimal pairs drill (ship/sheep, live/leave)", "Sentence stress pattern practice", "Record and compare with native model"], materials: "IELS Pronunciation Guide + IPA Reference" },
  { session: 3, title: "Conversation Flow — Fillers, Hesitation & Turn-Taking", objectives: ["Use natural fillers and discourse markers instead of silence", "Manage conversation flow and topic transitions", "Ask clarifying and follow-up questions professionally"], activities: ["Simulated professional conversation", "Turn-taking roleplay (meeting scenario)", "Filler replacement drill"], materials: "Professional Conversation Toolkit PDF" },
  { session: 4, title: "Professional Speaking — Meetings, Standups & Presentations", objectives: ["Communicate clearly and confidently in virtual meetings", "Give structured updates using STAR method", "Handle interruptions and regain the floor"], activities: ["Mock Zoom standup simulation", "30-second project update challenge", "Presentation opening techniques practice"], materials: "Meeting English Phrasebook PDF + Standup Template" },
  { session: 5, title: "Job Interview English — Global Companies & Remote Roles", objectives: ["Answer common interview questions with STAR structure", "Discuss salary, timelines, and role expectations confidently", "Handle tricky questions: weaknesses, gaps, failure stories"], activities: ["Mock interview (5 questions, recorded)", "Feedback and re-do session", "Vocabulary building for HR conversations"], materials: "IELS Interview Master Script + Question Bank PDF" },
  { session: 6, title: "Cross-Cultural Communication & Workplace Dynamics", objectives: ["Understand how culture affects communication style", "Navigate directness vs. indirectness in global teams", "Give and receive feedback professionally in English"], activities: ["Cultural scenario analysis", "Feedback phrase practice", "Case study: communication conflict resolution"], materials: "Cross-Cultural Communication Guide PDF" },
  { session: 7, title: "Storytelling & Persuasion — Speaking with Impact", objectives: ["Structure compelling stories and arguments", "Use rhetorical devices naturally in spoken English", "Speak persuasively in pitches, meetings, and interviews"], activities: ["2-minute story pitch challenge", "Persuasion roleplay (convince a client / manager)", "Feedback and vocabulary refinement"], materials: "Storytelling Framework Cards + Power Phrases List" },
  { session: 8, title: "Final Speaking Assessment & Certificate", objectives: ["Demonstrate speaking growth across all areas", "Complete a final speaking task under realistic conditions", "Receive a detailed speaking feedback report"], activities: ["5-minute mock interview or presentation (student's choice)", "Mentor feedback session", "Final reflection and goal-setting"], materials: "Final Assessment Rubric + IELS Speaking Certificate" },
];

const speakingExtensive: CurriculumSession[] = [
  ...speakingIntensive.slice(0, 8),
  { session: 9, title: "Networking & Small Talk in Professional Settings", objectives: ["Start and sustain professional small talk", "Network at events, conferences, and online platforms", "Transition from small talk to meaningful professional conversation"], activities: ["Networking simulation (virtual conference)", "LinkedIn voice message practice", "Small talk topic bank building"], materials: "Professional Networking Phrasebook" },
  { session: 10, title: "Email to Speech — Translating Written Communication to Spoken", objectives: ["Read and summarize written content verbally", "Explain technical or written data in meetings", "Transition between formal and informal spoken register"], activities: ["Summarize a business email out loud (timed)", "Explain a data chart in a 2-min verbal report", "Register shifting drill"], materials: "Verbal Communication Transition Guide" },
  { session: 11, title: "Advanced Pronunciation — Linking, Reduction & Natural Flow", objectives: ["Apply connected speech features (linking, elision, assimilation)", "Sound more natural without losing clarity", "Understand native speech in listening tasks"], activities: ["Connected speech deconstruction of podcast clips", "Shadowing exercise (3 rounds)", "Self-recording comparison"], materials: "Connected Speech Workbook" },
  { session: 12, title: "Handling Difficult Conversations in English", objectives: ["Negotiate, disagree, and push back professionally", "Deliver bad news or criticism constructively", "Maintain relationships through challenging discussions"], activities: ["Difficult conversation roleplay (client complaint, salary negotiation)", "Diplomatic language practice", "Self-assessment of tone and word choice"], materials: "Diplomatic English Phrase Bank" },
  { session: 13, title: "Giving Presentations with Confidence", objectives: ["Structure a 5–10 minute professional presentation", "Use visual aids and data effectively in spoken English", "Handle Q&A sessions confidently"], activities: ["3-minute presentation with slides", "Q&A roleplay with mentor as audience", "Presentation feedback with rubric"], materials: "Presentation Structure Template + Delivery Checklist" },
  { session: 14, title: "Speaking for Remote Work — Async & Synchronous", objectives: ["Record clear video or voice updates for async teams", "Communicate across time zones and cultures effectively", "Use tools like Loom, Slack Huddle professionally"], activities: ["Record a 2-min async Loom-style update", "Tone analysis: Slack vs. email vs. video", "Remote team communication scenario"], materials: "Async Communication Toolkit PDF" },
  { session: 15, title: "Fluency Building — Thinking in English", objectives: ["Reduce translation lag from Indonesian to English", "Build automatic speaking responses for common topics", "Use chunking and lexical phrases for natural flow"], activities: ["30-second response drills (no pause allowed)", "Lexical phrase substitution game", "Thinking-in-English journaling intro"], materials: "Lexical Phrase Bank + Fluency Drill Sheet" },
  { session: 16, title: "Speaking in Academic & Research Contexts", objectives: ["Present research findings verbally", "Participate in academic discussions and seminars", "Defend ideas and arguments academically"], activities: ["Simulated academic seminar discussion", "3-minute research summary presentation", "Academic discussion phrase practice"], materials: "Academic Discussion & Seminar Phrases PDF" },
  { session: 17, title: "English for Leadership & Team Management", objectives: ["Give instructions and delegate tasks clearly", "Motivate and manage remote teams in English", "Conduct performance reviews and 1-on-1s"], activities: ["Leadership communication roleplay", "Delegation and feedback script practice", "Team meeting facilitation simulation"], materials: "Leadership Communication Playbook" },
  { session: 18, title: "Mid-Program Reflection & Personalized Focus Sprint", objectives: ["Evaluate individual progress since Session 1", "Target remaining speaking challenges", "Plan final sprint strategy"], activities: ["Re-take of Session 1 diagnostic (compare recordings)", "Mentor-led feedback deep dive", "Customized final 3-session plan"], materials: "Progress Report + Personalized Sprint Plan" },
  { session: 19, title: "Real-World Speaking Challenge #1 — Live Simulation", objectives: ["Perform in a full real-world speaking scenario", "Apply all skills in an unscripted environment", "Build confidence through high-pressure practice"], activities: ["Full 15-min mock job interview OR client pitch", "Detailed recorded feedback session", "Error pattern analysis"], materials: "Full Simulation Feedback Form" },
  { session: 20, title: "Real-World Speaking Challenge #2 — Peer Presentation", objectives: ["Present on a professional topic to peers", "Handle live audience Q&A", "Give and receive constructive peer feedback"], activities: ["10-min presentation to group/mentor", "Live Q&A session", "Structured peer feedback round"], materials: "Peer Review Rubric + Self-Evaluation Form" },
  { session: 21, title: "Final Assessment, Portfolio & Certification", objectives: ["Demonstrate full speaking competency", "Review before-and-after speaking journey", "Earn IELS Speaking & Professional English Certificate"], activities: ["Final 10-min speaking assessment (interview + presentation)", "Portfolio audio review", "Certificate award + IELS Lounge Premium onboarding"], materials: "Final Rubric + Progress Portfolio + IELS Certificate" },
];

// ─── CURRICULUM: WORK ABROAD ─────────────────────────────────────────────────

const workAbroadIntensive: CurriculumSession[] = [
  { session: 1, title: "Your Global Career Blueprint — Gaps & Goals", objectives: ["Map current English level vs. global career requirements", "Identify key communication gaps for your target role", "Understand what global employers actually look for"], activities: ["Career English diagnostic", "Job posting language analysis", "Personal gap analysis"], materials: "Global Career English Roadmap PDF" },
  { session: 2, title: "LinkedIn & Personal Branding in English", objectives: ["Write a compelling English LinkedIn profile", "Craft messages and connection requests that get responses", "Build a professional English digital presence"], activities: ["LinkedIn profile audit and rewrite", "Cold outreach message workshop", "Networking message templates"], materials: "LinkedIn English Optimization Guide" },
  { session: 3, title: "Async Communication — Email, Slack & Notion Mastery", objectives: ["Write clear, action-oriented professional emails", "Communicate efficiently on Slack without cultural misunderstanding", "Document work updates clearly in Notion/Confluence"], activities: ["Email rewrite challenge (informal → formal)", "Slack tone analysis exercise", "Work update documentation practice"], materials: "Async Communication Template Pack" },
  { session: 4, title: "Video Interviews — Remote Job Applications", objectives: ["Prepare for common remote job interview question types", "Set up and communicate professionally on video calls", "Handle cultural interview differences (Western vs. SEA)"], activities: ["Mock video interview (recorded)", "Camera presence and delivery coaching", "Q&A: salary, expectations, availability"], materials: "Remote Interview Mastery Guide + Question Bank" },
  { session: 5, title: "Virtual Meetings & Standups in Global Teams", objectives: ["Participate actively in international virtual meetings", "Give and receive updates using STAR/standup format", "Navigate meeting etiquette across cultures"], activities: ["Mock standup simulation", "Meeting interruption and floor-taking drills", "Cross-cultural meeting scenario roleplay"], materials: "Global Meeting Phrasebook PDF" },
  { session: 6, title: "Cross-Cultural Communication & Feedback", objectives: ["Understand direct vs. indirect communication cultures", "Give feedback diplomatically in international settings", "Receive critical feedback without misunderstanding"], activities: ["Cultural communication style quiz and debrief", "Diplomatic feedback writing and roleplay", "Real scenario: 'How would you handle this?'"], materials: "Cross-Cultural Communication Field Guide" },
  { session: 7, title: "Negotiation & Professional Boundaries in English", objectives: ["Negotiate salary, timelines, and deliverables confidently", "Set and communicate professional boundaries clearly", "Handle conflict and misunderstanding professionally"], activities: ["Salary negotiation roleplay", "Professional boundary-setting email drafts", "Conflict resolution simulation"], materials: "Professional Negotiation Phrase Bank" },
  { session: 8, title: "Final Assessment — Mock Application Package & Certificate", objectives: ["Demonstrate all remote career communication skills", "Complete a full mock remote job application scenario", "Receive a personalized mentor report"], activities: ["Full mock: cover letter + LinkedIn message + video interview", "Mentor comprehensive feedback", "Certificate award"], materials: "Full Application Review + IELS Professional English Certificate" },
];

const workAbroadExtensive: CurriculumSession[] = [
  ...workAbroadIntensive.slice(0, 8),
  { session: 9, title: "Cover Letter & Portfolio Writing for Global Roles", objectives: ["Write a tailored cover letter for international job applications", "Build an English-language professional portfolio narrative", "Understand what Western hiring managers scan for in 30 seconds"], activities: ["Cover letter draft + mentor review", "Portfolio summary writing exercise", "Before/after cover letter comparison"], materials: "Cover Letter Framework + Portfolio Narrative Template" },
  { session: 10, title: "Remote Onboarding — First 30 Days in a Global Team", objectives: ["Navigate first impressions in a remote, multicultural team", "Ask smart questions and show initiative without overstepping", "Understand unwritten rules of remote-first workplaces"], activities: ["First-week communication simulation", "Email to manager: progress update drill", "Scenario: 'How do I ask for help without looking incompetent?'"], materials: "Remote Onboarding Playbook" },
  { session: 11, title: "Advanced Email — Tone, Urgency & Difficult Situations", objectives: ["Write emails that strike the right tone in high-stakes situations", "Escalate issues professionally without causing offence", "Handle complaints, delays, and pushback via email"], activities: ["Tone-calibration rewrite challenge (5 emails)", "Escalation email drafting", "Real inbox audit: fix these 3 emails"], materials: "Advanced Email Tone Guide" },
  { session: 12, title: "Presentations to International Audiences", objectives: ["Design and deliver a clear 10-minute English presentation", "Handle non-native speaker Q&A with confidence", "Adapt communication style for mixed cultural audiences"], activities: ["10-min presentation practice (own topic)", "Live Q&A simulation", "Cultural adaptation debrief"], materials: "Cross-Cultural Presentation Checklist" },
  { session: 13, title: "English for Project Management & Stakeholder Communication", objectives: ["Write clear project briefs, updates, and wrap-up reports", "Communicate with stakeholders across seniority levels", "Use standard PM language (Agile, KPIs, deliverables)"], activities: ["Project brief writing exercise", "Stakeholder update email drills", "Agile vocabulary and scenario matching"], materials: "PM Communication Template Pack" },
  { session: 14, title: "Writing for Social Media & Thought Leadership (English)", objectives: ["Write LinkedIn posts that build professional credibility", "Craft clear, engaging English captions and summaries", "Position yourself as a global professional online"], activities: ["LinkedIn post drafting workshop (3 posts)", "Thought leadership angle brainstorm", "Peer review and engagement analysis"], materials: "LinkedIn Content Strategy Guide" },
  { session: 15, title: "Giving & Receiving Performance Feedback in English", objectives: ["Deliver performance feedback that is clear, direct, and kind", "Respond to critical feedback professionally without defensiveness", "Navigate performance review conversations in English"], activities: ["Feedback delivery roleplay (positive + constructive)", "Response scripts for critical feedback", "Performance review script practice"], materials: "Feedback Language Framework PDF" },
  { session: 16, title: "Advanced Negotiation — Salary, Contracts & Deliverables", objectives: ["Negotiate salary increases and contract terms confidently", "Push back on unreasonable scope or deadlines professionally", "Close agreements with clear, documented English language"], activities: ["Salary negotiation simulation (escalating difficulty)", "Scope pushback email drafting", "Contract clause rewrite exercise"], materials: "Negotiation Script Bank + Contract Language Guide" },
  { session: 17, title: "Intercultural Conflict Resolution", objectives: ["Identify sources of miscommunication in multicultural teams", "Resolve misunderstandings without blame or escalation", "Build psychological safety in cross-cultural conversations"], activities: ["Conflict scenario analysis (3 cases)", "De-escalation language practice", "Apology and repair conversation roleplay"], materials: "Intercultural Conflict Resolution Playbook" },
  { session: 18, title: "Mid-Program Review — Career Document Audit", objectives: ["Review all career materials built in Sessions 1–17", "Identify gaps in your professional English package", "Plan final sprint for target role or application"], activities: ["Full career document review: CV, cover letter, LinkedIn, email samples", "Mentor comprehensive feedback session", "Final sprint goal-setting"], materials: "Career Document Audit Rubric" },
  { session: 19, title: "Simulation Day #1 — Full Remote Job Application", objectives: ["Complete a full realistic application process in one session", "Practice under application pressure with real-time feedback", "Build confidence in end-to-end professional English use"], activities: ["Write cover letter + LinkedIn message (30 min)", "Full video interview simulation (recorded)", "Mentor debrief and scoring"], materials: "Application Day Simulation Rubric" },
  { session: 20, title: "Simulation Day #2 — Global Team Communication Sprint", objectives: ["Demonstrate mastery of async and synchronous communication", "Handle a realistic 'crisis' communication scenario", "Show cultural fluency in written and spoken English"], activities: ["Async crisis communication drill (Slack + email)", "Virtual meeting with agenda management", "Cross-cultural debrief conversation"], materials: "Global Team Simulation Scenario Pack" },
  { session: 21, title: "Final Assessment, Portfolio Review & Certification", objectives: ["Demonstrate end-to-end professional English competency", "Present your complete career document portfolio", "Earn IELS Work Abroad & Remote Careers Certificate"], activities: ["Final assessment: mock interview + writing task", "Portfolio presentation (5 min)", "Certificate award + IELS Lounge onboarding"], materials: "Final Rubric + Career Portfolio + IELS Certificate" },
];

// ─── CURRICULUM: WRITING ─────────────────────────────────────────────────────

const writingIntensive: CurriculumSession[] = [
  { session: 1, title: "Writing Audit & Foundations — Understanding Academic Register", objectives: ["Assess current writing level and identify key weaknesses", "Understand the difference between informal, formal, and academic register", "Learn the basic structure of a strong paragraph"], activities: ["Free-write diagnostic (topic: my academic/career goal)", "Register transformation exercise", "Paragraph structure analysis"], materials: "IELS Writing Diagnostic Rubric + Register Guide" },
  { session: 2, title: "Essay Architecture — Planning & Outlining for Clarity", objectives: ["Build a clear thesis statement and argument structure", "Create detailed essay outlines before writing", "Understand introduction, body, conclusion functions"], activities: ["Thesis statement workshop", "Outline-building from 5 essay prompts", "Reverse outlining an existing essay"], materials: "Essay Blueprint Template + Thesis Formula Card" },
  { session: 3, title: "Introduction & Thesis Writing — First Impressions That Win", objectives: ["Write compelling hooks and context-builders", "Craft a thesis that signals your argument clearly", "Avoid common introduction pitfalls"], activities: ["Hook-type sampling (question, statistic, anecdote, quote)", "Thesis surgery workshop", "Rewrite 3 weak introductions"], materials: "Introduction Mastery PDF + 10 Hook Templates" },
  { session: 4, title: "Body Paragraph Development — Evidence, Analysis & Transitions", objectives: ["Apply the PEEL/TEEL paragraph models", "Integrate evidence and analysis without plagiarism", "Use transitions that go beyond 'furthermore'"], activities: ["PEEL paragraph modeling and practice", "Evidence integration exercise", "Transition language upgrade drill"], materials: "Paragraph Models Workbook + 50 Transitional Phrases PDF" },
  { session: 5, title: "Scholarship Essay Writing — Motivation Letter Masterclass", objectives: ["Understand what scholarship committees look for", "Write a compelling and authentic motivation letter", "Avoid generic and clichéd language"], activities: ["Motivation letter case study analysis (good vs. bad)", "Write first draft of personal motivation letter", "Peer review and mentor feedback"], materials: "Scholarship Essay Formula PDF + Sample Letters (Annotated)" },
  { session: 6, title: "Conclusion, Coherence & Cohesion", objectives: ["Write conclusions that go beyond summary", "Ensure logical flow throughout an entire essay", "Use cohesive devices effectively"], activities: ["Conclusion rewriting challenge", "Whole-essay flow audit", "Cohesion score-and-fix exercise"], materials: "Cohesion Checklist + Conclusion Techniques Card" },
  { session: 7, title: "Editing, Proofreading & Style Refinement", objectives: ["Develop a systematic self-editing process", "Eliminate wordiness, redundancy, and weak language", "Refine academic style and vocabulary"], activities: ["Edit a 500-word essay in 15 minutes (timed)", "Academic word upgrade exercise", "Peer editing swap with structured rubric"], materials: "IELS Editing Checklist + Academic Word List (AWL) Top 100" },
  { session: 8, title: "Final Writing Assessment & Certificate", objectives: ["Complete a full essay under timed conditions", "Demonstrate mastery of all writing skills", "Receive detailed mentor feedback and certificate"], activities: ["Final 45-min timed essay (scholarship or academic prompt)", "Mentor written feedback session", "Portfolio compilation and certificate award"], materials: "Final Essay Rubric + IELS Writing Certificate" },
];

const writingExtensive: CurriculumSession[] = [
  ...writingIntensive.slice(0, 8),
  { session: 9, title: "Research Writing — Finding, Evaluating & Citing Sources", objectives: ["Find credible academic sources efficiently", "Evaluate source quality and relevance", "Apply APA, MLA, or Chicago citation basics"], activities: ["Source scavenger hunt exercise", "Citation format practice", "Annotated bibliography mini-task"], materials: "Citation Style Guide PDF + Academic Database Cheat Sheet" },
  { session: 10, title: "Paraphrasing, Summarizing & Academic Integrity", objectives: ["Paraphrase without plagiarizing", "Summarize complex texts concisely", "Understand academic honesty in international contexts"], activities: ["Paraphrase challenge (10 sentences)", "Text-to-summary reduction exercise", "Plagiarism case study discussion"], materials: "Paraphrasing Techniques Workbook" },
  { session: 11, title: "Argumentative & Discursive Essay Mastery", objectives: ["Write strong for/against and problem-solution essays", "Use counter-argument and rebuttal effectively", "Apply argumentation in global scholarship prompts"], activities: ["Discursive essay planning workshop", "Counter-argument integration exercise", "Model essay scoring and annotation"], materials: "Argumentative Essay Models PDF" },
  { session: 12, title: "Personal Statement Writing — Who Are You, Really?", objectives: ["Craft an authentic, compelling personal narrative", "Show (not tell) your values and experiences", "Tailor your personal statement to different programs"], activities: ["Core values brainstorming exercise", "Narrative arc mapping", "Draft personal statement (first version)"], materials: "Personal Statement Blueprint + 5 Real Samples PDF" },
  { session: 13, title: "Writing for Specific Programs — LPDP, Chevening, DAAD", objectives: ["Understand the specific requirements of major scholarships", "Customize essays for each program's values", "Avoid generic responses that lose evaluators"], activities: ["Scholarship prompt analysis workshop", "Program-specific essay draft", "Peer and mentor review"], materials: "Scholarship Program Profiles & Key Values PDF" },
  { session: 14, title: "Research Paper Writing — Structure & Argumentation", objectives: ["Write a structured literature review section", "Formulate a clear research question and rationale", "Understand the IMRaD structure for academic papers"], activities: ["Literature review mini-draft", "Research question refinement workshop", "IMRaD structure mapping exercise"], materials: "Research Paper Structure Guide" },
  { session: 15, title: "Report Writing — Professional & Academic", objectives: ["Write clear professional and academic reports", "Use appropriate headings, data commentary, and executive summaries", "Adapt report writing to business and university contexts"], activities: ["Data commentary writing drill", "Executive summary condensation exercise", "Full report outline and section draft"], materials: "Report Writing Templates + Data Commentary Phrases" },
  { session: 16, title: "Academic Vocabulary & Precision of Language", objectives: ["Expand academic vocabulary through the Academic Word List", "Choose precise, context-appropriate language", "Avoid vague language and hedging overuse"], activities: ["AWL gap-fill in academic texts", "Vocabulary precision upgrade task", "AWL in context writing drill"], materials: "Academic Vocabulary Builder Workbook" },
  { session: 17, title: "Writing Under Pressure — Timed Essay Strategies", objectives: ["Plan, draft, and edit an essay under time constraints", "Prioritize what matters most in timed conditions", "Build writing speed without sacrificing quality"], activities: ["3 timed 20-minute essay sprints", "Speed-planning drill (5-min outlines)", "Post-sprint mentor debrief"], materials: "Timed Writing Strategy Card" },
  { session: 18, title: "Mid-Program Portfolio Review & Personal Sprint", objectives: ["Review writing portfolio from Sessions 1–17", "Identify patterns in errors and strengths", "Set a clear goal for the final three sessions"], activities: ["Portfolio review with mentor", "Before/after essay comparison", "Final sprint goal-setting session"], materials: "Progress Report + Personalized Error Pattern Analysis" },
  { session: 19, title: "Peer Review & Collaborative Writing Workshop", objectives: ["Give structured feedback on peers' writing", "Incorporate feedback into your own writing revision", "Develop a critical eye for your own work"], activities: ["Structured peer review round (exchange and annotate)", "Revision of own essay based on peer notes", "Discussion: what makes feedback actionable?"], materials: "Peer Review Rubric + Revision Guide" },
  { session: 20, title: "Cover Letters, CVs & Professional Writing", objectives: ["Write a compelling English-language cover letter", "Format and tailor an international CV/résumé", "Apply professional writing principles to career documents"], activities: ["Cover letter draft and feedback", "CV English audit and upgrade", "Application package peer review"], materials: "Cover Letter Template + International CV Guide" },
  { session: 21, title: "Final Assessment, Writing Portfolio & Certification", objectives: ["Demonstrate full writing mastery in a final assessment", "Present a curated writing portfolio", "Earn IELS Writing & Scholarship Essay Certificate"], activities: ["Final 60-min writing task (scholarship essay / academic essay / report)", "Mentor written feedback and portfolio review", "Certificate award + IELS Lounge onboarding"], materials: "Final Assessment Rubric + Writing Portfolio + IELS Certificate" },
];

// ─── CURRICULUM: SCHOLARSHIP ESSAY ───────────────────────────────────────────

const scholarshipIntensive: CurriculumSession[] = [
  { session: 1, title: "Scholarship Landscape & What Evaluators Actually Want", objectives: ["Understand major scholarship programs and their values", "Decode what 'compelling' means to international committees", "Map your experience to scholarship criteria"], activities: ["Scholarship matrix analysis", "Your story brainstorming session", "Evaluator mindset roleplay"], materials: "IELS Scholarship Programs Overview PDF" },
  { session: 2, title: "Personal Brand — Who Are You as a Candidate?", objectives: ["Identify your unique story and core values", "Differentiate yourself from other applicants", "Build your personal narrative framework"], activities: ["Core values identification exercise", "Unique angle brainstorm", "Personal brand statement draft"], materials: "Personal Brand Workshop Worksheet" },
  { session: 3, title: "Motivation Letter Architecture — The Winning Structure", objectives: ["Learn the structure that scholarship committees respond to", "Write an opening paragraph that compels reading", "Balance ambition with authenticity"], activities: ["Motivation letter model analysis", "Opening paragraph workshop", "First draft of motivation letter intro"], materials: "Motivation Letter Blueprint + 5 Annotated Samples" },
  { session: 4, title: "Storytelling Techniques — Show, Don't Tell", objectives: ["Replace generic statements with specific, vivid stories", "Use the STAR method for experience writing", "Develop a signature story that defines your candidacy"], activities: ["Generic vs. specific rewrite challenge", "STAR story development", "Signature story first draft"], materials: "Storytelling Techniques for Scholarship Essays PDF" },
  { session: 5, title: "Connecting Your Past, Present & Future", objectives: ["Create a compelling narrative arc across your essay", "Show purposeful progression and self-awareness", "Articulate your future impact with confidence"], activities: ["Past-present-future mapping exercise", "Impact statement drafting", "Full motivation letter second draft"], materials: "Narrative Arc Template + Impact Language Bank" },
  { session: 6, title: "Tailoring Essays to Specific Programs — LPDP, Chevening, DAAD", objectives: ["Customize your essay for each program's specific values", "Avoid the 'copy-paste' mistake that disqualifies candidates", "Understand what makes each program unique"], activities: ["Program-specific essay adaptation workshop", "Side-by-side essay comparison (generic vs. tailored)", "Third draft with program alignment"], materials: "LPDP / Chevening / DAAD Program Value Cards" },
  { session: 7, title: "Advanced Editing — From Good to Outstanding", objectives: ["Cut weak language and strengthen every sentence", "Polish tone, vocabulary, and academic register", "Build a final review checklist for submission"], activities: ["Sentence-level editing workshop", "Vocabulary upgrade exercise", "Peer and mentor review with tracked changes"], materials: "Scholarship Essay Editing Rubric" },
  { session: 8, title: "Final Essay, Interview Preparation & Certificate", objectives: ["Submit-ready final essay with mentor sign-off", "Prepare for scholarship interview questions about your essay", "Complete program with confidence and a portfolio piece"], activities: ["Final essay presentation and mentor sign-off", "Mock scholarship interview Q&A", "Certificate award"], materials: "Final Essay Feedback + Mock Interview Guide + IELS Certificate" },
];

const scholarshipExtensive: CurriculumSession[] = [
  ...scholarshipIntensive.slice(0, 8),
  { session: 9, title: "Deep Research — Understanding Your Target Program Inside Out", objectives: ["Research a scholarship program's history, values, and past awardees", "Extract language cues from program materials to mirror in your essay", "Identify what differentiates top applicants from the rest"], activities: ["Program research deep-dive (1 program per student)", "Awardee profile analysis", "Language mirroring exercise"], materials: "Scholarship Research Framework" },
  { session: 10, title: "Writing About Adversity & Challenges — Doing It Right", objectives: ["Frame hardship stories without triggering pity or oversharing", "Use adversity to demonstrate resilience and growth", "Avoid common pitfalls: victimhood, irrelevance, melodrama"], activities: ["Adversity story audit (is this appropriate?)", "Rewrite a weak adversity paragraph", "Strength-framing language drill"], materials: "Adversity Writing Guide + 5 Case Studies" },
  { session: 11, title: "Leadership Stories — Proving Impact, Not Just Participation", objectives: ["Distinguish 'I participated in X' from 'I led X and achieved Y'", "Quantify impact wherever possible", "Select the strongest leadership examples from your own life"], activities: ["Impact quantification exercise", "Leadership story ranking and selection", "Mentor feedback: which story is strongest?"], materials: "Leadership Impact Framework" },
  { session: 12, title: "Community Contribution — Why Does It Matter?", objectives: ["Articulate your contribution to your community clearly", "Connect local impact to global ambition", "Avoid generic community service statements"], activities: ["Community contribution mapping", "Global-local connection drafting", "Review and upgrade existing community paragraph"], materials: "Community Contribution Story Bank" },
  { session: 13, title: "Research Proposal Writing (for Academic Scholarships)", objectives: ["Write a clear, concise 1-page research proposal", "Articulate research questions, methodology, and significance", "Tailor the proposal to the scholarship's academic focus"], activities: ["Research proposal first draft", "Mentor line-by-line feedback", "Revision and resubmit"], materials: "Research Proposal Template + Annotated Examples" },
  { session: 14, title: "Multiple Applications — Managing Different Essays at Once", objectives: ["Build a modular essay bank you can adapt for multiple applications", "Prioritize and manage application deadlines", "Avoid narrative fatigue and maintain authenticity across essays"], activities: ["Essay bank creation workshop", "Prioritization matrix for applications", "Cross-application consistency check"], materials: "Essay Bank Template + Application Tracker" },
  { session: 15, title: "Scholarship Interview Preparation — Part 1", objectives: ["Understand common scholarship interview formats (panel, 1-on-1, case)", "Prepare strong answers for the 10 most common questions", "Communicate values, goals, and impact confidently under pressure"], activities: ["10 key question prep workshop", "Mock interview (5 questions, recorded)", "Feedback on structure, content, and confidence"], materials: "Top 10 Scholarship Interview Questions + Answer Templates" },
  { session: 16, title: "Scholarship Interview Preparation — Part 2", objectives: ["Handle curveball and ethical dilemma questions", "Defend your essay in a live interview context", "Project credibility and warmth simultaneously"], activities: ["Mock interview: defend your essay (full simulation)", "Curveball Q&A drill", "Non-verbal communication coaching (posture, eye contact, pacing)"], materials: "Advanced Interview Coaching Guide" },
  { session: 17, title: "Final Polish — Sentence-Level Editing for Submission", objectives: ["Achieve publication-quality writing in your final draft", "Eliminate every vague word, cliché, and filler phrase", "Make every sentence earn its place"], activities: ["Full essay sentence audit (mark every weak word)", "Upgrade 15 weakest sentences", "Final read-aloud proofreading method"], materials: "Sentence-Level Editing Rubric + Cliché Blacklist" },
  { session: 18, title: "Recommendation Letters — How to Brief Your Referees", objectives: ["Understand what makes a powerful recommendation letter", "Brief your referees with the right information and framing", "Provide a tailored 'cheat sheet' that aligns your story"], activities: ["Referee brief writing workshop", "Side-by-side: weak vs. strong recommendation letter", "Draft your referee talking points document"], materials: "Referee Brief Template + Recommendation Letter Examples" },
  { session: 19, title: "Application Submission Review — Final Checklist", objectives: ["Audit the complete application package before submission", "Catch formatting, word count, and compliance issues", "Build a submission confidence checklist"], activities: ["Full application package review with mentor", "Word count and compliance audit", "Final submission checklist completion"], materials: "Application Submission Checklist + Common Disqualification Errors" },
  { session: 20, title: "Post-Application — Handling Rejections, Deferrals & Waitlists", objectives: ["Respond professionally to any application outcome", "Request and use feedback constructively", "Revise and reapply stronger next cycle"], activities: ["Rejection response email drafting", "Debrief: what would you change?", "Reapplication strategy planning session"], materials: "Post-Application Response Templates" },
  { session: 21, title: "Final Assessment, Portfolio Presentation & Certification", objectives: ["Present your complete application portfolio confidently", "Demonstrate growth from Session 1 to 21", "Earn IELS Scholarship Essay Certificate"], activities: ["Final portfolio presentation (10 min): essay + story + interview", "Mentor comprehensive written evaluation", "Certificate award + IELS Lounge onboarding"], materials: "Final Portfolio Rubric + IELS Scholarship Essay Certificate" },
];

// ─── COURSE PACKAGES ─────────────────────────────────────────────────────────

export const COURSE_PACKAGES: CoursePackage[] = [
  // ── GRAMMAR ──
  {
    id: "grammar-intensive", name: "Grammar Mastery", type: "intensive", sessions: 8,
    mentorId: "arba", trackId: "grammar", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 8 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "8-session intensive covering the complete grammar system. Fix your weak spots fast before a test, job application, or study abroad program.",
    outcomes: ["Master all essential tense forms and conditionals", "Write grammatically accurate professional emails and reports", "Eliminate the top 20 errors common to Indonesian speakers", "Earn IELS Grammar Certificate"],
    curriculum: grammarIntensive, level: "A2 – C1", badge: "⚡",
  },
  {
    id: "grammar-extensive", name: "Grammar Mastery", type: "extensive", sessions: 21,
    mentorId: "arba", trackId: "grammar", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 21 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "21-session deep dive from grammar foundations to professional-level accuracy. For learners who want lasting confidence across writing and speaking.",
    outcomes: ["Master all grammar areas from fundamentals to advanced", "Apply grammar across written and spoken English", "Write professional reports, essays, and research papers", "Build a personal grammar reference system", "Earn IELS Grammar Certificate"],
    curriculum: grammarExtensive, level: "A1 – C2", badge: "🏅",
  },
  // ── TEST PREP ──
  {
    id: "test-prep-intensive", name: "IELTS / TOEFL / TOEIC Prep", type: "intensive", sessions: 8,
    mentorId: "arba", trackId: "standardized-test", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 8 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "Focused 8-session strategy course for IELTS, TOEFL, or TOEIC. Learn exactly what examiners look for and how to maximize your score in each section.",
    outcomes: ["Understand scoring criteria and examiner expectations", "Master time management across all test sections", "Practice Writing Task 1 & 2 / TOEFL Integrated & Independent", "Improve listening and reading speed strategies", "Earn IELS Test Prep Certificate"],
    curriculum: testPrepIntensive, level: "B1 – C1", badge: "🎯",
  },
  {
    id: "test-prep-extensive", name: "IELTS / TOEFL / TOEIC Prep", type: "extensive", sessions: 21,
    mentorId: "arba", trackId: "standardized-test", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 21 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "21-session comprehensive test mastery covering all four skills, TOEIC-specific strategy, two full mock exam days, and a final score sprint. Walk in confident.",
    outcomes: ["Achieve target band/score with systematic preparation", "Master all question types across IELTS, TOEFL, and TOEIC", "Complete 2 full timed mock exams with mentor debrief", "Build test-day stamina and anxiety management", "Earn IELS Test Prep Certificate"],
    curriculum: testPrepExtensive, level: "A2 – C2", badge: "🏅",
  },
  // ── SPEAKING ──
  {
    id: "speaking-intensive", name: "Speaking Fluency", type: "intensive", sessions: 8,
    mentorId: "dhila", trackId: "speaking", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 8 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "8-session intensive to unlock your speaking confidence for real-life conversations, job interviews, and global environments.",
    outcomes: ["Speak confidently in professional settings", "Handle job interviews in English with structure and clarity", "Improve pronunciation and natural flow", "Earn IELS Speaking Certificate"],
    curriculum: speakingIntensive, level: "B1 – C2", badge: "⚡",
  },
  {
    id: "speaking-extensive", name: "Speaking Fluency", type: "extensive", sessions: 21,
    mentorId: "dhila", trackId: "speaking", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 21 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "21-session comprehensive speaking program from pronunciation foundations to leadership-level communication. For those who want to truly think and live in English.",
    outcomes: ["Communicate naturally and confidently in any professional context", "Lead meetings, presentations, and negotiations in English", "Build fluency through reduced translation lag", "Earn IELS Speaking & Professional English Certificate"],
    curriculum: speakingExtensive, level: "A2 – C2", badge: "🏅",
  },
  // ── WORK ABROAD ──
  {
    id: "work-abroad-intensive", name: "Work Abroad & Remote Careers", type: "intensive", sessions: 8,
    mentorId: "dhila", trackId: "work-abroad", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 8 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "Purpose-built for professionals targeting global remote companies or international careers. Master async communication, LinkedIn, and cross-cultural teamwork.",
    outcomes: ["Write effective emails, Slack messages, and async updates", "Nail English-language interviews for remote/global roles", "Understand cross-cultural workplace dynamics", "Earn IELS Professional English Certificate"],
    curriculum: workAbroadIntensive, level: "B1 – C2", badge: "⚡",
  },
  {
    id: "work-abroad-extensive", name: "Work Abroad & Remote Careers", type: "extensive", sessions: 21,
    mentorId: "dhila", trackId: "work-abroad", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 21 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "21-session deep program covering everything from application to thriving in a global remote team — cover letters, onboarding, negotiation, leadership, and beyond.",
    outcomes: ["Build a complete professional English career package", "Communicate confidently from application through performance reviews", "Navigate remote team culture, conflict, and leadership", "Earn IELS Work Abroad & Remote Careers Certificate"],
    curriculum: workAbroadExtensive, level: "B1 – C2", badge: "🏅",
  },
  // ── WRITING ──
  {
    id: "writing-intensive", name: "Writing Excellence", type: "intensive", sessions: 8,
    mentorId: "hana", trackId: "writing", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 8 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "8-session writing boot camp covering academic essays, paragraph structure, and professional writing. Build writing confidence fast.",
    outcomes: ["Write clear, structured academic essays", "Apply paragraph models (PEEL/TEEL) consistently", "Master introduction, thesis, and conclusion writing", "Earn IELS Writing Certificate"],
    curriculum: writingIntensive, level: "B1 – C1", badge: "⚡",
  },
  {
    id: "writing-extensive", name: "Writing Excellence", type: "extensive", sessions: 21,
    mentorId: "hana", trackId: "writing", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 21 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "21-session comprehensive writing mastery from foundational essays to scholarship applications, research papers, and professional documents.",
    outcomes: ["Write compelling scholarship essays and motivation letters", "Produce research papers and academic reports confidently", "Develop a professional writing portfolio", "Build lifelong self-editing skills", "Earn IELS Writing & Scholarship Essay Certificate"],
    curriculum: writingExtensive, level: "A2 – C2", badge: "🏅",
  },
  // ── SCHOLARSHIP ESSAY ──
  {
    id: "scholarship-intensive", name: "Scholarship Essay", type: "intensive", sessions: 8,
    mentorId: "hana", trackId: "scholarship-essay", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 8 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "Laser-focused 8-session program for scholarship applicants targeting LPDP, Chevening, DAAD, or university programs. Write essays that win.",
    outcomes: ["Write authentic, compelling motivation letters", "Tailor essays to specific scholarship programs", "Master personal statement storytelling", "Earn IELS Scholarship Writing Certificate"],
    curriculum: scholarshipIntensive, level: "B2 – C2", badge: "🎖",
  },
  {
    id: "scholarship-extensive", name: "Scholarship Essay", type: "extensive", sessions: 21,
    mentorId: "hana", trackId: "scholarship-essay", pricePerSession: PRICE_PER_SESSION,
    loungeAccess: true, loungeValue: LOUNGE_VALUE, totalPrice: 21 * PRICE_PER_SESSION + LOUNGE_VALUE,
    description: "21-session end-to-end scholarship mastery — from story mining and essay writing to interview preparation, recommendation letter briefing, and submission review.",
    outcomes: ["Build a full scholarship application portfolio", "Write tailored essays for LPDP, Chevening, DAAD, and more", "Prepare for panel and 1-on-1 scholarship interviews", "Navigate rejections, deferrals, and reapplication cycles", "Earn IELS Scholarship Essay Certificate"],
    curriculum: scholarshipExtensive, level: "B2 – C2", badge: "🏅",
  },
];

// ─── TRACK METADATA ───────────────────────────────────────────────────────────

export const TRACK_META: Record<CourseTrack, { label: string; emoji: string; mentorId: MentorId }> = {
  "grammar":            { label: "Grammar Mastery",          emoji: "✍️",  mentorId: "arba"  },
  "standardized-test":  { label: "IELTS / TOEFL / TOEIC",    emoji: "🎯",  mentorId: "arba"  },
  "speaking":           { label: "Speaking Fluency",          emoji: "🗣️",  mentorId: "dhila" },
  "work-abroad":        { label: "Work Abroad & Remote",      emoji: "🌍",  mentorId: "dhila" },
  "writing":            { label: "Writing Excellence",        emoji: "📝",  mentorId: "hana"  },
  "scholarship-essay":  { label: "Scholarship Essay",         emoji: "🎓",  mentorId: "hana"  },
};

export const GOOGLE_FORM_URL = "https://forms.gle/t8xijoi6umFeYAu86";
export const WHATSAPP_URL = "https://wa.me/6288297253491";