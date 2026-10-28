// IELSco Connect shapes, as returned by the RPCs in supabase/migrations/20261028*_connect_*.sql.

export interface Passport {
  exists: boolean;
  display_name: string;
  avatar_url: string | null;
  origin_country: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  bio: string | null;
  english_level: string | null;
  languages_spoken: string[];
  languages_learning: string[];
  learning_goal: string | null;
  topics: string[];
  activities: string[];
  goals: string[];
  availability_days: string[];
  availability_times: string[];
  status: "open" | "busy" | null;
  discoverable: boolean;
  guidelines_accepted: boolean;
  adult_confirmed: boolean;
  public_fields: string[];
}

export type Relation = "connected" | "request_sent" | "request_received" | null;

// Privacy-masked member card (connect_card). city/timezone are only filled for mutual connections.
export interface Person {
  id: string;
  display_name: string;
  avatar_url: string | null;
  origin_country: string | null;
  country: string | null;
  role_status: string | null;
  bio: string | null;
  english_level: string | null;
  languages_spoken: string[];
  languages_learning: string[];
  learning_goal: string | null;
  topics: string[];
  activities: string[];
  goals: string[];
  availability_days: string[];
  availability_times: string[];
  status: "open" | "busy" | null;
  city: string | null;
  timezone: string | null;
  relation?: Relation;
}

export interface DiscoverRow {
  person: Person;
  score: number;
  they_teach: string[];
  they_learn: string[];
  shared_topics: string[];
  shared_goals: string[];
  shared_days: string[];
  relation: Relation;
}

export interface DiscoverFilters {
  search: string;
  country: string;
  speaks: string;
  learning: string;
  englishLevel: string;
  topic: string;
  goal: string;
  activity: string;
  day: string;
}

export interface IntroRequest {
  id: string;
  box: "incoming" | "outgoing";
  status: "pending" | "accepted" | "declined" | "cancelled";
  message: string;
  reason: string | null;
  common: string | null;
  topic: string | null;
  created_at: string;
  responded_at: string | null;
  person: Person | null;
}

export interface ConnectionRow {
  person: Person;
  source: "intro" | "quick_match";
  connected_at: string;
  last_body: string | null;
  last_at: string | null;
  last_mine: boolean | null;
  unread: number;
  blocked: boolean;
}

export interface Message {
  id: number;
  mine: boolean;
  body: string;
  created_at: string;
}

export interface ConnectSummary {
  ready: boolean;
  discoverable: boolean;
  incoming: number;
  outgoing: number;
  connections: number;
  unread: number;
  rooms_joined: number;
  rooms_hosting: number;
}

export type RoomState = "draft" | "cancelled" | "completed" | "live" | "full" | "closed" | "open";

export interface Room {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  category: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  duration_min: number;
  capacity: number;
  registered_count: number;
  language: string;
  registration_deadline: string | null;
  visibility: "members" | "unlisted";
  status: "draft" | "published" | "cancelled";
  delivery: "discord" | "external_link" | "ielsco_hosted";
  host: { id: string; display_name: string; avatar_url: string | null };
  is_host: boolean;
  is_registered: boolean;
  state: RoomState;
}

export interface RoomInput {
  title: string;
  description: string;
  topic: string;
  category: string;
  starts_at: string;
  timezone: string;
  duration_min: number;
  capacity: number;
  language: string;
  registration_deadline: string | null;
  visibility: "members" | "unlisted";
  delivery: "discord" | "external_link";
  meeting_url: string;
  meeting_notes: string;
  publish?: boolean;
}

export interface MeetingDetails {
  delivery: Room["delivery"];
  meeting_url: string | null;
  meeting_notes: string | null;
}

export type CallMode = "voice" | "video";
export type CallStyle = "ai_topic" | "free_talk";

export interface QuickMatchState {
  enabled: boolean;
  ready: boolean;
  waiting: { mode: CallMode; style: CallStyle; since: string } | null;
  call_id: string | null;
}

export interface CallInfo {
  id: string;
  mode: CallMode;
  style: CallStyle;
  role: "caller" | "callee";
  prompt: string | null;
  other: { id: string; display_name: string; avatar_url: string | null };
  created_at: string;
  expires_at: string;
  server_now: string;
  ended: boolean;
  end_reason: string | null;
  ended_by_me: boolean;
  my_connect: boolean | null;
  my_enjoyed: boolean | null;
  connected: boolean;
}

export type CircleColor = "teal" | "coral" | "violet" | "amber" | "navy" | "green";

export interface Circle {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  color: CircleColor;
  room_categories: string[];
  members: number;
  posts_7d: number;
  last_post_at: string | null;
  is_member: boolean;
}

export interface CircleAuthor { id: string; display_name: string; avatar_url: string | null }

export interface CircleReply { id: string; body: string; created_at: string; mine: boolean; author: CircleAuthor }

export interface CirclePost {
  id: string;
  author: CircleAuthor;
  body: string;
  is_prompt: boolean;
  created_at: string;
  mine: boolean;
  replies: CircleReply[];
}
