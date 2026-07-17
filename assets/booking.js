import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { NeonPostgrestClient } from "@neondatabase/postgrest-js";
const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
function getClient() {
  const backend = window.TIBLY_BACKEND;
  const anonToken = backend?.anonToken;
  const dataApiUrl = backend?.dataApiUrl;
  return new NeonPostgrestClient({
    dataApiUrl,
    options: { global: { headers: { Authorization: "Bearer " + anonToken } } }
  });
}
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}
function formatLabel(d) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function buildDays() {
  const days = [];
  const cursor = /* @__PURE__ */ new Date();
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
function App() {
  const days = useMemo(() => buildDays(), []);
  const [booked, setBooked] = useState(/* @__PURE__ */ new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
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
        const { data, error } = await client.from("bookings").select("slot_date,slot_time").gte("slot_date", from).lte("slot_date", to);
        if (error) throw error;
        if (!cancelled) {
          const set = /* @__PURE__ */ new Set();
          (data || []).forEach((r) => {
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
  function isTaken(d, t) {
    return booked.has(toISODate(d) + "|" + t);
  }
  async function handleSubmit(e) {
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
          slot_time: selectedTime
        }
      ]);
      if (error) throw error;
      setBooked((prev) => {
        const next = new Set(prev);
        next.add(iso + "|" + selectedTime);
        return next;
      });
      setSubmitted(true);
    } catch (e2) {
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
  return /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto px-4 py-10", children: [
    /* @__PURE__ */ jsxs("header", { className: "mb-8 text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl md:text-4xl text-ink mb-2", children: "Book a Consultation with Sydney Small" }),
      /* @__PURE__ */ jsx("p", { className: "text-ink/70", children: "Sydney Small Talent Agency, New York. Pick an open day and time below and tell us a bit about yourself." })
    ] }),
    loadError && /* @__PURE__ */ jsx("div", { className: "card p-6 mb-6 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-ink/80", children: loadError }) }),
    !loadError && submitted && /* @__PURE__ */ jsxs("div", { className: "card p-8 text-center", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl text-ink mb-2", children: "Request sent!" }),
      /* @__PURE__ */ jsxs("p", { className: "text-ink/70 mb-6", children: [
        "Thanks",
        name ? ", " + name : "",
        "! Your request for",
        " ",
        selectedDate ? formatLabel(selectedDate) : "",
        " at ",
        selectedTime,
        " has been received. Sydney will follow up by email shortly."
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn", onClick: startOver, children: "Book another time" })
    ] }),
    !loadError && !submitted && /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
      /* @__PURE__ */ jsxs("section", { className: "card p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-xl text-ink mb-4", children: "1. Choose a day" }),
        loading ? /* @__PURE__ */ jsx("p", { className: "text-ink/60", children: "Loading availability\u2026" }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2", children: days.map((d) => {
          const active = selectedDate && toISODate(selectedDate) === toISODate(d);
          return /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setSelectedDate(d);
                setSelectedTime(null);
              },
              className: active ? "btn" : "btn-secondary",
              children: formatLabel(d)
            },
            toISODate(d)
          );
        }) })
      ] }),
      selectedDate && !loading && /* @__PURE__ */ jsxs("section", { className: "card p-6", children: [
        /* @__PURE__ */ jsxs("h2", { className: "font-display text-xl text-ink mb-4", children: [
          "2. Choose a time \u2014 ",
          formatLabel(selectedDate)
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", children: TIMES.map((t) => {
          const taken = isTaken(selectedDate, t);
          const active = selectedTime === t;
          return /* @__PURE__ */ jsx(
            "button",
            {
              disabled: taken,
              onClick: () => setSelectedTime(t),
              className: active ? "btn" : "btn-secondary",
              children: taken ? t + " (booked)" : t
            },
            t
          );
        }) })
      ] }),
      selectedDate && selectedTime && /* @__PURE__ */ jsxs("section", { className: "card p-6", children: [
        /* @__PURE__ */ jsxs("h2", { className: "font-display text-xl text-ink mb-4", children: [
          "3. Your details for ",
          formatLabel(selectedDate),
          " at ",
          selectedTime
        ] }),
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm text-ink/70 mb-1", children: "Full name" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  value: name,
                  onChange: (e) => setName(e.target.value),
                  className: "w-full rounded-md border border-ink/20 px-3 py-2",
                  placeholder: "Jane Doe"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-sm text-ink/70 mb-1", children: "Email" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "email",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  className: "w-full rounded-md border border-ink/20 px-3 py-2",
                  placeholder: "jane@example.com"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-ink/70 mb-1", children: "Phone (optional)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                value: phone,
                onChange: (e) => setPhone(e.target.value),
                className: "w-full rounded-md border border-ink/20 px-3 py-2",
                placeholder: "(555) 555-5555"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-ink/70 mb-1", children: "A short note about yourself" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                value: note,
                onChange: (e) => setNote(e.target.value),
                className: "w-full rounded-md border border-ink/20 px-3 py-2 min-h-[100px]",
                placeholder: "Tell Sydney a little about you and what you'd like to discuss."
              }
            )
          ] }),
          submitError && /* @__PURE__ */ jsx("p", { className: "text-red-600 text-sm", children: submitError }),
          /* @__PURE__ */ jsx("button", { type: "submit", disabled: submitting, className: "btn", children: submitting ? "Submitting\u2026" : "Request Consultation" })
        ] })
      ] }),
      !loading && days.every((d) => TIMES.every((t) => isTaken(d, t))) && /* @__PURE__ */ jsx("p", { className: "text-center text-ink/60", children: "All slots for the next two weeks are booked. Please check back later." })
    ] })
  ] });
}
createRoot(document.getElementById("tibly-app-root")).render(/* @__PURE__ */ jsx(App, {}));
