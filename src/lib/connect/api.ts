// Browser-side calls to the IELSco Connect RPCs. Every rule (who may see, contact, register, match) is enforced in the
// database functions; these wrappers only shape arguments and turn error codes into sentences people can act on.
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRelation } from "@/lib/dashboard/profile";
import type {
  CallInfo, CallMode, CallStyle, ConnectionRow, ConnectSummary, DiscoverFilters, DiscoverRow, IntroRequest, MeetingDetails,
  Message, Passport, Person, QuickMatchState, Room, RoomInput,
} from "./types";

// Thrown while the Connect migrations are not applied yet; pages show a "not switched on yet" notice.
export class ConnectUnavailableError extends Error {
  constructor() {
    super("IELSco Connect isn't switched on yet: its database update is pending. Nothing was saved.");
    this.name = "ConnectUnavailableError";
  }
}

const MESSAGES: Record<string, string> = {
  passport_required: "Finish your Passport first: add a display name, accept the Connect guidelines and confirm you are 18 or older.",
  display_name_required: "Add a display name of at least 2 characters.",
  guidelines_and_age_required: "To appear in Discover, accept the Connect guidelines and confirm you are 18 or older.",
  invalid_timezone: "Choose a time zone from the list.",
  not_available: "This member isn't available to contact.",
  already_connected: "You're already connected. Send a message instead.",
  already_pending: "You've already sent an intro to this member. Wait for their answer.",
  they_asked_you: "This member already sent you an intro. Open your requests to answer it.",
  cooldown: "This member declined your last intro. You can try again 30 days after their answer.",
  rate_limited: "You've reached the limit for now. Please try again later.",
  message_too_short: "Write at least 20 characters so they know who you are.",
  request_not_pending: "This request was already answered or cancelled.",
  not_connected: "You can only message mutual connections. Send an intro first.",
  empty_message: "Write a message first.",
  room_not_found: "This room doesn't exist or isn't available to you.",
  room_cancelled: "This room was cancelled.",
  room_completed: "This room has already ended.",
  room_not_open: "This room isn't open for registration.",
  registration_closed: "Registration for this room has closed.",
  full: "This room is full.",
  host_cannot_register: "You're hosting this room, so you don't need to register.",
  not_registered: "You're not registered for this room (or it has already ended).",
  start_in_past: "Choose a start time at least 15 minutes from now.",
  start_too_far: "Rooms can be scheduled up to 180 days ahead.",
  deadline_after_start: "The registration deadline must be before the start time.",
  invalid_duration: "Duration must be between 15 and 240 minutes.",
  invalid_capacity: "Capacity must be between 2 and 500 people.",
  capacity_below_registrations: "Capacity can't be lower than the number of people already registered.",
  invalid_meeting_url: "The meeting link must start with https://.",
  invalid_discord_url: "For Discord rooms, use a discord.gg or discord.com link.",
  invalid_delivery: "Choose where the room takes place.",
  title_required: "Add a title (at least 3 characters).",
  quick_match_disabled: "Quick Match isn't switched on yet.",
  call_not_found: "This call isn't available.",
  call_not_active: "This call has ended.",
  call_not_ended: "The call is still running.",
};

function friendly(message: string) {
  const code = Object.keys(MESSAGES).find((k) => new RegExp(`\\b${k}\\b`).test(message));
  return code ? MESSAGES[code] : `Something went wrong: ${message}`;
}

async function call<T>(supabase: SupabaseClient, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (isMissingRelation(error)) throw new ConnectUnavailableError();
    throw new Error(friendly(error.message));
  }
  return data as T;
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);

