"use server";
import { requireAccount } from "@/lib/auth";
import { saveDraft, submitApplication } from "@/lib/applications";
import { clientIp, userAgent } from "@/lib/request";
import type { ConsentCategory } from "@/lib/legal";

export async function saveDraftAction(draft: Record<string, unknown>): Promise<{ ok: boolean; code?: string; error?: string }> {
  const a = await requireAccount("/apply");
  try {
    const r = await saveDraft(a.id, draft);
    return { ok: true, code: r.code };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function submitApplicationAction(data: unknown, consents: Partial<Record<ConsentCategory, boolean>>) {
  const a = await requireAccount("/apply");
  return submitApplication(a, data, consents, { ip: await clientIp(), userAgent: await userAgent() });
}
