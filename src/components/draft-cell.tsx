"use client";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
// The input draft remains local until commit; remote refetches never replace focused text.
// Native date/time controls are multi-segment widgets: a single Tab moves focus between
// their internal segments instead of blurring, so they also commit on the native "change"
// event (fired once a complete value is entered) rather than relying on blur alone.
export function DraftCell({ value, onCommit, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const original = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const commit = (next: string | null) => {
    if (next !== null && next !== original.current) { onCommit(next); original.current = next; }
    setDraft(null);
  };
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handler = () => commit(el.value);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  });
  return <input ref={inputRef} {...props} value={draft ?? value} onFocus={() => { original.current = value; }} onChange={e => setDraft(e.target.value)} onBlur={() => commit(draft)} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />;
}
