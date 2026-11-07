"use client";

// Calendar views: month grid, week and day time grids, and an agenda list. Items can be dragged to another day or
// time and timed items resized, with the mouse or (after a long press) by touch; the page decides what a drop means
// and asks before anything that needs a confirmation. Keyboard users open an item and change it in the form.
import { useCallback, useEffect, useRef, useState } from "react";
import { Repeat } from "lucide-react";
import { muted, panel, ring } from "./ui";
import type { EventRow, OccurrenceRef } from "./EventSheet";
import { CATEGORY_STYLE, addDays, itemsOnDay, layoutDay, layoutWeek, minutesToTime, monthWeeks, timeToMinutes, weekday, zonedParts, type CalItem } from "@/lib/os/calendar";
import { cn } from "@/lib/utils";

export type CalSource = "event" | "task" | "deadline" | "milestone" | "content" | "campaign" | "google";
export type Item = CalItem & {
  source: CalSource; style: string; label: string; company: string | null; division: string | null; project: string | null; campaign?: string | null;
  mine: boolean; href?: string; event?: EventRow; occ?: OccurrenceRef | null; external?: string; sub?: string;
  starts_at?: string; ends_at?: string; movable: boolean; resizable: boolean; recurring?: boolean; endTime?: string;
};
export type Drop = { item: Item; mode: "move" | "resize"; day: string; minutes: number | null; grabOffset: number };

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOUR = 44;

type DragState = { item: Item; mode: "move" | "resize"; x0: number; y0: number; touch: boolean; ready: boolean; started: boolean; grabOffset: number; timer?: ReturnType<typeof setTimeout> };

/** Pointer drag that works for mouse (after 4 px) and touch (after a 350 ms long press, so scrolling still works). */
export function useCalendarDrag(onDrop: (d: Drop) => void, onOpen: (i: Item) => void) {
  const st = useRef<DragState | null>(null);
  const [preview, setPreview] = useState<{ key: string; day: string; minutes: number | null; mode: "move" | "resize"; grabOffset: number } | null>(null);

  const target = (x: number, y: number) => {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-cal-day]");
    if (!el) return null;
    const day = el.dataset.calDay!;
    if (el.dataset.calTimed === undefined) return { day, minutes: null };
    const r = el.getBoundingClientRect();
    return { day, minutes: Math.max(0, Math.min(1440, ((y - r.top) / r.height) * 1440)) };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = st.current;
      if (!s) return;
      const dist = Math.hypot(e.clientX - s.x0, e.clientY - s.y0);
      if (!s.ready) {
        if (s.touch ? dist > 8 : false) { clearTimeout(s.timer); st.current = null; return; }
        if (!s.touch && dist > 4) s.ready = true; else return;
      }
      s.started = true;
      const t = target(e.clientX, e.clientY);
      if (t) setPreview({ key: s.item.key, day: t.day, minutes: t.minutes, mode: s.mode, grabOffset: s.grabOffset });
    };
    const up = (e: PointerEvent) => {
      const s = st.current;
      if (!s) return;
      clearTimeout(s.timer);
      st.current = null;
      setPreview(null);
      if (!s.started) { if (!s.touch || !s.ready) onOpen(s.item); return; }
      // The click that ends a drag lands on whatever is under the pointer (often an empty slot, which would start a new
      // event): swallow it.
      const eat = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener("click", eat, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", eat, { capture: true }), 250);
      const t = target(e.clientX, e.clientY);
      if (t) onDrop({ item: s.item, mode: s.mode, day: t.day, minutes: t.minutes, grabOffset: s.grabOffset });
    };
    const cancel = () => { if (st.current) { clearTimeout(st.current.timer); st.current = null; setPreview(null); } };
    const noScroll = (e: TouchEvent) => { if (st.current?.ready) e.preventDefault(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    document.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key); document.removeEventListener("touchmove", noScroll);
    };
  }, [onDrop, onOpen]);

  const begin = useCallback((e: React.PointerEvent, item: Item, mode: "move" | "resize" = "move") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (!item.movable) { st.current = { item, mode, x0: e.clientX, y0: e.clientY, touch: e.pointerType === "touch", ready: false, started: false, grabOffset: 0 }; return; }
    // Where in the item the pointer grabbed it (minutes from its start), so a timed item doesn't jump to the pointer.
    let grabOffset = 0;
    const col = (e.target as HTMLElement).closest<HTMLElement>("[data-cal-timed]");
    if (col && item.starts_at && mode === "move") {
      const r = col.getBoundingClientRect();
      const at = ((e.clientY - r.top) / r.height) * 1440;
      grabOffset = at - timeToMinutes(item.startTime || "00:00");
    }
    const s: DragState = { item, mode, x0: e.clientX, y0: e.clientY, touch: e.pointerType === "touch", ready: mode === "resize" && e.pointerType !== "touch", started: false, grabOffset };
    if (s.touch) s.timer = setTimeout(() => { s.ready = true; navigator.vibrate?.(15); }, 350);
    st.current = s;
  }, []);
  return { begin, preview };
}

