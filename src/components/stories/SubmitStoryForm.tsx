"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRY_CODES, countryName } from "@/lib/dashboard/countries";
import { STEPS, SUBMISSION_CONFIRMATION, SUBMISSION_IMAGE, SUPPORT_EMAIL } from "@/lib/stories/questionnaire";
import { btnPrimary, btnSecondary, cardGloss, focusRing, inputClass, labelClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

// Public questionnaire. Images go to the private bucket member-story-submissions (visitors can upload but never read
// them back); the answers go through the submit_member_story RPC, which always stores the submission as pending.
// Nothing is published from here.

const SEA = ["ID", "MY", "SG", "TH", "PH", "VN", "KH", "MM", "LA", "BN", "TL"];
const STEP_TITLES = [...STEPS.map((s) => s.title), "Photos & consent"];

type Img = { file: File; url: string };

export default function SubmitStoryForm() {
  const submissionId = useMemo(() => crypto.randomUUID(), []);
  const pathname = usePathname() ?? "/stories/submit";
  const storiesHref = pathname.replace(/\/submit\/?$/, "") || "/stories";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [country, setCountry] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [consent, setConsent] = useState({ review: false, identity: false, instagram: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const countryOptions = useMemo(() => {
    const rest = COUNTRY_CODES.filter((c) => !SEA.includes(c)).map((c) => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n));
    return [...SEA.map((c) => ({ c, n: countryName(c) })), ...rest];
  }, []);

  const set = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));

  function validateStep(i: number): string | null {
    if (i < STEPS.length) {
      for (const q of STEPS[i].questions) {
        if (q.required && !(answers[q.key] ?? "").trim()) return `Please answer: ${q.label}`;
      }
      if (STEPS[i].id === "about") {
        if (!country) return "Please choose your country.";
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((answers.email ?? "").trim())) return "Please enter a valid email address.";
      }
    } else if (!consent.review) {
      return "Please agree to let IELSco review your story, or we can't accept the submission.";
    }
    return null;
  }

  function next() {
    const e = validateStep(step);
    setError(e);
    if (!e) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const added: Img[] = [];
    for (const file of Array.from(list)) {
      if (!SUBMISSION_IMAGE.types.includes(file.type)) {
        setError(`${file.name}: please use JPG, PNG or WebP (iPhone HEIC photos: export or screenshot them as JPG).`);
        continue;
      }
      if (file.size > SUBMISSION_IMAGE.maxBytes) {
        setError(`${file.name} is larger than 5 MB.`);
        continue;
      }
      added.push({ file, url: URL.createObjectURL(file) });
    }
    setImages((cur) => [...cur, ...added].slice(0, SUBMISSION_IMAGE.maxCount));
  }

  async function submit() {
    const e = validateStep(STEPS.length);
    if (e) return setError(e);
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const paths: string[] = [];
      for (const img of images) {
        const ext = img.file.type === "image/png" ? "png" : img.file.type === "image/webp" ? "webp" : "jpg";
        const path = `incoming/${submissionId}/${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("member-story-submissions").upload(path, img.file, { contentType: img.file.type, upsert: false });
        if (upErr) throw new Error(`Uploading ${img.file.name} failed. Please try again or remove the photo.`);
        paths.push(path);
      }
      const clean = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
      const { error: rpcErr } = await supabase.rpc("submit_member_story", {
        p_id: submissionId,
        p_name: clean.name ?? "",
        p_email: clean.email ?? "",
        p_country: country,
        p_answers: clean,
        p_images: paths,
        p_consent_review: consent.review,
        p_consent_identity: consent.identity,
        p_consent_instagram: consent.instagram,
      });
      if (rpcErr) throw new Error(rpcErr.message || "We couldn't save your story. Please try again.");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-[720px] px-[16px] py-[64px] text-[#2F4157]">
        <div className={cn(cardGloss, "p-[32px] text-center")} role="status" data-testid="submit-confirmation">
          <CheckCircle2 className="mx-auto text-[#577E90]" size={44} aria-hidden="true" />
          <h1 className="mt-[16px] text-[28px] font-extrabold">{SUBMISSION_CONFIRMATION.title}</h1>
          <p className="mt-[12px] text-[17px] leading-relaxed text-[#2F4157]/80">{SUBMISSION_CONFIRMATION.body}</p>
          <p className="mt-[16px] text-[15px] text-[#2F4157]/65">
            Want to correct or withdraw your submission? Email <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
          <Link href={storiesHref} className={cn(btnSecondary, "mt-[24px]")}>Back to stories</Link>
        </div>
      </main>
    );
  }

  const current = STEPS[step];

  return (
    <main className="mx-auto max-w-[760px] px-[16px] py-[48px] text-[#2F4157]">
      <Link href={storiesHref} className="text-[15px] font-semibold text-[#577E90] hover:underline">← All stories</Link>
      <h1 className="mt-[12px] text-[32px] font-extrabold leading-tight">Share your story</h1>
      <p className="mt-[8px] text-[17px] leading-relaxed text-[#2F4157]/75">
        Takes about 15 minutes. Our editors read every submission and may turn it into a story on circle.ielsco.com.
        Submitting doesn&apos;t guarantee publication, and nothing is published without your consent.
      </p>

      <ol className="mt-[24px] flex flex-wrap gap-[8px]" aria-label="Progress">
        {STEP_TITLES.map((t, i) => (
          <li key={t} className={cn("rounded-full px-[12px] py-[6px] text-[13px] font-semibold", i === step ? "bg-[#2F4157] text-white" : i < step ? "bg-[#577E90]/15 text-[#2F4157]" : "bg-white text-[#2F4157]/50 border border-[#E3E7ED]")} aria-current={i === step ? "step" : undefined}>
            {i + 1}. {t}
          </li>
        ))}
      </ol>

      <section className={cn(cardGloss, "mt-[20px] p-[20px] sm:p-[28px]")}>
        {current ? (
          <>
            <h2 className="text-[22px] font-bold">{current.title}</h2>
            <p className="mt-[4px] text-[15px] text-[#2F4157]/65">{current.intro}</p>
            <div className="mt-[20px] space-y-[18px]">
              {current.questions.map((q) => {
                const id = `q-${q.key}`;
                return (
                  <div key={q.key}>
                    <label htmlFor={id} className={labelClass}>
                      {q.label} {q.required && <span className="text-[#E56668]" aria-hidden="true">*</span>}
                    </label>
                    {q.help && <p className="-mt-[4px] mb-[6px] text-[14px] text-[#2F4157]/60">{q.help}</p>}
                    {q.long ? (
                      <textarea id={id} rows={4} maxLength={q.max} required={q.required} value={answers[q.key] ?? ""} onChange={(e) => set(q.key, e.target.value)} className={cn(inputClass, "text-[16px]")} />
                    ) : (
                      <input id={id} type={q.key === "email" ? "email" : "text"} maxLength={q.max} required={q.required} value={answers[q.key] ?? ""} onChange={(e) => set(q.key, e.target.value)} className={cn(inputClass, "text-[16px]")} autoComplete={q.key === "name" ? "name" : q.key === "email" ? "email" : "off"} />
                    )}
                  </div>
                );
              })}
              {current.id === "about" && (
                <div>
                  <label htmlFor="q-country" className={labelClass}>Country <span className="text-[#E56668]" aria-hidden="true">*</span></label>
                  <select id="q-country" value={country} onChange={(e) => setCountry(e.target.value)} className={cn(inputClass, "text-[16px]")} required>
                    <option value="">Choose your country</option>
                    <optgroup label="Southeast Asia">
                      {countryOptions.slice(0, SEA.length).map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
                    </optgroup>
                    <optgroup label="Other countries">
                      {countryOptions.slice(SEA.length).map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
                    </optgroup>
                  </select>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[22px] font-bold">Photos &amp; consent</h2>
            <p className="mt-[4px] text-[15px] text-[#2F4157]/65">
              Up to {SUBMISSION_IMAGE.maxCount} photos (JPG, PNG or WebP, max 5 MB each). Photos stay private and are only seen by our editors unless you agree below and your story is published.
            </p>
            <div className="mt-[16px] grid grid-cols-3 gap-[10px] sm:grid-cols-6">
              {images.map((img, i) => (
                <div key={img.url} className="relative aspect-square overflow-hidden rounded-[12px] bg-[#F1F4F8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Selected photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImages((cur) => cur.filter((x) => x !== img))} className={cn("absolute right-[4px] top-[4px] rounded-full bg-white/90 p-[4px]", focusRing)} aria-label={`Remove photo ${i + 1}`}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {images.length < SUBMISSION_IMAGE.maxCount && (
                <label className={cn("flex aspect-square cursor-pointer flex-col items-center justify-center gap-[4px] rounded-[12px] border-2 border-dashed border-[#E3E7ED] bg-white text-[13px] text-[#2F4157]/60 hover:border-[#577E90]", focusRing)}>
                  <ImagePlus size={22} aria-hidden="true" /> Add
                  <input type="file" accept={SUBMISSION_IMAGE.types.join(",")} multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>

            <fieldset className="mt-[24px] space-y-[14px]">
              <legend className="text-[17px] font-bold">Consent</legend>
              {[
                { k: "review" as const, required: true, text: "I agree that IELSco may review my story and edit it for publication on circle.ielsco.com. Submitting doesn't guarantee publication." },
                { k: "identity" as const, required: false, text: "If my story is published, IELSco may show my name, role, country and the photos I sent." },
                { k: "instagram" as const, required: false, text: "IELSco may contact me about featuring my story on Instagram (@iels_co). Nothing is posted without asking me first." },
              ].map(({ k, required, text }) => (
                <label key={k} className="flex items-start gap-[12px] text-[15px] leading-relaxed">
                  <input type="checkbox" checked={consent[k]} onChange={(e) => setConsent((c) => ({ ...c, [k]: e.target.checked }))} className="mt-[4px] h-[18px] w-[18px] shrink-0 accent-[#2F4157]" data-testid={`consent-${k}`} />
                  <span>{text} {required ? <span className="text-[#E56668]">(required)</span> : <span className="text-[#2F4157]/50">(optional)</span>}</span>
                </label>
              ))}
            </fieldset>
            <p className="mt-[16px] text-[14px] text-[#2F4157]/60">
              To correct or withdraw your submission at any time, email <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </>
        )}

        {error && <p role="alert" className="mt-[16px] rounded-[12px] bg-[#E56668]/10 px-[14px] py-[10px] text-[15px] text-[#B23F41]">{error}</p>}

        <div className="mt-[24px] flex flex-wrap justify-between gap-[12px]">
          {step > 0 ? <button type="button" className={btnSecondary} onClick={() => { setError(null); setStep((s) => s - 1); }} disabled={busy}>Back</button> : <span />}
          {current ? (
            <button type="button" className={btnPrimary} onClick={next}>Continue</button>
          ) : (
            <button type="button" className={btnPrimary} onClick={submit} disabled={busy} data-testid="submit-story">
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} {busy ? "Sending…" : "Submit my story"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
