import type { Metadata } from "next";
import { PHOTOS } from "@/lib/content";
import { getContent } from "@/lib/cms";
import { Eyebrow, Figure, FinalCta, PageHero, PhotoBand, Testimonials } from "@/components/Blocks";

export const metadata: Metadata = { title: "Previous GIF", description: "GIF 2026 Batch 2 in Singapore, 17–20 November 2026: four teams, twelve delegates." };
export const revalidate = 300;

export default async function Previous() {
  const testimonials = await getContent("testimonials");
  return (
    <>
      <PageHero eyebrow="Previous GIF" title="GIF 2026, Singapore."
        lead="Batch 2 of the Global Impact Fellowship ran in Singapore from 17 to 20 November 2026: four days and three nights of project incubation on the NUS campus, campus tours and cultural exploration." />
      <section className="section">
        <div className="wrap">
          <dl className="kpis">
            <div><dt>Dates</dt><dd>17–20 Nov 2026</dd></div>
            <div><dt>City</dt><dd>Singapore</dd></div>
            <div><dt>Delegates</dt><dd>12</dd></div>
            <div><dt>Teams</dt><dd>4</dd></div>
          </dl>
        </div>
      </section>
      <section className="section tight">
        <div className="wrap grid split-r" style={{ alignItems: "center" }}>
          <div><Eyebrow n="01">Incubation</Eyebrow><h2>Projects first.</h2><p className="lead" style={{ marginTop: 18 }}>Delegates spent their days developing their projects in teams, with sessions on leadership, organisation and partnerships, and closed with an awarding where delegates received certificates of achievement.</p></div>
          <Figure p={PHOTOS.classroom} sizes="(min-width: 1000px) 35vw, 100vw" style={{ maxWidth: 420, marginLeft: "auto" }} />
        </div>
      </section>
      <section className="section alt">
        <div className="wrap"><div className="head"><Eyebrow n="02">Gallery</Eyebrow><h2>Four days in pictures.</h2></div><PhotoBand />
          <div className="grid g2" style={{ marginTop: 10 }}><Figure p={PHOTOS.nusSign} sizes="(min-width: 720px) 50vw, 100vw" /><Figure p={PHOTOS.jewel} sizes="(min-width: 720px) 50vw, 100vw" /></div>
        </div>
      </section>
      <section className="section">
        <div className="wrap"><div className="head"><Eyebrow n="03">Delegates</Eyebrow><h2>In their own words.</h2></div><Testimonials items={testimonials} /></div>
      </section>
      <FinalCta title="Summer 2027 goes further." body="Three countries instead of one, up to 100 delegates instead of twelve. Applications open on 25 November 2026." />
    </>
  );
}
