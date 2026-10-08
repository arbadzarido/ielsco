// ============================================================================
// MemberStory data model — redesigned per the Member Stories Redesign brief.
// Existing story content is preserved (see `content`); the new optional
// fields (highlights, quotes, storySections, gallery, social links) are
// additive so the page can gracefully fall back when they're missing.
// ============================================================================

export interface StoryHighlight {
  value: string;
  label: string;
}

export interface StoryQuote {
  text: string;
  attribution?: string;
}

export interface StorySection {
  title: string;
  // HTML string, same convention as the legacy `content` field
  content: string;
  image?: string;
  quote?: string;
}

export interface GalleryItem {
  image: string;
  caption?: string;
  type?: "activity" | "travel" | "event" | "people" | "campus" | "other";
}

export interface MemberStory {
  id: string;
  title: string;
  // Legacy full HTML content — kept for backward compatibility (excerpts,
  // fallback rendering when storySections isn't available, etc.)
  content: string;
  bannerImage: string;

  author: {
    name: string;
    avatar: string;
    // Short identity line, e.g. "Project Leader, IELS · CS Student, UB"
    role?: string;
    // ISO 3166-1 alpha-2 code, used for the flag (e.g. "ID")
    country?: string;
    bio?: string;
    // TODO: fill in when available — only rendered if present
    instagram?: string;
    linkedin?: string;
    website?: string;
  };

  // Quick-scan stats. Only include facts actually present in the story —
  // never invent numbers.
  highlights?: StoryHighlight[];

  // Pull quotes shown as large visual moments between story sections.
  quotes?: StoryQuote[];

  // The story broken into visual chapters. When absent, the page falls
  // back to rendering the legacy `content` HTML as a single block.
  storySections?: StorySection[];

  // Additional journey photos. When absent, the page shows a lightweight
  // "coming soon" placeholder instead of an empty gallery.
  gallery?: GalleryItem[];

  // Attribution for the write-up itself (kept separate from the author's
  // own bio/credit so it can be displayed as a small footer note).
  credits?: {
    writer?: string;
    designer?: string;
  };

  date: string;
  location: string;
  seo: {
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
  };
  subcategory: "Internals" | "Lounge" | "Speakers" | "Inspires";
}

// Display labels for the subcategory filters. The underlying values stay
// the same as before so existing data doesn't need to be migrated — only
// how they're labeled in the UI changes.
export const subcategoryLabels: Record<MemberStory["subcategory"], string> = {
  Internals: "IELS Internals",
  Lounge: "IELS Circle Members",
  Speakers: "IELS Circle",
  Inspires: "IELS Inspires",
};

