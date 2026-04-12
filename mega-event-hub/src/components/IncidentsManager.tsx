"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, addDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";

type Incident = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
};

export default function IncidentsManager() {
  const { venueId } = useVenue();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", description: "", severity: "medium" });

  useEffect(() => {
    const q = query(venuePaths.incidents(venueId), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Incident[];
      setIncidents(liveData);
    });

    return () => unsubscribe();
  }, [venueId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(venuePaths.incidents(venueId), {
      title: addForm.title,
      description: addForm.description,
      severity: addForm.severity,
      createdAt: serverTimestamp()
    });
    setAddForm({ title: "", description: "", severity: "medium" });
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Resolve this incident?")) {
      await deleteDoc(venuePaths.incidentDoc(venueId, id));
    }
  };

  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="font-semibold text-white">Active Incidents</h2>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs font-semibold bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/30 transition-colors text-rose-400"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Report Incident"}
        </button>
      </div>

      {isAdding && (
         <form onSubmit={handleAdd} className="mb-6 p-4 bg-neutral-800/40 rounded-xl border border-white/5 flex flex-wrap gap-4 items-end">
           <div className="flex-1 min-w-[200px]">
             <label className="text-xs text-neutral-400 mb-1 block">Incident Title</label>
             <input type="text" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50" value={addForm.title} onChange={e => setAddForm({...addForm, title: e.target.value})} />
           </div>
           <div className="flex-1 min-w-[200px]">
             <label className="text-xs text-neutral-400 mb-1 block">Description</label>
             <input type="text" className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50" value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} />
           </div>
           <div className="w-32">
             <label className="text-xs text-neutral-400 mb-1 block">Severity</label>
             <select className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50" value={addForm.severity} onChange={e => setAddForm({...addForm, severity: e.target.value as Incident["severity"]})}>
               <option value="low">Low</option>
               <option value="medium">Medium</option>
               <option value="high">High</option>
             </select>
           </div>
           <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Submit</button>
         </form>
      )}

      {incidents.length === 0 ? (
        <div className="text-sm text-emerald-500/80 italic p-4 text-center border border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-xl">All clear! No active incidents.</div>
      ) : (
        <div className="space-y-3">
          {incidents.map(inc => (
            <div key={inc.id} className="flex justify-between items-start p-4 rounded-xl bg-neutral-800/40 border border-white/5 gap-4">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${inc.severity === 'high' ? 'bg-rose-500 animate-pulse' : inc.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <span className="text-sm font-medium text-white">{inc.title}</span>
                  </div>
                  <div className="text-xs text-neutral-400">{inc.description}</div>
               </div>
               <button onClick={() => handleDelete(inc.id)} className="p-1.5 text-neutral-500 hover:text-emerald-400 bg-neutral-800 rounded-lg transition-colors" title="Mark Resolved">
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
