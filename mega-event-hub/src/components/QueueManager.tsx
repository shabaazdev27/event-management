"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Clock, Plus, Trash2, Edit2, Check, X, AlertCircle } from "lucide-react";

type Queue = {
  id: string;
  title: string;
  minutes: number;
  order: number;
};

export default function QueueManager() {
  const { venueId } = useVenue();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", minutes: 0 });
  
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", minutes: 0 });

  useEffect(() => {
    const queuesCol = venuePaths.queues(venueId);
    const q = query(queuesCol, orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        const defaultQueues = [
          { title: "Gate A (Main)", minutes: 15 },
          { title: "Gate B (North)", minutes: 5 },
          { title: "Merch Tent 1", minutes: 35 },
          { title: "Restrooms (East)", minutes: 2 },
        ];
        
        defaultQueues.forEach((dq, idx) => {
          addDoc(queuesCol, {
            title: dq.title,
            minutes: dq.minutes,
            timeText: `${dq.minutes} mins`,
            status: dq.minutes < 10 ? 'fast' : dq.minutes < 25 ? 'moderate' : 'slow',
            order: idx,
            createdAt: serverTimestamp()
          });
        });
      } else {
        const liveQueues = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Queue[];
        
        setQueues(liveQueues);
        setLoading(false);
        setError("");
      }
    }, (error) => {
      console.error("Error fetching queues:", error);
      setError("Failed to sync connected database.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [venueId]);

  const getStatusFromMinutes = (mins: number) => {
    if (mins < 10) return 'fast';
    if (mins < 25) return 'moderate';
    return 'slow';
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.title.trim()) return;
    
    try {
      await addDoc(venuePaths.queues(venueId), {
        title: addForm.title,
        minutes: addForm.minutes,
        timeText: `${addForm.minutes} mins`,
        status: getStatusFromMinutes(addForm.minutes),
        order: queues.length,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setAddForm({ title: "", minutes: 0 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add queue.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.title.trim()) return;
    
    try {
      const qRef = venuePaths.queueDoc(venueId, editingId);
      await updateDoc(qRef, {
        title: editForm.title,
        minutes: editForm.minutes,
        timeText: `${editForm.minutes} mins`,
        status: getStatusFromMinutes(editForm.minutes)
      });
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update queue.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this queue?")) return;
    try {
      await deleteDoc(venuePaths.queueDoc(venueId, id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete queue.");
    }
  };

  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6 text-emerald-400">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <h2 className="font-semibold">Manage Wait Times</h2>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs font-semibold bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add Queue"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm flex gap-2 items-center">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-neutral-800/40 rounded-xl border border-white/5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-neutral-400 mb-1 block">Gate / Location Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Gate A (Main)"
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              value={addForm.title}
              onChange={e => setAddForm({...addForm, title: e.target.value})}
            />
          </div>
          <div className="w-32">
            <label className="text-xs text-neutral-400 mb-1 block">Wait Time (mins)</label>
            <input 
              type="number" 
              required
              min="0"
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              value={addForm.minutes}
              onChange={e => setAddForm({...addForm, minutes: parseInt(e.target.value) || 0})}
            />
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Save
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading && <div className="text-neutral-500 text-sm">Loading queues...</div>}
        {!loading && queues.length === 0 && <div className="text-neutral-500 text-sm italic">No queues found. Add one above.</div>}
        
        {queues.map(q => (
          <div key={q.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-xl bg-neutral-800/40 border border-white/5 gap-4">
            {editingId === q.id ? (
              <form onSubmit={handleUpdate} className="flex flex-wrap gap-4 items-end w-full">
                <div className="flex-1 min-w-[150px]">
                  <input 
                    type="text" required
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    value={editForm.title}
                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                  />
                </div>
                <div className="w-24">
                  <input 
                    type="number" required min="0"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    value={editForm.minutes}
                    onChange={e => setEditForm({...editForm, minutes: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="p-1.5 bg-neutral-700/50 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-neutral-200">{q.title}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${q.minutes < 10 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : q.minutes < 25 ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' : 'bg-rose-500/20 text-rose-400 border-rose-500/20'}`}>
                    {q.minutes} mins
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingId(q.id); setEditForm({ title: q.title, minutes: q.minutes }); }} className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="p-1.5 text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/30 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
