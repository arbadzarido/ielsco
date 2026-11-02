// Switch between the two story sections: Member Stories (circle.ielsco.com/stories, community voices) and IELSco Stories
// (www.ielsco.com/stories, official editorial). Plain links, so both pages stay crawlable and keep their own URLs.
const LINKS = {
  member: { href: "https://circle.ielsco.com/stories", label: { en: "Member Stories", id: "Cerita Anggota" } },
  ielsco: { href: "https://www.ielsco.com/stories", hrefId: "https://www.ielsco.com/id/stories", label: { en: "IELSco Stories", id: "IELSco Stories" } },
} as const;

export default function StoriesSectionTabs({ active, lang = "en" }: { active: "member" | "ielsco"; lang?: "en" | "id" }) {
  const cls = (on: boolean) =>
    `rounded-full px-5 py-2 text-[15px] font-semibold transition-colors ${on ? "bg-[#2F4157] text-white" : "text-[#2F4157]/75 hover:bg-[#F1F4F8]"}`;
  return (
    <nav aria-label={lang === "id" ? "Bagian cerita" : "Story sections"} className="flex justify-center px-4 pt-6" data-testid="stories-section-tabs">
      <div className="inline-flex rounded-full border border-[#E6E9EE] bg-white p-1">
        <a href={LINKS.member.href} className={cls(active === "member")} aria-current={active === "member" ? "page" : undefined}>{LINKS.member.label[lang]}</a>
        <a href={lang === "id" ? LINKS.ielsco.hrefId : LINKS.ielsco.href} className={cls(active === "ielsco")} aria-current={active === "ielsco" ? "page" : undefined}>{LINKS.ielsco.label[lang]}</a>
      </div>
    </nav>
  );
}