const style = (i: Item) => CATEGORY_STYLE[i.style as keyof typeof CATEGORY_STYLE] ?? CATEGORY_STYLE.Other;

function Chip({ i, onOpen, begin, dragging }: { i: Item; onOpen: (i: Item) => void; begin: ReturnType<typeof useCalendarDrag>["begin"]; dragging?: boolean }) {
  return (
    <button type="button" title={`${i.label}: ${i.title}`} data-testid="os-cal-item" data-source={i.source} data-key={i.key}
      onPointerDown={(e) => begin(e, i)} onClick={(e) => { if (e.detail === 0) onOpen(i); }}
      className={cn("flex w-full select-none items-center truncate rounded px-1.5 text-left text-[11px] font-medium leading-5", ring, style(i).bar, i.movable && "cursor-grab touch-manipulation", dragging && "opacity-40")}>
      {i.recurring && <Repeat size={10} aria-hidden="true" className="mr-0.5 shrink-0" />}
      {!i.allDay && i.startTime ? <span className="mr-1 opacity-80">{i.startTime}</span> : null}<span className="truncate">{i.title}</span>
      <span className="sr-only"> ({i.label})</span>
    </button>
  );
}

export function MonthGrid({ y, m, today, items, onOpen, onDay, onDrop }: { y: number; m: number; today: string; items: Item[]; onOpen: (i: Item) => void; onDay: (d: string) => void; onDrop: (d: Drop) => void }) {
  const weeks = monthWeeks(y, m);
  const month = `${y}-${String(m).padStart(2, "0")}`;
  const { begin, preview } = useCalendarDrag(onDrop, onOpen);
  return (
    <div className={cn(panel, "overflow-hidden")} data-testid="os-cal-month">
      <div className="grid grid-cols-7 border-b border-[#E6E9EE] bg-[#F7F9FB]">
        {DAY_NAMES.map((d) => <div key={d} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[#3A4B60] sm:text-xs"><span className="sm:hidden">{d.slice(0, 3)}</span><span className="hidden sm:inline">{d}</span></div>)}
      </div>
      {weeks.map((week) => {
        const { placed, hidden, lanes } = layoutWeek(week, items, 3);
        return (
          <div key={week[0]} className="relative border-b border-[#E6E9EE] last:border-b-0">
            <div className="grid grid-cols-7">
              {week.map((d) => {
                const isToday = d === today, other = !d.startsWith(month), past = d < today;
                return (
                  <div key={d} data-cal-day={d} className={cn("min-h-[92px] border-r border-[#E6E9EE] last:border-r-0 sm:min-h-[112px]", (other || past) && "bg-[#F6F7F9]", preview?.day === d && "bg-[#E8F0FB] outline outline-2 -outline-offset-2 outline-[#2457A6]")}>
                    <button type="button" onClick={() => onDay(d)} aria-label={`Open ${d}`} aria-current={isToday ? "date" : undefined}
                      className={cn("flex h-6 w-full items-center px-1.5 text-xs font-semibold", ring, isToday ? "bg-[#2E7D4F] text-white" : other ? "bg-[#7B8796] text-white" : "bg-[#2F4157] text-white")}>
                      {Number(d.slice(8))}{isToday && <span className="ml-1 hidden font-normal sm:inline">Today</span>}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-7 grid grid-cols-7 gap-y-0.5 px-0.5" style={{ gridTemplateRows: `repeat(${Math.max(lanes, 1)}, 20px)` }}>
              {placed.map((p) => (
                <div key={`${p.item.key}-${week[0]}`} className="pointer-events-auto px-0.5" style={{ gridColumn: `${p.col + 1} / span ${p.span}`, gridRow: p.lane + 1 }}>
                  <Chip i={p.item} onOpen={onOpen} begin={begin} dragging={preview?.key === p.item.key} />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-1 grid grid-cols-7">
              {hidden.map((n, c) => <div key={c} className="px-1">{n > 0 && <button type="button" className={cn("pointer-events-auto text-[11px] font-medium text-[#2F4157] hover:underline", ring)} onClick={() => onDay(week[c])}>+{n} more</button>}</div>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Week (7 days) or day (1 day) time grid: all-day and multi-day items in a band on top, timed items on the hours. */
export function TimeGrid({ days, today, items, onOpen, onDay, onDrop, onSlot, testId }: {
  days: string[]; today: string; items: Item[]; onOpen: (i: Item) => void; onDay: (d: string) => void; onDrop: (d: Drop) => void; onSlot: (day: string, time: string) => void; testId: string;
}) {
  const { begin, preview } = useCalendarDrag(onDrop, onOpen);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 7 * HOUR; }, []);
  const timed = (i: Item) => !i.allDay && i.first === i.last && Boolean(i.startTime);
  const band = items.filter((i) => !timed(i));
  const weekLike = days.length === 7 ? days : [...days, ...Array.from({ length: 7 - days.length }, (_, k) => addDays(days[days.length - 1], k + 1))];
  const { placed, hidden, lanes } = layoutWeek(weekLike, band, days.length === 1 ? 6 : 4);
  const nowParts = zonedParts(new Date());
  const cols = `44px repeat(${days.length}, minmax(0, 1fr))`;
  return (
    <div className={cn(panel, "overflow-hidden")} data-testid={testId}>
      <div className="grid border-b border-[#E6E9EE] bg-[#F7F9FB]" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => (
          <button key={d} type="button" onClick={() => onDay(d)} className={cn("px-1 py-1.5 text-center text-[11px] font-semibold", ring, d === today ? "text-[#2E7D4F]" : "text-[#3A4B60]")} aria-current={d === today ? "date" : undefined}>
            <span className="block uppercase">{DAY_NAMES[weekday(d)].slice(0, 3)}</span><span className="text-sm">{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>
      {/* All-day / multi-day band */}
      <div className="relative grid border-b border-[#E6E9EE]" style={{ gridTemplateColumns: cols }}>
        <div className="py-1 pr-1 text-right text-[10px] text-[#66768A]">All day</div>
        {days.map((d) => <div key={d} data-cal-day={d} className={cn("min-h-8 border-l border-[#E6E9EE]", preview?.day === d && preview.minutes === null && "bg-[#E8F0FB]")} />)}
        <div className="pointer-events-none absolute inset-y-0 right-0 grid gap-y-0.5 py-1" style={{ left: 44, gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.max(lanes, 1)}, 20px)` }}>
          {placed.filter((p) => p.col < days.length).map((p) => (
            <div key={p.item.key} className="pointer-events-auto px-0.5" style={{ gridColumn: `${p.col + 1} / span ${Math.min(p.span, days.length - p.col)}`, gridRow: p.lane + 1 }}>
              <Chip i={p.item} onOpen={onOpen} begin={begin} dragging={preview?.key === p.item.key} />
            </div>
          ))}
        </div>
        {hidden.some((n, c) => n > 0 && c < days.length) && (
          <div className="col-span-full flex" style={{ paddingLeft: 44 }}>
            {days.map((d, c) => <div key={d} className="flex-1 px-1 text-[10px]">{hidden[c] > 0 && <button type="button" className="font-medium text-[#2F4157] underline" onClick={() => onDay(d)}>+{hidden[c]}</button>}</div>)}
          </div>
        )}
      </div>
      {/* Hours */}
      <div ref={scroller} className="max-h-[560px] overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: cols, height: 24 * HOUR }}>
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => <span key={h} className="absolute right-1 -translate-y-1/2 text-[10px] text-[#66768A]" style={{ top: h * HOUR }}>{h ? `${String(h).padStart(2, "0")}:00` : ""}</span>)}
          </div>
          {days.map((d) => {
            const list = items.filter((i) => timed(i) && i.first === d);
            const blocks = list.map((i) => ({ key: i.key, start: timeToMinutes(i.startTime!), end: Math.max(timeToMinutes(i.startTime!) + 20, i.endTime ? timeToMinutes(i.endTime) : timeToMinutes(i.startTime!) + 60) }));
            const lay = layoutDay(blocks);
            const pv = preview && preview.day === d && preview.minutes !== null ? preview : null;
            const pItem = pv ? items.find((i) => i.key === pv.key) : null;
            return (
              <div key={d} data-cal-day={d} data-cal-timed="" className={cn("relative border-l border-[#E6E9EE]", d === today && "bg-[#F7FBF8]")}
                onClick={(e) => { if (e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); onSlot(d, minutesToTime(((e.clientY - r.top) / r.height) * 1440, 30)); }}>
                {Array.from({ length: 24 }, (_, h) => <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-[#F0F2F5]" style={{ top: h * HOUR }} />)}
                {d === today && <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-[#2E7D4F]" style={{ top: (timeToMinutes(nowParts.time) / 60) * HOUR }} aria-hidden="true" />}
                {list.map((i) => {
                  const b = blocks.find((x) => x.key === i.key)!, l = lay.get(i.key)!;
                  return (
                    <div key={i.key} className={cn("absolute overflow-hidden rounded px-1 text-[11px] leading-tight shadow-sm", style(i).bar, preview?.key === i.key && "opacity-40")}
                      style={{ top: (b.start / 60) * HOUR + 1, height: ((b.end - b.start) / 60) * HOUR - 2, left: `calc(${(l.col / l.cols) * 100}% + 1px)`, width: `calc(${100 / l.cols}% - 2px)` }}>
                      <button type="button" className={cn("block h-full w-full select-none text-left", ring, i.movable && "cursor-grab")} data-testid="os-cal-item" data-source={i.source} data-key={i.key}
                        onPointerDown={(e) => begin(e, i)} onClick={(e) => { if (e.detail === 0) onOpen(i); }} title={`${i.label}: ${i.title}`}>
                        <span className="flex items-center gap-0.5 font-semibold">{i.recurring && <Repeat size={10} aria-hidden="true" />}<span className="truncate">{i.title}</span></span>
                        <span className="block truncate opacity-80">{i.startTime}{i.endTime ? `–${i.endTime}` : ""}</span>
                        <span className="sr-only">{i.label}</span>
                      </button>
                      {i.resizable && <span role="presentation" className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none" onPointerDown={(e) => begin(e, i, "resize")} data-testid="os-cal-resize" />}
                    </div>
                  );
                })}
                {pv && pItem && (() => {
                  const dur = (pItem.endTime ? timeToMinutes(pItem.endTime) : timeToMinutes(pItem.startTime || "00:00") + 60) - timeToMinutes(pItem.startTime || "00:00");
                  const start = pv.mode === "resize" ? timeToMinutes(pItem.startTime || "00:00") : timeToMinutes(minutesToTime(pv.minutes! - pv.grabOffset));
                  const end = pv.mode === "resize" ? Math.max(start + 15, timeToMinutes(minutesToTime(pv.minutes!))) : start + (pItem.allDay ? 60 : dur);
                  return (
                    <div className="pointer-events-none absolute inset-x-0.5 z-20 rounded border-2 border-dashed border-[#2457A6] bg-[#E8F0FB]/80 px-1 text-[11px] font-semibold text-[#2457A6]" style={{ top: (start / 60) * HOUR, height: Math.max(18, ((end - start) / 60) * HOUR) }} data-testid="os-cal-drop-preview">
                      {minutesToTime(start)}–{minutesToTime(end)}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Agenda({ days, today, items, onOpen, skipEmpty, empty }: { days: string[]; today: string; items: Item[]; onOpen: (i: Item) => void; skipEmpty?: boolean; empty: string }) {
  const groups = days.map((d) => ({ d, list: itemsOnDay(d, items) })).filter((g) => !skipEmpty || g.list.length);
  if (!groups.some((g) => g.list.length)) return <p className={cn(panel, "px-4 py-8 text-center text-sm", muted)} data-testid="os-cal-agenda">{empty}</p>;
  return (
    <div className="space-y-3" data-testid="os-cal-agenda">
      {groups.map(({ d, list }) => (
        <section key={d} className={cn(panel, "overflow-hidden")}>
          <h3 className={cn("px-3 py-1.5 text-xs font-semibold text-white", d === today ? "bg-[#2E7D4F]" : "bg-[#2F4157]")}>
            {new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}{d === today && " · Today"}
          </h3>
          <ul className="divide-y divide-[#F0F2F5]">
            {list.map((i) => (
              <li key={i.key}>
                <button type="button" onClick={() => onOpen(i)} className={cn("flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-[#F7F9FB]", ring)} data-testid="os-cal-item" data-source={i.source}>
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", style(i).dot)} aria-hidden="true" />
                  <span className="w-16 shrink-0 text-xs text-[#3A4B60]">{i.allDay ? "All day" : i.first < d ? "Cont." : i.startTime}</span>
                  <span className="min-w-0 flex-1"><span className="flex items-center gap-1 truncate font-medium text-[#1F2D3D]">{i.recurring && <Repeat size={12} aria-hidden="true" />}{i.title}</span><span className={cn("block truncate text-xs", muted)}>{i.label}{i.sub ? ` · ${i.sub}` : ""}</span></span>
                </button>
              </li>
            ))}
            {!list.length && <li className={cn("px-3 py-2 text-xs", muted)}>Nothing scheduled.</li>}
          </ul>
        </section>
      ))}
    </div>
  );
}
