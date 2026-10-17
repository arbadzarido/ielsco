// FICTIONAL demo members for previewing the People directory. They are NOT real users and are
// never written to the database. Shown only when NEXT_PUBLIC_SHOW_DEMO_DATA is not "false".
// IDs start with "demo-" and contact links are intentionally empty.

import type { DirectoryMember } from "@/lib/dashboard/types";

const demo = (m: Omit<DirectoryMember, "is_demo" | "avatar_url" | "linkedin_url" | "instagram_url" | "portfolio_url">): DirectoryMember => ({
  ...m,
  avatar_url: null,
  linkedin_url: null,
  instagram_url: null,
  portfolio_url: null,
  is_demo: true,
});

export const DEMO_MEMBERS: DirectoryMember[] = [
  demo({
    id: "demo-01", display_name: "Nadia Putri", origin_country: "Indonesia", country: "Indonesia", role_status: "University student",
    bio: "Final-year economics student preparing a master's application.", destination_country: "Australia",
    direction: "study", interests: ["Scholarships", "Academic English"],
  }),
  demo({
    id: "demo-02", display_name: "Minh Tran", origin_country: "Vietnam", country: "Vietnam", role_status: "Fresh graduate",
    bio: "Software engineering graduate looking for a remote internship.", destination_country: "Singapore",
    direction: "work", interests: ["Internships", "Interview English"],
  }),
  demo({
    id: "demo-03", display_name: "Aisyah Rahman", origin_country: "Malaysia", country: "Malaysia", role_status: "High school student",
    bio: "Curious about studying abroad but still exploring options.", destination_country: "Not decided yet",
    direction: "explore", interests: ["Improve my English", "Explore global opportunities"],
  }),
  demo({
    id: "demo-04", display_name: "Joshua Reyes", origin_country: "Philippines", country: "Singapore", role_status: "Working professional",
    bio: "Customer success lead practising English for international meetings.", destination_country: "Singapore",
    direction: "work", interests: ["Workplace communication", "Job applications"],
  }),
  demo({
    id: "demo-05", display_name: "Ploy Srisuk", origin_country: "Thailand", country: "Thailand", role_status: "University student",
    bio: null, destination_country: "Malaysia",
    direction: "study", interests: ["Exchange / short programs", "Academic English"],
  }),
  demo({
    id: "demo-06", display_name: "Rizky Pratama", origin_country: "Indonesia", country: "Indonesia", role_status: "Fresh graduate",
    bio: "Public health graduate drafting scholarship essays.", destination_country: "United Kingdom",
    direction: "study", interests: ["Scholarships", "University applications"],
  }),
  demo({
    id: "demo-07", display_name: "Sokha Chan", origin_country: "Cambodia", country: null, role_status: null,
    bio: null, destination_country: "Not decided yet",
    direction: "explore", interests: ["Meet people with similar goals", "Improve my English"],
  }),
  demo({
    id: "demo-08", display_name: "Daniel Lim", origin_country: null, country: "Singapore", role_status: "Working professional",
    bio: "Marketing analyst preparing for interviews with global companies.", destination_country: "United States",
    direction: "work", interests: ["Interview English", "Job applications"],
  }),
  demo({
    id: "demo-09", display_name: "Lan Nguyen", origin_country: "Vietnam", country: "Vietnam", role_status: "University student",
    bio: "Biology student researching master's programmes in Singapore.", destination_country: "Singapore",
    direction: "study", interests: ["University applications", "Scholarships"],
  }),
  demo({
    id: "demo-10", display_name: "Farhan Hakim", origin_country: "Brunei Darussalam", country: "Brunei Darussalam", role_status: "Educator",
    bio: "English tutor exploring short teaching programmes around the region.", destination_country: "South Korea",
    direction: "explore", interests: ["Explore global opportunities", "Meet people with similar goals"],
  }),
];
