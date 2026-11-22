// Called by the admin editors after a successful save: drops the cached public opportunity pages so edits show up at
// once. Best effort (the pages refresh by themselves within 5 minutes), so a failure is ignored.
export async function revalidateOpportunities() {
  try {
    await fetch("/api/admin/opportunities/revalidate", { method: "POST" });
  } catch {
    // offline or blocked: the cache expires on its own
  }
}
