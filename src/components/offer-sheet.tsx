"use client";

import { FormEvent, useState } from "react";
import { createInitialOffer } from "@/lib/negotiations";

export function OfferSheet({ listingId, vehicleName, onClose, onCreated }: { listingId: string; vehicleName: string; onClose: () => void; onCreated: (conversationId: string) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) { setError("Enter a whole offer amount greater than zero."); return; }
    setPending(true); setError(null);
    try { onCreated(await createInitialOffer(listingId, numericAmount, note.trim())); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Your offer could not be sent."); setPending(false); }
  }
  return <div className="offer-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="offer-sheet" role="dialog" aria-modal="true" aria-labelledby="offer-heading" onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="sheet-close" onClick={onClose} aria-label="Close offer form">×</button>
      <p className="eyebrow">Start a negotiation</p><h2 id="offer-heading">Make an offer for {vehicleName}</h2>
      <p className="muted">The seller can accept, decline, or send a counteroffer. Contact details stay private.</p>
      <form className="stack-form" onSubmit={submit}>
        <label>Offer amount (₹)<input autoFocus inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))} required /></label>
        <label>Note <span className="optional">Optional</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="For example: Can I inspect it this weekend?" rows={3} /></label>
        {error && <p className="form-alert error" role="alert">{error}</p>}
        <button className="button button-wide" disabled={pending}>{pending ? "Sending offer…" : "Send offer"}</button>
      </form>
    </section>
  </div>;
}
