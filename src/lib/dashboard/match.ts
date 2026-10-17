// Simple, transparent matching rules. No AI: just shared goals.
import { directionLabel, NOT_DECIDED, PREFER_NOT_TO_SAY } from "./options";
import type { DirectoryMember, MemberProfile, Resource } from "./types";

export function resourceScore(resource: Resource, profile: MemberProfile) {
  let score = 0;
  if (profile.direction && resource.goalTags.includes(profile.direction)) score += 2;
  for (const interest of profile.interests) {
    if (interest !== "Not sure yet" && resource.goalTags.includes(interest)) score += 3;
  }
  return score;
}

export function matchesGoals(resource: Resource, profile: MemberProfile) {
  return resourceScore(resource, profile) > 0;
}

export function recommendResources(resources: Resource[], profile: MemberProfile, limit = 4) {
  return [...resources]
    .map((r) => ({ r, score: resourceScore(r, profile) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ r }) => r);
}

export function similarity(member: DirectoryMember, profile: MemberProfile) {
  const reasons: string[] = [];
  let score = 0;
  if (profile.direction && member.direction === profile.direction) {
    score += 2;
    reasons.push(`chose ${directionLabel(member.direction)}`);
  }
  if (
    profile.destination_country &&
    profile.destination_country !== NOT_DECIDED &&
    member.destination_country === profile.destination_country
  ) {
    score += 2;
    reasons.push(`want to go to ${member.destination_country}`);
  }
  if (
    profile.origin_country &&
    profile.origin_country !== PREFER_NOT_TO_SAY &&
    member.origin_country === profile.origin_country
  ) {
    score += 1;
    reasons.push(`are from ${member.origin_country}`);
  }
  for (const interest of member.interests) {
    if (interest !== "Not sure yet" && profile.interests.includes(interest)) {
      score += 1;
      reasons.push(`like ${interest}`);
    }
  }
  return { score, reasons };
}

export function sortBySimilarity(members: DirectoryMember[], profile: MemberProfile) {
  return members
    .map((m) => ({ member: m, ...similarity(m, profile) }))
    .sort((a, b) => b.score - a.score);
}
