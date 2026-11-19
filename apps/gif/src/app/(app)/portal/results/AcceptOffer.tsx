"use client";
import { useState, useTransition } from "react";
import { acceptOfferAction } from "@/app/actions/portal";

export function AcceptOffer() {
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="panel" style={{ maxWidth: 560 }}>
      <p>Accepting confirms you will take part and starts your participant preparation from 8 June 2027.</p>
      <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await acceptOfferAction(); if (r?.error) setErr(r.error); })}>{pending ? "Accepting…" : "Accept my offer"}</button>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}
