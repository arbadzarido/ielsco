"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ArrowLeft, Briefcase, CalendarCheck, CheckCircle2, IdCard, Phone } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ErrorState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnLink, btnPrimary, cardGloss, inputClass, labelClass } from "@/components/dashboard/ui";
import {
  FIELD_LABELS, GENDERS, OCCUPATIONS, loadAccountDetails, missingForEvents, needsInstitution, saveAccountDetails,
  type AccountDetails, type EditableField,
} from "@/lib/dashboard/account";
import { safeNextPath } from "@/lib/safe-redirect";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type Status = { ok: boolean; text: string } | null;

function Section({ id, icon, title, description, children }: { id: string; icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn(cardGloss, "scroll-mt-24 p-6 md:p-8")}>
      <div className="mb-6 flex items-start gap-3">
        <span className="mt-0.5 text-[#577E90]" aria-hidden="true">{icon}</span>
        <div>
          <h2 id={`${id}-title`} className="text-xl font-bold">{title}</h2>
          {description && <p className="mt-1 text-base text-[#2F4157]/65">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, hint, optional, children }: { id: string; label: string; hint?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} {optional && <span className="font-normal text-[#2F4157]/50">(optional)</span>}
      </label>
      {children}
      {hint && <p className="mt-2 text-sm text-[#2F4157]/60">{hint}</p>}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className="rounded-xl border border-[#E3E7ED] bg-[#F7F8FA] px-4 py-3 text-lg text-[#2F4157]/70">{value}</p>
    </div>
  );
}

function EventReadiness({ missing, registering }: { missing: EditableField[]; registering: boolean }) {
  if (!missing.length) {
    return (
      <div data-testid="account-event-ready" className="flex items-start gap-3 rounded-xl border border-[#577E90]/30 bg-[#577E90]/10 px-4 py-3 text-base">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
        <p><span className="font-semibold">You&apos;re event-ready.</span> Registering for an IELS event takes one click; we use these details so you don&apos;t fill the same form again.</p>
      </div>
    );
  }
  return (
    <div data-testid="account-event-missing" className="flex items-start gap-3 rounded-xl border border-[#E56668]/30 bg-[#E56668]/[0.06] px-4 py-3 text-base">
      <CalendarCheck size={20} className="mt-0.5 shrink-0 text-[#E56668]" aria-hidden="true" />
      <p>
        <span className="font-semibold">{registering ? "One step before you're registered." : "Almost there."}</span> Add {missing.map((k) => FIELD_LABELS[k].toLowerCase()).join(", ")} to register for events in one click.
      </p>
    </div>
  );
}