// NOTE: The content MUST use HTML tags for formatting
// use https://text-html.com/ for content formatting
export const memberStoriesData: MemberStory[] = [
  {
    id: "1",
    title: "Jo's Week Long Adventure at ISUFST, Philipines 🇵🇭",
    subcategory: "Internals",
    content: `<div>
<div><strong>From Malang to the Philippines, George Abraham—better known as Jo—brought the spirit of IELS across borders. As a Project Leader at IELS and a Computer Science student from Universitas Brawijaya, Jo spent a week on a cultural and academic exchange program at Iloilo State University of Fisheries Science and Technology (ISUFST).</strong></div>
<div>&nbsp;</div>
<div>During his stay, Jo had the chance to explore <strong>five different campuses</strong>, join IT-focused short courses, and engage with both faculty and students. The experience wasn't only about academics—it was about immersion. From joining local tours and exploring the city, to enjoying the beaches of Iloilo, Jo embraced the warmth of Filipino culture with excitement and curiosity.</div>
<div>&nbsp;</div>
<div><strong>"What made the journey even more special was how English became my bridge,"</strong> Jo shared. Conversations with fellow students and lecturers flowed naturally, even when he stumbled or made small mistakes. <em>"As long as you have the confidence to speak, you'll be fine. People aren't that scary—especially when they know you're still learning too."</em></div>
<div>&nbsp;</div>
<div>For Jo, his time at ISUFST wasn't just an academic trip; it was proof of how language can unlock global experiences. Being part of the IELS community gave him the courage and practice to communicate confidently in real-world settings. <strong>From English Lounge discussions to teamwork inside IELS projects, he felt prepared to step outside Indonesia and connect internationally.</strong></div>
<div>&nbsp;</div>
<div>Jo's story is a reminder that opportunities often come to those who dare to try. By stepping into new environments, embracing mistakes, and trusting the skills he built with IELS, he showed that Indonesian students can thrive on the global stage.</div>
<div>&nbsp;</div>
<div><em>"I hope more students realize that English isn't just a subject—it's a passport. If you have the willingness to learn and the courage to use it, the world becomes a lot closer."</em></div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Najlaa Thufailah Shafut</strong><br data-start="343" data-end="346" /> 🎨 Design <strong>by Muhammad Athallah Khairi</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DPJJ3zcgcJ5/?utm_source=ig_web_copy_link&igsh=MWhucW82a2dtMGhoYg==" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage:
      "/images/contents/stories/member-stories/banner/philippines-banner.png",
    author: {
      name: "George Abraham",
      avatar: "/images/contents/stories/member-stories/profile/jo.png",
      role: "Project Leader, IELS · Computer Science, Universitas Brawijaya",
      country: "ID",
      instagram:
        "https://www.instagram.com/p/DPJJ3zcgcJ5/?utm_source=ig_web_copy_link&igsh=MWhucW82a2dtMGhoYg==",
    },
    highlights: [
      { value: "5", label: "campuses visited" },
      { value: "1 Week", label: "in Iloilo" },
      { value: "🇮🇩 → 🇵🇭", label: "cross-border exchange" },
    ],
    quotes: [
      {
        text: "As long as you have the confidence to speak, you'll be fine. People aren't that scary—especially when they know you're still learning too.",
        attribution: "Jo",
      },
    ],
    storySections: [
      {
        title: "Crossing Borders",
        content:
          "<p>From Malang to the Philippines, George Abraham—better known as Jo—brought the spirit of IELS across borders. As a Project Leader at IELS and a Computer Science student from Universitas Brawijaya, Jo spent a week on a cultural and academic exchange program at Iloilo State University of Fisheries Science and Technology (ISUFST).</p>",
      },
      {
        title: "Immersed in a New Culture",
        content:
          "<p>During his stay, Jo had the chance to explore <strong>five different campuses</strong>, join IT-focused short courses, and engage with both faculty and students. From joining local tours and exploring the city, to enjoying the beaches of Iloilo, Jo embraced the warmth of Filipino culture with excitement and curiosity.</p>",
      },
      {
        title: "English as a Bridge",
        content:
          "<p>Being part of the IELS community gave him the courage and practice to communicate confidently in real-world settings. From English Lounge discussions to teamwork inside IELS projects, he felt prepared to step outside Indonesia and connect internationally.</p>",
      },
      {
        title: "What It Proved",
        content:
          "<p>Jo's story is a reminder that opportunities often come to those who dare to try. By stepping into new environments, embracing mistakes, and trusting the skills he built with IELS, he showed that Indonesian students can thrive on the global stage.</p>",
      },
    ],
    credits: { writer: "Najlaa Thufailah Shafut", designer: "Muhammad Athallah Khairi" },
    date: "September 29, 2025",
    location: "Malang",
    seo: {
      meta_title:
        "Jo's Week Long Adventure at ISUFST, Philippines - IELS Member Story",
      meta_description:
        "Follow George Abraham (Jo), a Project Leader at IELS and Computer Science student from Universitas Brawijaya, as he joins a cultural and academic exchange at ISUFST in the Philippines. Discover how English confidence opened doors to global opportunities.",
      meta_keywords:
        "IELS, member story, George Abraham, Jo, ISUFST, Philippines exchange, Universitas Brawijaya, student leadership, English confidence, global opportunities, academic exchange",
    },
  },
  {
    id: "2",
    title: "Shania's Journey: UNSIKA's Delegate Goes to Malaysia",
    subcategory: "Internals",
    content: `<div>
<div><strong>Shania Rizky Henanto—one of IELS's Project Leaders and a proud student of Universitas Singaperbangsa Karawang (UNSIKA)—stepped onto the international stage as Indonesia's representative at the prestigious ASEAN Classroom 2025 program.</strong></div>
<div>&nbsp;</div>
<div>Supported by her faculty and backed by her active journey with IELS, Shania joined the ASEAN Classroom alongside students from top universities across the region. For a week, she took part in <strong>international forums, cross-cultural discussions, and collaborative projects</strong> designed to strengthen regional cooperation among Southeast Asian youth.</div>
<div>&nbsp;</div>
<div>Being <strong>chosen as a delegate for UNSIKA</strong> was no small feat. It reflected years of her consistent participation in academic and organizational activities, and her passion for representing Indonesia in global platforms. From working with international peers to sharing perspectives on youth leadership, Shania carried both her identity and her country's pride with confidence.</div>
<div>&nbsp;</div>
<div><strong>"English was the key that unlocked it all,"</strong> Shania shared. <em>"I use English every single day at IELS, and that practice built my confidence. In international settings, people don't judge you like grammar police—they value your ideas and your courage to speak up."</em></div>
<div>&nbsp;</div>
<div>Through IELS, Shania found a space to sharpen her communication, collaborate with peers, and grow into a leader ready for the global stage. <strong>Her journey in Malaysia proves that when language meets opportunity, Indonesian students can shine brightly among the best in Southeast Asia.</strong></div>
<div>&nbsp;</div>
<div><em>"I want others to know that English isn't about perfection—it's about connection. The more you practice, the more confident you become. And with confidence, the world opens its doors to you."</em></div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Najlaa Thufailah Shafut</strong><br data-start="343" data-end="346" /> 🎨 Design <strong>by Muhammad Athallah Khairi</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DPJJ3zcgcJ5/?utm_source=ig_web_copy_link&igsh=MWhucW82a2dtMGhoYg==" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage:
      "/images/contents/stories/member-stories/banner/malaysia-banner.png",
    author: {
      name: "Shania Rizky Henanto",
      avatar: "/images/contents/stories/member-stories/profile/shania.png",
      role: "Project Leader, IELS · Universitas Singaperbangsa Karawang (UNSIKA)",
      country: "ID",
      instagram:
        "https://www.instagram.com/p/DPJJ3zcgcJ5/?utm_source=ig_web_copy_link&igsh=MWhucW82a2dtMGhoYg==",
    },
    highlights: [
      { value: "1 Week", label: "ASEAN Classroom 2025" },
      { value: "🇮🇩 → 🇲🇾", label: "delegate exchange" },
    ],
    quotes: [
      {
        text: "English isn't about perfection—it's about connection. The more you practice, the more confident you become.",
        attribution: "Shania",
      },
    ],
    storySections: [
      {
        title: "Representing Indonesia",
        content:
          "<p>Shania Rizky Henanto—one of IELS's Project Leaders and a proud student of Universitas Singaperbangsa Karawang (UNSIKA)—stepped onto the international stage as Indonesia's representative at the prestigious ASEAN Classroom 2025 program. For a week, she took part in international forums, cross-cultural discussions, and collaborative projects designed to strengthen regional cooperation among Southeast Asian youth.</p>",
      },
      {
        title: "Carrying Her Country's Pride",
        content:
          "<p>Being chosen as a delegate for UNSIKA was no small feat. It reflected years of consistent participation in academic and organizational activities, and her passion for representing Indonesia in global platforms.</p>",
      },
      {
        title: "English as the Key",
        content:
          "<p>Through IELS, Shania found a space to sharpen her communication, collaborate with peers, and grow into a leader ready for the global stage. Her journey in Malaysia proves that when language meets opportunity, Indonesian students can shine brightly among the best in Southeast Asia.</p>",
      },
    ],
    credits: { writer: "Najlaa Thufailah Shafut", designer: "Muhammad Athallah Khairi" },
    date: "September 29, 2025",
    location: "Jakarta",
    seo: {
      meta_title:
        "Shania's ASEAN Classroom 2025 Journey in Malaysia - IELS Member Story",
      meta_description:
        "Discover Shania Rizky Henanto's journey as a Project Leader at IELS and delegate from Universitas Singaperbangsa Karawang (UNSIKA) at the ASEAN Classroom 2025 in Malaysia. Learn how English and IELS shaped her confidence in international collaboration.",
      meta_keywords:
        "IELS, member story, Shania Rizky Henanto, ASEAN Classroom 2025, Malaysia, Universitas Singaperbangsa Karawang, UNSIKA, student delegate, international collaboration, English learning, global opportunities",
    },
  },
  {
    id: "3",
    title: "From Dreams to Reality: Sarah's Internship Journey in Singapore",
    subcategory: "Lounge",
    content: `<div>
<div><strong>Sarah Meuthya Zahwa—one of IELS's active community members—turned her long-time dream into reality by securing an internship at <em>Innovate Marketing Studio</em>, a digital marketing agency based in Singapore.</strong></div>
<div>&nbsp;</div>
<div>"Singapore has always been one of my dream countries," Sarah shared. Earlier this year, she discovered IELS's <strong>Step Up! program</strong> and immediately joined, hoping to gain mentorship on <strong>international internships and career preparation</strong>. "That's why I was interested in a mentorship focused on internships abroad—I wanted to gain experience working in a Singaporean setting," she said. <em>"And Step Up! exceeded my expectations!"</em></div>
<div>&nbsp;</div>
<div>Through Step Up!, Sarah learned that <strong>being skilled isn't enough—we also need to communicate our value effectively</strong>. The mentorship provided her with practical insight on personal branding and international communication, laying the foundation for her career breakthrough.</div>
<div>&nbsp;</div>
<div>Now interning abroad, Sarah is thriving in a <strong>fast-paced global environment</strong>. She embraces new experiences, adapts to diverse work cultures, and applies the lessons from Step Up! in her daily work. "Even now, I'm still using the communication tips I learned—from writing professional emails to maintaining active communication at work. These skills helped me build confidence and prepared me to face the career world."</div>
<div>&nbsp;</div>
<div><em>"For me, Step Up! isn't just a program—it's a long-term career investment. If you're looking for a practical learning experience to go international, don't hesitate to join Step Up! Vol. 2."</em></div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Valerine Aubrey Surjadi</strong><br data-start="343" data-end="346" /> 🎨 Design <strong>by Zainufri Aziz</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DPOLpNwkUAR/?img_index=1" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage:
      "/images/contents/stories/member-stories/banner/singapore-banner.png",
    author: {
      name: "Sarah Meuthya Zahwa",
      avatar: "/images/contents/stories/member-stories/profile/sarah.png",
      role: "IELS Community Member · Step Up! Alumna",
      country: "ID",
      instagram: "https://www.instagram.com/p/DPOLpNwkUAR/?img_index=1",
    },
    highlights: [{ value: "🇮🇩 → 🇸🇬", label: "internship abroad" }],
    quotes: [
      {
        text: "Step Up! isn't just a program—it's a long-term career investment.",
        attribution: "Sarah",
      },
    ],
    storySections: [
      {
        title: "A Dream Called Singapore",
        content:
          "<p>Sarah Meuthya Zahwa—one of IELS's active community members—turned her long-time dream into reality by securing an internship at Innovate Marketing Studio, a digital marketing agency based in Singapore. Earlier this year, she discovered IELS's Step Up! program and joined, hoping to gain mentorship on international internships and career preparation.</p>",
      },
      {
        title: "Learning to Communicate Her Value",
        content:
          "<p>Through Step Up!, Sarah learned that being skilled isn't enough—she also needed to communicate her value effectively. The mentorship provided practical insight on personal branding and international communication, laying the foundation for her career breakthrough.</p>",
      },
      {
        title: "Thriving Abroad",
        content:
          "<p>Now interning abroad, Sarah is thriving in a fast-paced global environment. She's still using the communication tips she learned—from writing professional emails to maintaining active communication at work.</p>",
      },
    ],
    credits: { writer: "Valerine Aubrey Surjadi", designer: "Zainufri Aziz" },
    date: "October 1, 2025",
    location: "Jakarta",
    seo: {
      meta_title:
        "Sarah's Internship Journey in Singapore with IELS Step Up! - Member Story",
      meta_description:
        "Read how Sarah Meuthya Zahwa, an IELS community member, transformed her dream into reality through the Step Up! program, leading to her internship at a Singaporean digital marketing agency.",
      meta_keywords:
        "IELS, member story, Sarah Meuthya Zahwa, Step Up! program, Singapore internship, Innovate Marketing Studio, international career, personal branding, communication skills, global opportunities",
    },
  },
  {
    id: "4",
    title: "Hitting Career Marks: Rafi's Internship Journey in Singapore",
    subcategory: "Lounge",
    content: `<div>
<div><strong>Muhammad Rafi Al Azhim—an aspiring tech talent and former Software Engineer Intern at <em>Bamboo System Technology</em>, a Singapore-based tech company—achieved his career milestone through international internship experience.</strong></div>
<div>&nbsp;</div>
<div>From the very beginning, Rafi had set his sights on <strong>international internships</strong>. The relevant insights and skills offered in IELS's <strong>Step Up! program</strong> became his biggest motivation to join. "Step Up! went beyond my hopes," he recalled. <em>"I learned everything from how to introduce myself to create a strong impression to how to compete in the current global career landscape."</em></div>
<div>&nbsp;</div>
<div>With the knowledge and confidence gained from Step Up!, Rafi felt <strong>more prepared to apply abroad</strong>. The mentorship gave him not only soft skills but also practical tools such as CV reviews and pitching sessions. "What was really useful to me was the CV review and pitching sessions. They helped me create more professional CVs and understand how to present myself in job applications."</div>
<div>&nbsp;</div>
<div>His internship in Singapore proved to be a <strong>precious professional experience</strong>. "I learned firsthand about working in an international company, especially about their professional culture and expectations," Rafi shared. There were certainly challenges, but they became opportunities for growth and resilience in a fast-paced industry.</div>
<div>&nbsp;</div>
<div><em>"I would definitely recommend joining Step Up! Vol. 2. It's a wonderful chance to upgrade your skills in preparation for global challenges, and even to chase international career opportunities."</em></div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Valerine Aubrey Surjadi</strong><br data-start="343" data-end="346" /> 🎨 Design <strong>by Zainufri Aziz</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DPOLpNwkUAR/?img_index=1" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage:
      "/images/contents/stories/member-stories/banner/singapore-banner.png",
    author: {
      name: "Muhammad Rafi Al Azhim",
      avatar: "/images/contents/stories/member-stories/profile/rafi.png",
      role: "IELS Community Member · Step Up! Alumnus · Software Engineer Intern",
      country: "ID",
      instagram: "https://www.instagram.com/p/DPOLpNwkUAR/?img_index=1",
    },
    highlights: [{ value: "🇮🇩 → 🇸🇬", label: "software engineer internship" }],
    quotes: [
      {
        text: "It's a wonderful chance to upgrade your skills in preparation for global challenges, and even to chase international career opportunities.",
        attribution: "Rafi",
      },
    ],
    storySections: [
      {
        title: "Setting His Sights Abroad",
        content:
          "<p>Muhammad Rafi Al Azhim—an aspiring tech talent—set his sights on international internships from the very beginning. The insights and skills offered in IELS's Step Up! program became his biggest motivation to join. \"I learned everything from how to introduce myself to create a strong impression, to how to compete in the current global career landscape.\"</p>",
      },
      {
        title: "Building Real Skills",
        content:
          "<p>The mentorship gave him not only soft skills but also practical tools such as CV reviews and pitching sessions. \"They helped me create more professional CVs and understand how to present myself in job applications.\"</p>",
      },
      {
        title: "Working Inside a Singaporean Company",
        content:
          "<p>His internship as a Software Engineer Intern at Bamboo System Technology proved to be a precious professional experience. \"I learned firsthand about working in an international company, especially about their professional culture and expectations.\"</p>",
      },
    ],
    credits: { writer: "Valerine Aubrey Surjadi", designer: "Zainufri Aziz" },
    date: "October 1, 2025",
    location: "Jakarta",
    seo: {
      meta_title:
        "Rafi's Internship Journey in Singapore with IELS Step Up! - Member Story",
      meta_description:
        "Discover how Muhammad Rafi Al Azhim, an IELS community member, prepared for and succeeded in his international internship at Bamboo System Technology in Singapore through the Step Up! program.",
      meta_keywords:
        "IELS, member story, Muhammad Rafi Al Azhim, Step Up! program, Singapore internship, Bamboo System Technology, software engineer, CV review, pitching, international career, global opportunities",
    },
  },
  {
    id: "5",
    title: "Living the Dream: Nyiur's Semester in the U.S. with Global UGRAD",
    subcategory: "Speakers",
    content: `<div>
<div><strong>Nyiur Salsabila Frida, a student from Universitas Islam Negeri Maulana Malik Ibrahim Malang, turned her dream into reality when she was selected as an awardee of the <em>Global Undergraduate Exchange Program (Global UGRAD)</em> and studied for one semester at <em>Southern Illinois University Edwardsville</em> in the United States.</strong></div>
<div>&nbsp;</div>
<div>Believe it or not, she first learned about <strong>Global UGRAD</strong> only <strong>two weeks before the application deadline</strong>. With very limited time but strong motivation, she applied. "It honestly felt like I was living in a dream… something I've always wished for," Nyiur recalled.</div>
<div>&nbsp;</div>
<div>The process wasn't easy. "Besides the essay, the interview was the hardest part for me," she admitted. It was more than understanding her essay—it required <strong>thinking and responding in English spontaneously</strong>. Yet, she found her key insight through authenticity: <em>"Embrace your true self! If you truly know yourself, you'll understand what you wrote in your essay, and you can easily answer any question in the interview."</em></div>
<div>&nbsp;</div>
<div>For Nyiur, every application is a <strong>learning process</strong>. From writing her very first essay to strengthening her English skills, the journey became a training ground for growth. "Unless we dare to try, the lessons remain unlearned, and true readiness, forever out of reach."</div>
<div>&nbsp;</div>
<div>Through Global UGRAD, Nyiur not only experienced academic life in the U.S. but also learned confidence, perseverance, and the importance of authenticity—insights she later shared as a <strong>speaker in the IELS Insight Series</strong>, inspiring other Indonesian students to believe in their potential.</div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Najlaa Thufailah Shafut</strong><br data-start="343" data-end="346" /> 🎨 Design <strong>by Queen Rahma</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DMhz-j3h4ly/?img_index=2" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage:
      "/images/contents/stories/member-stories/banner/usa-banner.png",
    author: {
      name: "Nyiur Salsabila Frida",
      avatar: "/images/contents/stories/member-stories/profile/nyiur.png",
      role: "IELS Speaker · UIN Maulana Malik Ibrahim Malang",
      country: "ID",
      instagram: "https://www.instagram.com/p/DMhz-j3h4ly/?img_index=2",
    },
    highlights: [
      { value: "1 Semester", label: "Global UGRAD in the U.S." },
      { value: "2 Weeks", label: "from discovery to applying" },
      { value: "🇮🇩 → 🇺🇸", label: "exchange program" },
    ],
    quotes: [
      {
        text: "Embrace your true self! If you truly know yourself, you'll understand what you wrote in your essay, and you can easily answer any question in the interview.",
        attribution: "Nyiur",
      },
    ],
    storySections: [
      {
        title: "A Dream Discovered Two Weeks Before the Deadline",
        content:
          "<p>Nyiur Salsabila Frida turned her dream into reality when she was selected as an awardee of the Global Undergraduate Exchange Program (Global UGRAD) and studied for one semester at Southern Illinois University Edwardsville. She first learned about Global UGRAD only two weeks before the application deadline. \"It honestly felt like I was living in a dream… something I've always wished for.\"</p>",
      },
      {
        title: "The Hardest Part: The Interview",
        content:
          "<p>\"Besides the essay, the interview was the hardest part for me,\" she admitted. It required thinking and responding in English spontaneously — and she found her key insight through authenticity.</p>",
      },
      {
        title: "Every Application Is a Lesson",
        content:
          "<p>\"Unless we dare to try, the lessons remain unlearned, and true readiness, forever out of reach.\" Through Global UGRAD, Nyiur learned confidence, perseverance, and the importance of authenticity — insights she later shared as a speaker in the IELS Insight Series.</p>",
      },
    ],
    credits: { writer: "Najlaa Thufailah Shafut", designer: "Queen Rahma" },
    date: "July 20, 2025",
    location: "Edwardsville, U.S.",
    seo: {
      meta_title:
        "Nyiur's Semester in the U.S. with Global UGRAD - Member Story",
      meta_description:
        "Discover how Nyiur Salsabila Frida from Universitas Islam Negeri Maulana Malik Ibrahim Malang joined the Global UGRAD program and studied a semester at Southern Illinois University Edwardsville in the U.S. Her story of courage, authenticity, and growth will inspire you.",
      meta_keywords:
        "IELS, member story, Nyiur Salsabila Frida, Global UGRAD, Southern Illinois University Edwardsville, U.S. exchange, student experience, English confidence, scholarship journey, global opportunities",
    },
  },
  {
    id: "6",
    title:
      "Making Dreams of Studying in the U.S. a Reality: Zaki's Global UGRAD Journey",
    subcategory: "Speakers",
    content: `<div>
<div><strong>Muhammad Zaki Fazansyah, a Biomedical Engineering student at ITB and Vice President of IEEE ITB SB (2024-2025), turned his aspiration of studying abroad into reality through the <em>Global Undergraduate Exchange Program (Global UGRAD)</em>.</strong></div>
<div>&nbsp;</div>
<div>Fresh out of high school, Zaki made it his goal to study abroad. Inspired by his relatives, he wanted firsthand experience of education and culture in other countries. In August 2023, he applied for Global UGRAD, and in 2024, he departed to the U.S. to spend a semester at the <strong>University of South Dakota</strong>.</div>
<div>&nbsp;</div>
<div>For Zaki, the program was much more than an academic opportunity. "Even though the topics were similar," he explained, "it was insightful to see how technological advancements shaped education there. It definitely broadened my academic knowledge."</div>
<div>&nbsp;</div>
<div>Beyond academics, Zaki immersed himself in the social scene of a multicultural environment. "It was truly a cultural experience," he said. Meeting people from around the world deepened his appreciation for diversity, while also strengthening his pride in Indonesian heritage. "I was eager to introduce my own culture to the people there."</div>
<div>&nbsp;</div>
<div>Through his journey with Global UGRAD, Zaki not only gained academic insight but also developed a broader worldview. His experience became a powerful chapter in his personal and academic growth, one he later shared as a <strong>speaker in the IELS Insight Series</strong> to inspire other students dreaming of global opportunities.</div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Valerine Aubrey Surjadi</strong><br data-start="343" data-end="346" /> 🎨 Design <strong>by Zainufri Aziz</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DMkQwjbhqrT/?img_index=1" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage:
      "/images/contents/stories/member-stories/banner/usa-banner.png",
    author: {
      name: "Muhammad Zaki Fazansyah",
      avatar: "/images/contents/stories/member-stories/profile/zaki.png",
      role: "IELS Speaker · VP, IEEE ITB SB · Biomedical Engineering, ITB",
      country: "ID",
      instagram: "https://www.instagram.com/p/DMkQwjbhqrT/?img_index=1",
    },
    highlights: [
      { value: "1 Semester", label: "at University of South Dakota" },
      { value: "🇮🇩 → 🇺🇸", label: "Global UGRAD exchange" },
    ],
    quotes: [
      {
        text: "It was truly a cultural experience. I was eager to introduce my own culture to the people there.",
        attribution: "Zaki",
      },
    ],
    storySections: [
      {
        title: "From High School Dream to Global UGRAD",
        content:
          "<p>Fresh out of high school, Zaki made it his goal to study abroad. In August 2023, he applied for Global UGRAD, and in 2024, he departed to the U.S. to spend a semester at the University of South Dakota.</p>",
      },
      {
        title: "A Broader Academic View",
        content:
          "<p>\"Even though the topics were similar, it was insightful to see how technological advancements shaped education there. It definitely broadened my academic knowledge.\"</p>",
      },
      {
        title: "Sharing Indonesian Culture Abroad",
        content:
          "<p>Meeting people from around the world deepened his appreciation for diversity, while also strengthening his pride in Indonesian heritage. His experience became a chapter he later shared as a speaker in the IELS Insight Series.</p>",
      },
    ],
    credits: { writer: "Valerine Aubrey Surjadi", designer: "Zainufri Aziz" },
    date: "July 26, 2025",
    location: "South Dakota, U.S.",
    seo: {
      meta_title:
        "Zaki's Global UGRAD Journey at University of South Dakota - IELS Speaker Story",
      meta_description:
        "Read how Muhammad Zaki Fazansyah, a Biomedical Engineering student at ITB, fulfilled his dream of studying in the U.S. through the Global UGRAD program, and how this experience shaped his academic and cultural perspective.",
      meta_keywords:
        "IELS, speaker story, Muhammad Zaki Fazansyah, Global UGRAD, University of South Dakota, biomedical engineering, international exchange, scholarship journey, cultural exchange, academic growth",
    },
  },
  {
    id: "7",
    title:
      "Proving Doubts Wrong: Yosua's Journey as a Business Proposal Competition Winner",
    subcategory: "Internals",
    content: `<div>
<div><strong>Yosua, a Universitas Indonesia student and Project Marketing Associate at IELS, challenged his own doubts by stepping into a business proposal competition—despite not coming from a business background.</strong></div>
<div>&nbsp;</div>
<div>"My main reason for joining was to prove that anyone can become anything they want, regardless of major, faculty, or background," Yosua shared. Still, the doubt lingered. <em>"Can someone who isn't from a business background actually win a business competition?"</em></div>
<div>&nbsp;</div>
<div>Instead of stepping back, Yosua chose to move forward. He committed himself fully to the process—researching, refining ideas, and continuously learning along the way. "But we must keep moving forward," he asserted. That mindset became the foundation of his growth.</div>
<div>&nbsp;</div>
<div>One of his biggest advantages came from his <strong>English proficiency</strong>. Most of the research materials he relied on were written in English, allowing him to access broader perspectives and stronger references during the preparation stage.</div>
<div>&nbsp;</div>
<div>Through persistence and self-belief, Yosua proved that background does not define capability. His journey stands as a reminder that confidence, consistency, and willingness to learn can open doors far beyond one's original field of study.</div>
<div>&nbsp;</div>
<div><em>"English is that important. You'll find countless opportunities once you can speak it. Even if you have many doubts, keep walking—and you'll get there."</em></div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Valerine Aubrey Surjadi</strong><br /> 🎨 Design <strong>by Zainufri Aziz</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DP5yWFikS-L/?img_index=1" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage:
      "/images/contents/stories/member-stories/banner/usa-banner.png",
    author: {
      name: "Yosua",
      avatar: "/images/contents/stories/member-stories/profile/yosua.png",
      role: "Project Marketing Associate, IELS · Universitas Indonesia",
      country: "ID",
      instagram: "https://www.instagram.com/p/DP5yWFikS-L/?img_index=1",
    },
    quotes: [
      {
        text: "English is that important. You'll find countless opportunities once you can speak it. Even if you have many doubts, keep walking—and you'll get there.",
        attribution: "Yosua",
      },
    ],
    storySections: [
      {
        title: "Doubting Himself",
        content:
          "<p>Yosua, a Universitas Indonesia student and Project Marketing Associate at IELS, challenged his own doubts by stepping into a business proposal competition—despite not coming from a business background. \"Can someone who isn't from a business background actually win a business competition?\"</p>",
      },
      {
        title: "Choosing to Move Forward",
        content:
          "<p>Instead of stepping back, Yosua chose to move forward. He committed himself fully to the process—researching, refining ideas, and continuously learning along the way.</p>",
      },
      {
        title: "English as an Advantage",
        content:
          "<p>One of his biggest advantages came from his English proficiency — most of the research materials he relied on were written in English, giving him access to broader perspectives and stronger references.</p>",
      },
    ],
    credits: { writer: "Valerine Aubrey Surjadi", designer: "Zainufri Aziz" },
    date: "October 3, 2025",
    location: "Depok, Indonesia",
    seo: {
      meta_title:
        "Yosua's Business Proposal Competition Journey - IELS Internal Story",
      meta_description:
        "Read how Yosua, an IELS internal member and Universitas Indonesia student, overcame doubts and won a business proposal competition by leveraging confidence, persistence, and English proficiency.",
      meta_keywords:
        "IELS internal story, Yosua IELS, business proposal competition, English advantage, student achievement, self growth, academic confidence",
    },
  },
  {
    id: "8",
    title:
      "Learning Through Challenge: Fauzi's Experience in a Business Proposal Competition",
    subcategory: "Internals",
    content: `<div>
<div><strong>Fauzi, a Universitas Indonesia student and Project Marketing Associate at IELS, sees every new experience as a chance to grow—and the business proposal competition was no exception.</strong></div>
<div>&nbsp;</div>
<div>Driven by curiosity and a desire to learn, Fauzi signed up for the competition with an open mindset. "There were definite challenges," he recalled, especially during the pitching session, which he described as confusing and anxiety-inducing. <em>"But the experience was super fun."</em></div>
<div>&nbsp;</div>
<div>Rather than focusing solely on the outcome, Fauzi embraced the learning process. Navigating pressure, structuring ideas, and presenting them clearly became valuable lessons that extended beyond the competition itself.</div>
<div>&nbsp;</div>
<div>His English communication skills also played an important role. "The communication skills I learned in English translated directly into how I prepared," Fauzi shared. They gave him a strong reference point for understanding what effective marketing messages and impactful pitches look like.</div>
<div>&nbsp;</div>
<div>For Fauzi, the competition offered more than a title. It sharpened his confidence, expanded his perspective, and reinforced the idea that growth often comes from stepping into unfamiliar territory.</div>
<div>&nbsp;</div>
<div><em>Enjoy the process, stay curious, and keep learning—because every challenge carries lessons worth taking.</em></div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Valerine Aubrey Surjadi</strong><br /> 🎨 Design <strong>by Zainufri Aziz</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DP5yWFikS-L/?img_index=1" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage:
      "/images/contents/stories/member-stories/banner/usa-banner.png",
    author: {
      name: "Fauzi",
      avatar: "/images/contents/stories/member-stories/profile/fauzi.png",
      role: "Project Marketing Associate, IELS · Universitas Indonesia",
      country: "ID",
      instagram: "https://www.instagram.com/p/DP5yWFikS-L/?img_index=1",
    },
    quotes: [
      {
        text: "Enjoy the process, stay curious, and keep learning—because every challenge carries lessons worth taking.",
        attribution: "Fauzi",
      },
    ],
    storySections: [
      {
        title: "Signing Up With Curiosity",
        content:
          "<p>Fauzi, a Universitas Indonesia student and Project Marketing Associate at IELS, signed up for the business proposal competition with an open mindset. \"There were definite challenges,\" he recalled, especially during the pitching session. \"But the experience was super fun.\"</p>",
      },
      {
        title: "Learning Through Pressure",
        content:
          "<p>Rather than focusing solely on the outcome, Fauzi embraced the learning process. Navigating pressure, structuring ideas, and presenting them clearly became valuable lessons that extended beyond the competition itself.</p>",
      },
      {
        title: "English Behind the Pitch",
        content:
          "<p>\"The communication skills I learned in English translated directly into how I prepared.\" They gave him a strong reference point for what effective marketing messages and impactful pitches look like.</p>",
      },
    ],
    credits: { writer: "Valerine Aubrey Surjadi", designer: "Zainufri Aziz" },
    date: "October 3, 2025",
    location: "Depok, Indonesia",
    seo: {
      meta_title:
        "Fauzi's Learning Journey in a Business Proposal Competition - IELS Internal Story",
      meta_description:
        "Discover how Fauzi, an IELS internal member, embraced challenges and personal growth through a business proposal competition, gaining confidence and communication skills along the way.",
      meta_keywords:
        "IELS internal story, Fauzi IELS, student competition experience, English communication skills, learning journey, self development",
    },
  },
  {
    id: "9",
    title: "Exchange to Japan with English: Dzakwaan's Journey at Tohoku University",
    subcategory: "Lounge",
    content: `<div>
<div><strong>Ahmad Zakwaan Haniif Herefa, an Aerospace Engineering student from Institut Teknologi Bandung, is currently pursuing his long-time dream through an exchange program at <em>Tohoku University</em>, Japan.</strong></div>
<div>&nbsp;</div>
<div>Robotics and aerospace engineering have always been at the core of Dzakwaan's interests. Alongside his passion for technology, he enjoys playing ping pong and exploring new places. Since high school, studying abroad—especially in Japan—had been his dream. "I admire Japan's clean cities and advanced technology," he shared. <em>"I really wanted to experience living and studying here."</em></div>
<div>&nbsp;</div>
<div>After spending nearly two months in Japan, Dzakwaan describes the experience as eye-opening. From the environment and culture to the overall quality of life, Japan felt very different from Indonesia. He has also built friendships with international students at Tohoku University, which strengthened his global communication skills and appreciation for Japan's culture of discipline.</div>
<div>&nbsp;</div>
<div>Academically, the experience has been equally exciting. His classes and research are conducted fully in English, making it easier for him to follow discussions and collaborate. Studying in an international space robotics laboratory alongside undergraduate, master's, PhD, and postdoctoral researchers has been one of the most inspiring parts of his journey.</div>
<div>&nbsp;</div>
<div>Despite having limited Japanese proficiency, Dzakwaan found that <strong>English played a far more crucial role</strong> in the exchange process. From administrative requirements and registration—often involving English proficiency certificates such as IELTS, TOEFL, or TOEIC—to university classes, research activities, and social interactions, English became the main bridge throughout his exchange experience.</div>
<div>&nbsp;</div>
<div><em>"English skills are the key to unlocking global opportunity."</em></div>
<div>&nbsp;</div>
<div>Reflecting on his journey, Dzakwaan encourages others to dream boldly and take action. <em>"The most important thing is to have the courage to dream and try. Not everyone has the courage to do that. It's better to try and fail than fail to try."</em></div>
<div>&nbsp;</div>
</div>
<h4>✍️ Content Written <strong>by Valerine Aubrey Surjadi</strong><br /> 🎨 Design <strong>by IELS Creative Team</strong></h4>
<p>&nbsp;</p>
<a href="https://www.instagram.com/p/DRt0M7ngZIK/?img_index=1" target="_blank"
   style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background-color: #E56668;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  "
  onmouseover="this.style.backgroundColor='#C04C4E'"
  onmouseout="this.style.backgroundColor='#E56668'"
  onmousedown="this.style.transform='scale(0.97)'"
  onmouseup="this.style.transform='scale(1)'"
>
  Read More
</a>`,
    bannerImage: "/images/contents/stories/member-stories/banner/japan.png",
    author: {
      name: "Ahmad Zakwaan Haniif Herefa",
      avatar: "/images/contents/stories/member-stories/profile/dzakwan.png",
      role: "IELS Circle Member · Aerospace Engineering, ITB",
      country: "ID",
      instagram: "https://www.instagram.com/p/DRt0M7ngZIK/?img_index=1",
    },
    highlights: [
      { value: "2 Months", label: "exchange at Tohoku University" },
      { value: "🇮🇩 → 🇯🇵", label: "engineering exchange" },
    ],
    quotes: [
      {
        text: "English skills are the key to unlocking global opportunity.",
        attribution: "Dzakwaan",
      },
    ],
    storySections: [
      {
        title: "A Childhood Dream of Japan",
        content:
          "<p>Ahmad Zakwaan Haniif Herefa, an Aerospace Engineering student from ITB, is pursuing his long-time dream through an exchange program at Tohoku University, Japan. \"I admire Japan's clean cities and advanced technology. I really wanted to experience living and studying here.\"</p>",
      },
      {
        title: "Two Months In",
        content:
          "<p>After spending nearly two months in Japan, Dzakwaan describes the experience as eye-opening. He's built friendships with international students at Tohoku University, strengthening his global communication skills and appreciation for Japan's culture of discipline.</p>",
      },
      {
        title: "Studying Entirely in English",
        content:
          "<p>Despite having limited Japanese proficiency, Dzakwaan found that English played a far more crucial role — from administrative requirements and registration to classes, research, and social interactions.</p>",
      },
    ],
    credits: { writer: "Valerine Aubrey Surjadi", designer: "IELS Creative Team" },
    date: "October 2025",
    location: "Sendai, Japan",
    seo: {
      meta_title:
        "Dzakwaan's Exchange Journey in Japan with English - IELS Lounge Story",
      meta_description:
        "Read how Ahmad Zakwaan Haniif Herefa, an ITB student and IELS Lounge member, pursued an exchange program at Tohoku University, Japan—using English as the key to global academic opportunities.",
      meta_keywords:
        "IELS Lounge, exchange to Japan, Tohoku University, ITB student exchange, English for exchange program, global academic experience, student story Japan",
    },
  },
];