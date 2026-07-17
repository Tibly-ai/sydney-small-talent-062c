/* TIBLY:SQL
CREATE TABLE IF NOT EXISTS bookings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  note text,
  slot_date date NOT NULL,
  slot_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_date, slot_time);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY anon_select_bookings ON bookings FOR SELECT TO anonymous USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY auth_select_bookings ON bookings FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY anon_insert_bookings ON bookings FOR INSERT TO anonymous WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY auth_insert_bookings ON bookings FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT (slot_date, slot_time, status) ON bookings TO anonymous, authenticated;
GRANT INSERT (name, email, phone, note, slot_date, slot_time) ON bookings TO anonymous, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anonymous, authenticated;
*/

import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { NeonPostgrestClient } from "@neondatabase/postgrest-js";

const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

function getClient() {
  const backend = (window as any).TIBLY_BACKEND;
  const anonToken = backend?.anonToken;
  const dataApiUrl = backend?.dataApiUrl;
  return new NeonPostgrestClient({
    dataApiUrl,
    options: { global: { headers: { Authorization: "Bearer " + anonToken } } },
  });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function formatLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function buildDays(): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
  while (days.length < 14) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

type BookedRow = { slot_date: string; slot_time: string };

function App() {
  const days = useMemo(() => buildDays(), []);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const client = getClient();
        const from = toISODate(days[0]);
        const to = toISODate(days[days.length - 1]);
        const { data, error } = await client
          .from("bookings")
          .select("slot_date,slot_time")
          .gte("slot_date", from)
          .lte("slot_date", to);
        if (error) throw error;
        if (!cancelled) {
          const set = new Set<string>();
          (data as BookedRow[] | null || []).forEach((r) => {
            set.add(r.slot_date + "|" + r.slot_time);
          });
          setBooked(set);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError("This page isn't fully set up yet. Please check back soon.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  function isTaken(d: Date, t: string): boolean {
    return booked.has(toISODate(d) + "|" + t);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!selectedDate || !selectedTime) {
      setSubmitError("Please choose a day and time.");
      return;
    }
    if (!name.trim() || !email.trim()) {
      setSubmitError("Please provide your name and email.");
      return;
    }
    setSubmitting(true);
    try {
      const client = getClient();
      const iso = toISODate(selectedDate);
      const { error } = await client.from("bookings").insert([
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          note: note.trim() || null,
          slot_date: iso,
          slot_time: selectedTime,
        },
      ]);
      if (error) throw error;
      setBooked((prev) => {
        const next = new Set(prev);
        next.add(iso + "|" + selectedTime);
        return next;
      });
      setSubmitted(true);
    } catch (e) {
      setSubmitError("Something went wrong submitting your request. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setSubmitted(false);
    setSelectedDate(null);
    setSelectedTime(null);
    setName("");
    setEmail("");
    setPhone("");
    setNote("");
    setSubmitError(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl md:text-4xl text-ink mb-2">
          Book a Consultation with Sydney Small
        </h1>
        <p className="text-ink/70">
          Sydney Small Talent Agency, New York. Pick an open day and time below and tell us a bit about yourself.
        </p>
      </header>

      {loadError && (
        <div className="card p-6 mb-6 text-center">
          <p className="text-ink/80">{loadError}</p>
        </div>
      )}

      {!loadError && submitted && (
        <div className="card p-8 text-center">
          <h2 className="font-display text-2xl text-ink mb-2">Request sent!</h2>
          <p className="text-ink/70 mb-6">
            Thanks{name ? ", " + name : ""}! Your request for{" "}
            {selectedDate ? formatLabel(selectedDate) : ""} at {selectedTime} has been received. Sydney will
            follow up by email shortly.
          </p>
          <button className="btn" onClick={startOver}>
            Book another time
          </button>
        </div>
      )}

      {!loadError && !submitted && (
        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="font-display text-xl text-ink mb-4">1. Choose a day</h2>
            {loading ? (
              <p className="text-ink/60">Loading availability…</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {days.map((d) => {
                  const active =
                    selectedDate && toISODate(selectedDate) === toISODate(d);
                  return (
                    <button
                      key={toISODate(d)}
                      onClick={() => {
                        setSelectedDate(d);
                        setSelectedTime(null);
                      }}
                      className={active ? "btn" : "btn-secondary"}
                    >
                      {formatLabel(d)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedDate && !loading && (
            <section className="card p-6">
              <h2 className="font-display text-xl text-ink mb-4">
                2. Choose a time — {formatLabel(selectedDate)}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIMES.map((t) => {
                  const taken = isTaken(selectedDate, t);
                  const active = selectedTime === t;
                  return (
                    <button
                      key={t}
                      disabled={taken}
                      onClick={() => setSelectedTime(t)}
                      className={active ? "btn" : "btn-secondary"}
                    >
                      {taken ? t + " (booked)" : t}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {selectedDate && selectedTime && (
            <section className="card p-6">
              <h2 className="font-display text-xl text-ink mb-4">
                3. Your details for {formatLabel(selectedDate)} at {selectedTime}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-ink/70 mb-1">Full name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border border-ink/20 px-3 py-2"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink/70 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-ink/20 px-3 py-2"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-ink/70 mb-1">Phone (optional)</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md border border-ink/20 px-3 py-2"
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink/70 mb-1">
                    A short note about yourself
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-md border border-ink/20 px-3 py-2 min-h-[100px]"
                    placeholder="Tell Sydney a little about you and what you'd like to discuss."
                  />
                </div>
                {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
                <button type="submit" disabled={submitting} className="btn">
                  {submitting ? "Submitting…" : "Request Consultation"}
                </button>
              </form>
            </section>
          )}

          {!loading && days.every((d) => TIMES.every((t) => isTaken(d, t))) && (
            <p className="text-center text-ink/60">
              All slots for the next two weeks are booked. Please check back later.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("tibly-app-root")!).render(<App />);