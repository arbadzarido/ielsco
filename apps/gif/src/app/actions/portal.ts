"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { acceptOffer, applicationForAccount, recordConsents, UserError, withdrawApplication } from "@/lib/applications";
import { startCheckout, PaymentError, syncFromGateway } from "@/lib/payments/service";
import { attemptState, cancelAttempt, resumeAttempt, type CancelResult } from "@/lib/payments/attempts";
import { beginUpload, finishUpload, deleteOwnDocument, UploadError } from "@/lib/documents";
import { savePhase } from "@/lib/phases";
import { currentCohort } from "@/lib/cohort";
import { one } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { layout } from "@/lib/email/templates";
import { clientIp, userAgent } from "@/lib/request";
import { requiredConsents, type ConsentCategory } from "@/lib/legal";
import { formatMoney } from "@/lib/pricing";
import { overLimit } from "@/lib/ratelimit";
import { normalizeHandle, tasksFor } from "@/lib/tasks";
import { resendGuardianLink } from "@/lib/guardian";
import { q } from "@/lib/db";

export type ActionResult = { ok?: boolean; error?: string; message?: string } | null;

async function ctx() {
  const account = await requireAccount();
  const found = await applicationForAccount(account.id);
  return { account, found };
}

export type CheckoutResult = { error?: string; orderId?: string; token?: string | null; redirectUrl?: string; snap?: { clientKey: string; scriptUrl: string } | null } | null;

// Opens (or reopens) the payment for an obligation. The browser shows Snap in a popup when it can, else follows redirectUrl.
export async function payAction(obligationId: string, opts: { idrOption?: boolean; forceNew?: boolean } = {}): Promise<CheckoutResult> {
  const account = await requireAccount();
  try {
    if (await overLimit(`checkout:${account.id}`, 20, 3600)) return { error: "Too many payment attempts. Please wait a while." };
    const r = await startCheckout(account.id, String(obligationId), { idrOption: !!opts.idrOption, forceNew: !!opts.forceNew });
    revalidatePath("/portal/payments");
    return { orderId: r.orderId, token: r.token, redirectUrl: r.redirectUrl, snap: r.snap };
  } catch (e) {
    if (e instanceof PaymentError) return { error: e.message };
    throw e;
  }
}

// Continue payment: reopen an open attempt (after checking it wasn't paid or expired meanwhile).
export async function resumePaymentAction(orderId: string): Promise<CheckoutResult & { status?: string }> {
  const account = await requireAccount();
  try {
    if (await overLimit(`resume:${account.id}`, 30, 600)) return { error: "Too many requests. Please wait a moment." };
    const r = await resumeAttempt(account.id, String(orderId));
    if (!r.token && !r.redirectUrl) return { status: r.status, error: r.status === "paid" ? undefined : "This payment can't be continued any more. Choose a payment method to start again." };
    return { status: r.status, orderId, token: r.token, redirectUrl: r.redirectUrl ?? undefined, snap: r.snap };
  } catch (e) {
    if (e instanceof PaymentError) return { error: e.message };
    throw e;
  }
}

// Cancel & change payment method: cancels the attempt at Midtrans when it can be cancelled (see lib/payments/attempts.ts).
export async function cancelPaymentAction(orderId: string): Promise<CancelResult> {
  const account = await requireAccount();
  if (await overLimit(`cancel:${account.id}`, 15, 600)) return { outcome: "error", status: "rate_limited", message: "Too many requests. Please wait a moment and try again." };
  try {
    const r = await cancelAttempt(account.id, String(orderId));
    revalidatePath("/portal/payments");
    return r;
  } catch (e) {
    if (e instanceof PaymentError) return { outcome: "error", status: "error", message: e.message };
    throw e;
  }
}

export async function checkPaymentAction(orderId: string): Promise<{ status: string; canContinue?: boolean; canCancel?: boolean; cancelResult?: string | null; obligationId?: string }> {
  const account = await requireAccount();
  const pay = await one<{ status: string; owner: string; pacct: string | null }>(
    `select p.status, a.owner_account_id as owner, pt.account_id as pacct from gif.payments p join gif.applications a on a.id = p.application_id
     join gif.participants pt on pt.id = p.participant_id where p.order_id = $1`, [orderId]);
  if (!pay || (pay.owner !== account.id && pay.pacct !== account.id)) return { status: "not_found" };
  if (["created", "pending"].includes(pay.status)) {
    if (!(await overLimit(`status:${account.id}`, 60, 600))) {
      await syncFromGateway(orderId, "status_check").catch(() => null);
    }
  }
  const now = await one<{ status: string; obligation_id: string }>("select status, obligation_id from gif.payments where order_id = $1", [orderId]);
  const st = await attemptState(account.id, orderId);
  return { status: now?.status ?? "unknown", canContinue: st?.canContinue, canCancel: st?.canCancel, cancelResult: st?.cancelResult, obligationId: now?.obligation_id };
}

