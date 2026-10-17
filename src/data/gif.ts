// Global Impact Fellowship facts shown on the homepage and in the (currently unused) GIF popup.
// Source: the existing GIF Singapore Batch 2 popup content. Update here when a new batch opens.
export const GIF_BATCH = {
  name: "GIF Singapore Batch 2",
  registrationDeadline: "2026-09-21T23:59:59+07:00",
  poster: "/images/contents/events/gif2.png",
  programPage: "/events/gif/batch2",
  overviewPage: "/events/gif",
  facts: ["4 days, 3 nights at the National University of Singapore (NUS)", "Leadership and project incubation boot camp", "Self-funded · open to youth across Southeast Asia"],
};

export const gifRegistrationOpen = (now = new Date()) => now.getTime() < Date.parse(GIF_BATCH.registrationDeadline);
