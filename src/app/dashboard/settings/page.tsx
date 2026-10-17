"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ArrowRight, CheckCircle2, Eye, EyeOff, GraduationCap, IdCard, Languages, LogOut, Shield, UserRound } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, cardGloss, focusRing, inputClass, labelClass } from "@/components/dashboard/ui";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { ConnectedApps } from "@/components/dashboard/settings/ConnectedApps";
import { ELCO_ENABLED } from "@/lib/elco";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  { value: "WIB", label: "WIB (UTC+7)" },
  { value: "WITA", label: "WITA (UTC+8)" },
  { value: "WIT", label: "WIT (UTC+9)" },
];

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

function StatusLine({ status, testId }: { status: Status; testId: string }) {
  if (!status) return null;
  return (
    <p role={status.ok ? "status" : "alert"} data-testid={testId} className={cn("flex items-center gap-2 text-base", status.ok ? "text-[#577E90]" : "text-[#C04C4E]")}>
      {status.ok && <CheckCircle2 size={16} aria-hidden="true" />} {status.text}
    </p>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "pr-12")} />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className={cn("absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#2F4157]/50 hover:text-[#2F4157]", focusRing)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function SettingsView({ user, supabase }: { user: User; supabase: SupabaseClient }) {
  const router = useRouter();
  const { t } = useI18n();
  const [timezone, setTimezone] = useState("WIB");
  // public.users.timezone does not exist in every database (it is missing in production as of 2026-10-17).
  // The control is only shown once a read confirms the column exists, so members never get a failing save.
  const [tzAvailable, setTzAvailable] = useState(false);
  const [tzStatus, setTzStatus] = useState<Status>(null);
  const [tzSaving, setTzSaving] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const usesPassword = user.app_metadata?.providers?.includes("email") ?? user.app_metadata?.provider === "email";

  useEffect(() => {
    supabase.from("users").select("timezone").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (error) return;
      setTzAvailable(true);
      if (data?.timezone) setTimezone(data.timezone);
    });
  }, [supabase, user.id]);

  const saveTimezone = async (value: string) => {
    const previous = timezone;
    setTimezone(value);
    setTzSaving(true);
    setTzStatus(null);
    const { error } = await supabase.from("users").update({ timezone: value, updated_at: new Date().toISOString() }).eq("id", user.id);
    setTzSaving(false);
    if (error) {
      setTimezone(previous);
      setTzStatus({ ok: false, text: `Couldn't save your time zone: ${error.message}` });
    } else setTzStatus({ ok: true, text: "Time zone saved." });
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwStatus(null);
    if (!current || !next || !confirm) return setPwStatus({ ok: false, text: "Fill in all three password fields." });
    if (next.length < 8) return setPwStatus({ ok: false, text: "Use at least 8 characters for your new password." });
    if (next !== confirm) return setPwStatus({ ok: false, text: "The new passwords don't match." });
    setPwSaving(true);
    // Confirm the current password first, so an unattended signed-in session can't be used to change it.
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email ?? "", password: current });
    if (authError) {
      setPwSaving(false);
      return setPwStatus({ ok: false, text: "Your current password isn't correct." });
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setPwSaving(false);
    if (error) return setPwStatus({ ok: false, text: `Couldn't change your password: ${error.message}` });
    setCurrent("");
    setNext("");
    setConfirm("");
    setPwStatus({ ok: true, text: "Password changed." });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14" data-testid="settings-page">
      <PageHeader title={t("nav.settings")} description="Your account, language and security." />
      <div className="space-y-6">
        <Section id="account" icon={<UserRound size={22} />} title="Account" description={`Signed in as ${user.email ?? "your IELS account"}.`}>
          <ul className="divide-y divide-[#E3E7ED] rounded-xl border border-[#E3E7ED]">
            {[
              { href: "/dashboard/profile", icon: UserRound, title: "Profile", body: "Name, photo, bio and how you appear in People." },
              { href: "/dashboard/profile/account", icon: IdCard, title: "Account details", body: "Private details for event registration and certificates." },
              { href: "/dashboard/my-learning", icon: GraduationCap, title: t("nav.myLearning"), body: "Your courses and purchases." },
            ].map(({ href, icon: Icon, title, body }) => (
              <li key={href}>
                <Link href={href} className={cn("flex items-center gap-4 px-4 py-4 hover:bg-[#F7F8FA]", focusRing)}>
                  <Icon size={20} className="shrink-0 text-[#577E90]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-base text-[#2F4157]/60">{body}</span>
                  </span>
                  <ArrowRight size={16} className="text-[#2F4157]/40" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="language" icon={<Languages size={22} />} title="Language & region">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Interface language</p>
              <LanguageSelect testId="settings-language-select" />
              <p className="mt-2 text-sm text-[#2F4157]/60">Changes apply right away and follow your account.</p>
            </div>
            {tzAvailable && <div>
              <label htmlFor="settings-timezone" className={labelClass}>Time zone</label>
              <select id="settings-timezone" data-testid="settings-timezone" value={timezone} disabled={tzSaving} onChange={(e) => saveTimezone(e.target.value)} className={inputClass}>
                {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
              <p className="mt-2 text-sm text-[#2F4157]/60">Used for course session times.</p>
            </div>}
          </div>
          <div className="mt-4"><StatusLine status={tzStatus} testId="settings-timezone-status" /></div>
        </Section>

        <Section id="security" icon={<Shield size={22} />} title="Password & security">
          {usesPassword ? (
            <form onSubmit={changePassword} noValidate className="space-y-4" data-testid="settings-password-form">
              <PasswordField id="pw-current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordField id="pw-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
                <PasswordField id="pw-confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              </div>
              <p className="text-sm text-[#2F4157]/60">At least 8 characters. A longer phrase is stronger than symbols.</p>
              <StatusLine status={pwStatus} testId="settings-password-status" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="submit" disabled={pwSaving} className={btnPrimary}>{pwSaving ? "Changing…" : "Change password"}</button>
                <Link href="/sign-in/forgot" className={btnSecondary}>Forgot your password?</Link>
              </div>
            </form>
          ) : (
            <p className="text-base text-[#2F4157]/70">You sign in with Google, so there&apos;s no IELS password to change. Manage security in your Google account.</p>
          )}
        </Section>

        {ELCO_ENABLED && <ConnectedApps supabase={supabase} />}

        <section className={cn(cardGloss, "flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8")}>
          <div>
            <h2 className="text-xl font-bold">Sign out</h2>
            <p className="mt-1 text-base text-[#2F4157]/65">To delete your account, email support@ielsco.com from your account&apos;s email address.</p>
          </div>
          <button type="button" data-testid="settings-sign-out" onClick={signOut} className={btnSecondary}><LogOut size={16} /> Sign out</button>
        </section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <DashboardPage>{({ user, supabase }) => <SettingsView user={user} supabase={supabase} />}</DashboardPage>;
}
