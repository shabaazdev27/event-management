"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Clock, CheckCircle2, Ticket, Calendar } from "lucide-react";

type ScheduleItem = {
  time: string;
  title: string;
  desc: string;
  done: boolean;
  active: boolean;
};

type EventDoc = {
  id: string;
  name: string;
  type: string;
  date: string;
  schedule: ScheduleItem[];
};

export default function EventSchedule() {
  const { venueId } = useVenue();
  return <EventScheduleInner key={venueId} venueId={venueId} />;
}

function EventScheduleInner({ venueId }: { venueId: string }) {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(venuePaths.events(venueId), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventDoc));
      setEvents(data);
      setSelectedEventId((prev) => {
        if (data.length === 0) return "";
        if (prev && data.some((e) => e.id === prev)) return prev;
        return data[0].id;
      });
    });
    return () => unsub();
  }, [venueId]);

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const schedule = currentEvent?.schedule || [];

  return (
    <section
      className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 h-full flex flex-col"
      aria-labelledby="event-schedule-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" aria-hidden />
          <h2 id="event-schedule-heading" className="font-semibold text-lg">
            Event Schedule
          </h2>
        </div>

        {events.length > 0 && (
          <div className="flex items-center gap-2 bg-neutral-950/50 px-3 py-1.5 rounded-lg border border-white/10 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" aria-hidden />
            <label htmlFor="event-schedule-select" className="sr-only">
              Select event
            </label>
            <select
              id="event-schedule-select"
              className="bg-transparent text-sm text-white focus:outline-none w-full appearance-none pr-4"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-neutral-900">
                  {ev.name} ({ev.date})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-neutral-500 italic">
          No events scheduled.
        </div>
      ) : schedule.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-neutral-500 italic">
          No schedule details available for this event.
        </div>
      ) : (
        <div className="flex-1 space-y-6">
          {schedule.map((item, idx) => (
            <div key={idx} className="relative flex gap-4">
              {idx !== schedule.length - 1 && (
                <div
                  className={`absolute top-8 left-3 w-0.5 h-full -ml-[1px] ${item.done ? "bg-indigo-500/50" : "bg-white/5"}`}
                  aria-hidden
                />
              )}

              <div className="relative z-10 flex-shrink-0 mt-1">
                {item.done ? (
                  <CheckCircle2 className="w-6 h-6 text-indigo-400 bg-neutral-950 rounded-full" aria-hidden />
                ) : item.active ? (
                  <div
                    className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    aria-hidden
                  >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-white/10 bg-neutral-900" aria-hidden />
                )}
              </div>

              <div
                className={`flex-1 pb-4 ${item.active ? "opacity-100" : "opacity-60"} min-w-0`}
              >
                <div className="flex justify-between items-start mb-1 flex-wrap gap-1">
                  <h3
                    className={`font-medium pr-2 max-w-full break-words ${item.active ? "text-indigo-300" : "text-white"}`}
                  >
                    {item.title}
                  </h3>
                  <span className="text-[10px] sm:text-xs font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded flex-shrink-0">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm flex gap-3 items-center">
        <Ticket className="w-5 h-5 text-indigo-400 flex-shrink-0" aria-hidden />
        <span className="text-indigo-200">
          {currentEvent?.type === "Concert"
            ? "Have your digital tickets ready before approaching security."
            : "Please present your credentials at the VIP gate."}
        </span>
      </div>
    </section>
  );
}