export async function requestInvoiceAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { account, found } = await ctx();
  if (!found) return { error: "No application." };
  const ob = await one<{ id: string; label: string; amount: number; currency: "IDR" | "USD"; legal_name: string; email: string; code: string }>(
    `select o.id, o.label, o.amount, o.currency, p.legal_name, p.email, a.code from gif.obligations o join gif.participants p on p.id = o.participant_id
     join gif.applications a on a.id = o.application_id where o.id = $1 and o.application_id = $2 and o.status = 'open'`, [String(fd.get("obligation_id")), found.app.id]);
  if (!ob) return { error: "Payment item not found." };
  const finance = process.env.GIF_FINANCE_EMAIL || "hello@ielsco.com";
  const m = layout({ heading: "Invoice requested", paras: [`${ob.legal_name} (${ob.email}) requested an invoice for ${ob.label}: ${formatMoney(ob.amount, ob.currency)}.`, `Application ${ob.code}. Record the payment in Admin → Payments once the transfer is verified.`] });
  await sendEmail({ to: finance, template: "invoice_request", subject: `Invoice request ${ob.code}: ${ob.label}`, ...m, dedupeKey: `invoice:${ob.id}:${new Date().toISOString().slice(0, 10)}`, applicationId: found.app.id });
  await audit(account.email, "invoice_requested", "obligation", ob.id, {}, await clientIp());
  return { ok: true, message: "Invoice requested. Finance will email you bank transfer details." };
}

export async function acceptTermsAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { account, found } = await ctx();
  if (!found) return { error: "No application." };
  const cats = requiredConsents(found.app.pathway);
  const accepted: Partial<Record<ConsentCategory, boolean>> = {};
  for (const c of cats) { if (fd.get(c) !== "on") return { error: "Please tick every document to accept." }; accepted[c] = true; }
  const media = fd.get("media");
  if (media === "yes" || media === "no") accepted.media = media === "yes";
  await recordConsents(account.id, found.app.id, found.me?.id ?? null, accepted, { ip: await clientIp(), userAgent: await userAgent() });
  revalidatePath("/portal", "layout");
  return { ok: true, message: "Thank you. Your acceptance has been recorded." };
}

export async function withdrawAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const account = await requireAccount();
  if (fd.get("confirm") !== "WITHDRAW") return { error: "Type WITHDRAW to confirm." };
  try { await withdrawApplication(account, String(fd.get("reason") ?? ""), await clientIp()); }
  catch (e) { if (e instanceof UserError) return { error: e.message }; throw e; }
  redirect("/portal?withdrawn=1");
}

export async function acceptOfferAction(): Promise<ActionResult> {
  const account = await requireAccount();
  try { await acceptOffer(account, await clientIp()); }
  catch (e) { if (e instanceof UserError) return { error: e.message }; throw e; }
  revalidatePath("/portal", "layout");
  return { ok: true };
}

export async function beginUploadAction(input: { kind: string; filename: string; mime: string; size: number }) {
  const { account, found } = await ctx();
  if (!found) return { error: "No application." };
  const cohort = await currentCohort();
  try {
    return { ok: true as const, ...(await beginUpload(account.id, found.app.id, cohort.id, input.kind, input.filename, input.mime, input.size, found.me?.id ?? null)) };
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
}

export async function finishUploadAction(documentId: string) {
  const account = await requireAccount();
  try { await finishUpload(account.id, documentId); revalidatePath("/portal", "layout"); return { ok: true as const }; }
  catch (e) { if (e instanceof UploadError) return { error: e.message }; throw e; }
}

export async function deleteDocumentAction(documentId: string) {
  const account = await requireAccount();
  try { await deleteOwnDocument(account.id, documentId); revalidatePath("/portal", "layout"); return { ok: true as const }; }
  catch (e) { if (e instanceof UploadError) return { error: e.message }; throw e; }
}

export async function savePhaseAction(phase: 2 | 3, input: { essayText?: string; essayDocId?: string | null; deckDocId?: string | null; videoUrl?: string; videoDocId?: string | null; notes?: string }, submit: boolean) {
  const { account, found } = await ctx();
  if (!found || !found.isOwner) return { error: "Only the lead applicant can submit for the team." };
  try { await savePhase(account.email, found.app, phase, input, submit, await clientIp()); revalidatePath("/portal", "layout"); return { ok: true as const }; }
  catch (e) { if (e instanceof UserError) return { error: e.message }; throw e; }
}

// A delegate reports the Phase 1 social media tasks they have done; the team then verifies each one.
export async function submitTasksAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { account, found } = await ctx();
  if (!found?.me || found.app.pathway !== "fully_funded") return { error: "Phase 1 tasks are part of the Fully Funded application." };
  if (["draft", "withdrawn"].includes(found.app.status)) return { error: "Submit your application first." };
  const handle = normalizeHandle(String(fd.get("instagram") ?? ""));
  if (!handle) return { error: "Enter your Instagram username (e.g. @yourname) so we can check the tasks." };
  const s = (await currentCohort()).settings;
  const now = new Date().toISOString();
  const cur = found.me.social_tasks ?? {};
  const next = { ...cur };
  let n = 0;
  for (const t of tasksFor(s)) {
    if (fd.get(t.key) !== "on" || cur[t.key]?.status === "verified") continue;
    next[t.key] = { status: "submitted", at: now };
    n++;
  }
  await q("update gif.participants set instagram = $2, social_tasks = $3, updated_at = now() where id = $1", [found.me.id, handle, JSON.stringify(next)]);
  await audit(account.email, "social_tasks_submitted", "participant", found.me.id, { handle, tasks: n }, await clientIp());
  revalidatePath("/portal", "layout");
  return { ok: true, message: n ? "Thanks! The team will check these tasks on Instagram." : "Saved." };
}

export async function resendGuardianAction(participantId: string): Promise<ActionResult> {
  const account = await requireAccount();
  const r = await resendGuardianLink(account.id, participantId);
  return r.ok ? { ok: true, message: "We sent a new consent link to the guardian." } : { error: r.error };
}