function AccountForm({ user, supabase }: { user: User; supabase: SupabaseClient }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { t } = useI18n();
  const [details, setDetails] = useState<AccountDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const load = () => {
    setLoadError(null);
    loadAccountDetails(supabase, user).then(setDetails, (e: Error) => setLoadError(e.message));
  };
  useEffect(load, [supabase, user]);

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!details) return <LoadingState />;

  const set = (patch: Partial<AccountDetails>) => {
    setDetails({ ...details, ...patch });
    setStatus(null);
  };
  const missing = missingForEvents(details);
  const isWorker = details.occupation === "Worker";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!details.full_name.trim()) return setStatus({ ok: false, text: "Please add your full name." });
    setSaving(true);
    try {
      await saveAccountDetails(supabase, user.id, details);
      // Came here from an event's Register button: go back and finish the registration.
      if (next && missing.length === 0) {
        setStatus({ ok: true, text: "Saved. Taking you back to the event…" });
        return router.push(safeNextPath(next));
      }
      setStatus({ ok: true, text: "Account details saved." });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14" data-testid="account-details-page">
      <Link href="/dashboard/profile" className={cn(btnLink, "mb-6")}>
        <ArrowLeft size={16} aria-hidden="true" /> {t("pages.profileTitle")}
      </Link>
      <PageHeader
        title={t("nav.accountDetails")}
        description="Private details for event registration, check-in and certificates. They're never shown on your public profile."
      />

      <form onSubmit={submit} noValidate className="space-y-6">
        <EventReadiness missing={missing} registering={!!next} />

        <Section id="identity" icon={<IdCard size={22} />} title="Identity">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="full-name" label={FIELD_LABELS.full_name} hint="As it should appear on your certificates.">
                <input id="full-name" data-testid="account-full-name" aria-required="true" autoComplete="name" maxLength={100} value={details.full_name} onChange={(e) => set({ full_name: e.target.value })} className={inputClass} />
              </Field>
            </div>
            <ReadOnly label="Email" value={details.email || "—"} />
            {details.member_code && <ReadOnly label="Member ID" value={`#${details.member_code}`} />}
            <Field id="birth-date" label={FIELD_LABELS.birth_date} optional>
              <input id="birth-date" type="date" data-testid="account-birth-date" autoComplete="bday" value={details.birth_date} onChange={(e) => set({ birth_date: e.target.value })} className={inputClass} />
            </Field>
            <Field id="gender" label={FIELD_LABELS.gender} optional>
              <select id="gender" data-testid="account-gender" value={details.gender} onChange={(e) => set({ gender: e.target.value })} className={inputClass}>
                <option value="">Select</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section id="contact" icon={<Phone size={22} />} title="Contact" description="Organisers use this to send event links and reminders.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="phone" label={FIELD_LABELS.phone}>
              <input id="phone" type="tel" data-testid="account-phone" aria-required="true" autoComplete="tel" placeholder="+62 812 3456 7890" value={details.phone} onChange={(e) => set({ phone: e.target.value })} className={inputClass} />
            </Field>
            <Field id="domicile" label={FIELD_LABELS.domicile}>
              <input id="domicile" data-testid="account-domicile" aria-required="true" autoComplete="address-level2" maxLength={80} placeholder="e.g. Bandung, Indonesia" value={details.domicile} onChange={(e) => set({ domicile: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </Section>

        <Section id="work" icon={<Briefcase size={22} />} title="School or work">
          <fieldset className="mb-5">
            <legend className={labelClass}>{FIELD_LABELS.occupation}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OCCUPATIONS.map((o) => (
                <label
                  key={o}
                  className={cn(
                    "cursor-pointer rounded-xl border px-4 py-3 text-center text-base font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#577E90] has-[:focus-visible]:ring-offset-2",
                    details.occupation === o ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157] hover:border-[#577E90] hover:bg-[#F7F8FA]"
                  )}
                >
                  <input type="radio" name="occupation" value={o} data-testid={`account-occupation-${o}`} checked={details.occupation === o} onChange={() => set({ occupation: o })} className="sr-only" />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
          {details.occupation && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="institution" label={isWorker ? "Company or organisation" : "School or university"} optional={!needsInstitution(details.occupation)}>
                <input id="institution" data-testid="account-institution" autoComplete="organization" maxLength={120} placeholder={isWorker ? "e.g. Tokopedia" : "e.g. Universitas Indonesia"} value={details.institution_name} onChange={(e) => set({ institution_name: e.target.value })} className={inputClass} />
              </Field>
              <Field id="institution-role" label={isWorker ? "Job title" : "Major or field of study"} optional>
                <input id="institution-role" data-testid="account-institution-role" autoComplete="organization-title" maxLength={120} placeholder={isWorker ? "e.g. Product Manager" : "e.g. International Relations"} value={details.institution_role} onChange={(e) => set({ institution_role: e.target.value })} className={inputClass} />
              </Field>
            </div>
          )}
        </Section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <button type="submit" data-testid="account-save-button" disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : next ? "Save and register" : "Save details"}
          </button>
          {status && (
            <p role={status.ok ? "status" : "alert"} data-testid="account-save-message" className={cn("flex items-center gap-2 text-base", status.ok ? "text-[#577E90]" : "text-[#C04C4E]")}>
              {status.ok && <CheckCircle2 size={16} aria-hidden="true" />} {status.text}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

export default function AccountDetailsPage() {
  return (
    <DashboardPage>
      {({ user, supabase }) => (
        <Suspense fallback={<LoadingState />}>
          <AccountForm user={user} supabase={supabase} />
        </Suspense>
      )}
    </DashboardPage>
  );
}
