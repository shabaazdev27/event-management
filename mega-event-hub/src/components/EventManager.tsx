"use client";

import { useEffect, useState } from "react";
import { onSnapshot, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Calendar, Plus, Trash2, Edit2, Check, X } from "lucide-react";

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

export default function EventManager() {
  const { venueId, venue } = useVenue();
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "", date: "" });
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", type: "", date: "" });

  const [managingScheduleId, setManagingScheduleId] = useState<string | null>(null);
  const [newScheduleItem, setNewScheduleItem] = useState({ time: "", title: "", desc: "", status: "upcoming" as "upcoming" | "active" | "done" });

  const handleToggleAdd = () => {
    if (isAdding) {
      setAddForm({ name: "", type: "", date: "" });
      setError("");
      setIsAdding(false);
      return;
    }
    setAddForm({ name: "", type: "", date: "" });
    setError("");
    setIsAdding(true);
  };

  useEffect(() => {
    const eventsCol = venuePaths.events(venueId);
    const unsub = onSnapshot(eventsCol, (snap) => {
      if (snap.empty) {
        const city = venue.city;
        addDoc(eventsCol, {
          name: `${city} — Evening Showcase`,
          type: "Concert",
          date: "2026-08-15",
          schedule: [
            { time: "14:00", title: "Gates Open", desc: "Early access", done: true, active: false },
            { time: "19:00", title: "Opening Act", desc: "Special guest", done: false, active: true },
          ],
        });
        addDoc(eventsCol, {
          name: `${venue.shortName} Fan Festival`,
          type: "Fan zone",
          date: "2026-09-10",
          schedule: [
            { time: "18:00", title: "Red Carpet", desc: "VIP arrivals", done: false, active: false },
            { time: "20:00", title: "Main Program", desc: "Arena floor", done: false, active: false },
          ],
        });
      } else {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventDoc)));
      }
    });
    return () => unsub();
  }, [venueId, venue.city, venue.shortName]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name) return;
    const previousForm = { ...addForm };
    try {
      setError("");
      setIsAdding(false);
      setAddForm({ name: "", type: "", date: "" });
      await addDoc(venuePaths.events(venueId), {
        ...previousForm,
        schedule: [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create event.");
      setAddForm(previousForm);
      setIsAdding(true);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      setError("");
      await updateDoc(venuePaths.eventDoc(venueId, editingId), {
        name: editForm.name,
        type: editForm.type,
        date: editForm.date,
      });
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update event.");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Delete this event completely?")) {
      try {
        await deleteDoc(venuePaths.eventDoc(venueId, id));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete event.");
      }
    }
  };

  const handleAddScheduleItem = async (eventId: string, currentSchedule: ScheduleItem[]) => {
    if (!newScheduleItem.time || !newScheduleItem.title) return;
    const previousItem = { ...newScheduleItem };
    const item = {
      time: newScheduleItem.time,
      title: newScheduleItem.title,
      desc: newScheduleItem.desc,
      done: newScheduleItem.status === 'done',
      active: newScheduleItem.status === 'active'
    };
    
    // Auto sort by time could be done here, for now just push
    const updated = [...currentSchedule, item].sort((a,b) => a.time.localeCompare(b.time));

    try {
      setError("");
      setNewScheduleItem({ time: "", title: "", desc: "", status: "upcoming" });
      setManagingScheduleId(null);
      await updateDoc(venuePaths.eventDoc(venueId, eventId), {
        schedule: updated,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add schedule item.");
      setNewScheduleItem(previousItem);
      setManagingScheduleId(eventId);
    }
  };

  const handleRemoveScheduleItem = async (eventId: string, currentSchedule: ScheduleItem[], idxToRemove: number) => {
    const updated = currentSchedule.filter((_, i) => i !== idxToRemove);
    try {
      setError("");
      await updateDoc(venuePaths.eventDoc(venueId, eventId), { schedule: updated });
      setManagingScheduleId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove schedule item.");
    }
  };

  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6 text-indigo-400">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <h2 className="font-semibold">Manage Events & Schedules</h2>
        </div>
        <button 
          onClick={handleToggleAdd}
          className="flex items-center gap-1 text-xs font-semibold bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add Event"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddEvent} className="mb-6 p-4 bg-neutral-800/40 rounded-xl border border-white/5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-37.5">
             <label className="text-xs text-neutral-400 mb-1 block">Event Name</label>
             <input type="text" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} />
          </div>
          <div className="w-32">
             <label className="text-xs text-neutral-400 mb-1 block">Type</label>
             <input type="text" placeholder="Concert" className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value})} />
          </div>
          <div className="w-40">
             <label className="text-xs text-neutral-400 mb-1 block">Date</label>
             <input type="date" className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} />
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Create</button>
        </form>
      )}

      <div className="space-y-4">
        {events.map((ev) => (
          <div key={ev.id} className="p-4 rounded-xl bg-neutral-800/40 border border-white/5 space-y-4">
            {editingId === ev.id ? (
              <form onSubmit={handleUpdateEvent} className="flex gap-4 w-full">
                <input type="text" className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-2 text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                <input type="text" className="w-24 bg-neutral-900 border border-white/10 rounded-lg px-2 text-sm" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} />
                <input type="date" className="w-32 bg-neutral-900 border border-white/10 rounded-lg px-2 text-sm" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                <button type="submit" className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/30"><Check className="w-4 h-4" /></button>
                <button type="button" onClick={() => setEditingId(null)} className="p-1.5 bg-neutral-700/50 text-neutral-300 rounded"><X className="w-4 h-4" /></button>
              </form>
            ) : (
              <div className="flex justify-between items-center group">
                <div>
                  <h3 className="font-semibold text-white">{ev.name}</h3>
                  <p className="text-xs text-neutral-400">{ev.type} • {ev.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setManagingScheduleId(managingScheduleId === ev.id ? null : ev.id)} className="text-xs bg-indigo-500/10 text-indigo-300 px-3 py-1.5 rounded hover:bg-indigo-500/20">
                    {managingScheduleId === ev.id ? 'Close Schedule' : 'Manage Schedule'}
                  </button>
                  <button onClick={() => { setEditingId(ev.id); setEditForm({name: ev.name, type: ev.type, date: ev.date}); }} className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 text-rose-400 bg-rose-500/10 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}
            
            {managingScheduleId === ev.id && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="mb-4">
                  <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">Event Timeline</h4>
                  {(!ev.schedule || ev.schedule.length === 0) ? (
                    <p className="text-sm text-neutral-500 italic">No schedule items added.</p>
                  ) : (
                    <div className="space-y-2">
                      {ev.schedule.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-neutral-900/50 p-2 rounded border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">{item.time}</span>
                            <span className={`text-sm font-medium ${item.active ? 'text-indigo-400' : 'text-neutral-200'}`}>{item.title}</span>
                            <span className="text-xs text-neutral-500 hidden md:inline">{item.desc}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] uppercase font-semibold text-neutral-500">{item.done ? 'Done' : item.active ? 'Active' : 'Upcoming'}</span>
                             <button onClick={() => handleRemoveScheduleItem(ev.id, ev.schedule, idx)} className="text-rose-400/50 hover:text-rose-400"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 items-end mt-2 p-3 bg-neutral-900 rounded-lg">
                  <div className="w-20">
                    <input type="time" className="w-full bg-neutral-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white" value={newScheduleItem.time} onChange={e => setNewScheduleItem({...newScheduleItem, time: e.target.value})} />
                  </div>
                  <div className="flex-1">
                    <input type="text" placeholder="Title..." className="w-full bg-neutral-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white" value={newScheduleItem.title} onChange={e => setNewScheduleItem({...newScheduleItem, title: e.target.value})} />
                  </div>
                  <div className="flex-1 hidden md:block">
                    <input type="text" placeholder="Desc..." className="w-full bg-neutral-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white" value={newScheduleItem.desc} onChange={e => setNewScheduleItem({...newScheduleItem, desc: e.target.value})} />
                  </div>
                  <div className="w-28">
                    <select className="w-full bg-neutral-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white" value={newScheduleItem.status} onChange={e => setNewScheduleItem({...newScheduleItem, status: e.target.value as typeof newScheduleItem.status})}>
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <button onClick={() => handleAddScheduleItem(ev.id, ev.schedule || [])} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-medium"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