export const connectApi = {
  summary: (s: SupabaseClient) => call<ConnectSummary>(s, "connect_summary"),
  myPassport: (s: SupabaseClient) => call<Passport>(s, "my_passport"),
  savePassport: (s: SupabaseClient, p: Partial<Passport> & { accept_guidelines?: boolean; confirm_adult?: boolean }) =>
    call<Passport>(s, "save_passport", { p }),

  discover: (s: SupabaseClient, f: DiscoverFilters, offset: number, limit: number) =>
    call<DiscoverRow[]>(s, "list_connect_people", {
      p_search: orNull(f.search), p_country: orNull(f.country), p_speaks: orNull(f.speaks), p_learning: orNull(f.learning),
      p_english_level: orNull(f.englishLevel), p_topic: orNull(f.topic), p_goal: orNull(f.goal), p_activity: orNull(f.activity),
      p_day: orNull(f.day), p_limit: limit, p_offset: offset,
    }),
  person: (s: SupabaseClient, id: string) => call<Person | null>(s, "connect_person", { p_user: id }),

  sendIntro: (s: SupabaseClient, to: string, intro: { message: string; reason: string; common: string; topic: string }) =>
    call<string>(s, "send_connect_request", { p_recipient: to, p_message: intro.message, p_reason: intro.reason, p_common: intro.common, p_topic: intro.topic }),
  requests: (s: SupabaseClient, box: "incoming" | "outgoing") => call<IntroRequest[]>(s, "list_connect_requests", { p_box: box }),
  respond: (s: SupabaseClient, id: string, accept: boolean) => call<string>(s, "respond_connect_request", { p_id: id, p_accept: accept }),
  cancelIntro: (s: SupabaseClient, id: string) => call<string>(s, "cancel_connect_request", { p_id: id }),

  connections: (s: SupabaseClient) => call<ConnectionRow[]>(s, "list_connect_connections"),
  messages: (s: SupabaseClient, withId: string, before: number | null, limit = 30) =>
    call<Message[]>(s, "list_connect_messages", { p_with: withId, p_before: before, p_limit: limit }),
  send: (s: SupabaseClient, to: string, body: string) => call<{ id: number; created_at: string }[]>(s, "send_connect_message", { p_to: to, p_body: body }),
  markRead: (s: SupabaseClient, withId: string) => call<null>(s, "mark_connect_read", { p_with: withId }),

  block: (s: SupabaseClient, id: string) => call<string>(s, "block_member", { p_user: id }),
  unblock: (s: SupabaseClient, id: string) => call<string>(s, "unblock_member", { p_user: id }),
  blocks: (s: SupabaseClient) => call<{ id: string; display_name: string; blocked_at: string }[]>(s, "list_my_blocks"),
  report: (s: SupabaseClient, r: { user: string; context: string; contextId?: string | null; reason: string; details: string; block: boolean }) =>
    call<string>(s, "report_member", { p_user: r.user, p_context: r.context, p_context_id: r.contextId ?? null, p_reason: r.reason, p_details: r.details, p_block: r.block }),

  rooms: (s: SupabaseClient, scope: "discover" | "joined" | "hosting", o: { category?: string; language?: string; past?: boolean; offset?: number; limit?: number } = {}) =>
    call<Room[]>(s, "list_connect_rooms", {
      p_scope: scope, p_category: o.category || null, p_language: o.language || null, p_include_past: !!o.past,
      p_limit: o.limit ?? 20, p_offset: o.offset ?? 0,
    }),
  room: (s: SupabaseClient, id: string) => call<Room>(s, "get_connect_room", { p_id: id }),
  saveRoom: (s: SupabaseClient, id: string | null, p: RoomInput) => call<string>(s, "save_connect_room", { p_id: id, p }),
  setRoomStatus: (s: SupabaseClient, id: string, status: "published" | "draft" | "cancelled") =>
    call<string>(s, "set_connect_room_status", { p_id: id, p_status: status }),
  register: (s: SupabaseClient, id: string) => call<string>(s, "register_connect_room", { p_id: id }),
  unregister: (s: SupabaseClient, id: string) => call<string>(s, "cancel_connect_room_registration", { p_id: id }),
  meeting: (s: SupabaseClient, id: string) => call<MeetingDetails | null>(s, "connect_room_meeting", { p_id: id }),
  participants: (s: SupabaseClient, id: string) =>
    call<{ id: string; display_name: string; avatar_url: string | null; registered_at: string }[]>(s, "connect_room_participants", { p_id: id }),

  qmPoll: (s: SupabaseClient) => call<QuickMatchState>(s, "quick_match_poll"),
  qmJoin: (s: SupabaseClient, mode: CallMode, style: CallStyle) => call<{ status: "matched" | "waiting"; call_id?: string }>(s, "quick_match_join", { p_mode: mode, p_style: style }),
  qmLeave: (s: SupabaseClient) => call<null>(s, "quick_match_leave"),
  qmCall: (s: SupabaseClient, id: string) => call<CallInfo>(s, "quick_match_call", { p_call: id }),
  qmSignal: (s: SupabaseClient, id: string, kind: "offer" | "answer" | "ice" | "bye", payload: unknown) =>
    call<number>(s, "quick_match_signal", { p_call: id, p_kind: kind, p_payload: payload }),
  qmSignals: (s: SupabaseClient, id: string, after: number) =>
    call<{ id: number; kind: "offer" | "answer" | "ice" | "bye"; payload: unknown }[]>(s, "quick_match_signals", { p_call: id, p_after: after }),
  qmEnd: (s: SupabaseClient, id: string, reason: "left" | "skipped" | "failed" | "reported" | "blocked") => call<null>(s, "quick_match_end", { p_call: id, p_reason: reason }),
  qmFeedback: (s: SupabaseClient, id: string, connect: boolean, enjoyed: boolean) =>
    call<"connected" | "saved">(s, "quick_match_feedback", { p_call: id, p_connect: connect, p_enjoyed: enjoyed }),
};

export const isUnavailable = (e: unknown) => e instanceof ConnectUnavailableError;
