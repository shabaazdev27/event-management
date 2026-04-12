"use client";

import { useEffect, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Gamepad2, Plus, Trash2, X } from "lucide-react";

type Question = {
  question: string;
  options: string[];
  answer: string;
};

export default function TriviaManager() {
  const { venueId } = useVenue();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ 
    question: "", 
    opt1: "", opt2: "", opt3: "", opt4: "", 
    answer: "" 
  });

  useEffect(() => {
    const triviaRef = venuePaths.trivia(venueId);
    const unsubscribe = onSnapshot(triviaRef, (snap) => {
      if (snap.exists() && snap.data().questions) {
        setQuestions(snap.data().questions);
      } else {
        setQuestions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [venueId]);

  const handleSave = async (newQuestions: Question[]) => {
    await setDoc(venuePaths.trivia(venueId), {
      questions: newQuestions
    }, { merge: true });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.question || !addForm.answer) return;
    
    const options = [addForm.opt1, addForm.opt2, addForm.opt3, addForm.opt4].filter(o => o.trim() !== "");
    if (options.length < 2) {
      alert("Please provide at least 2 options.");
      return;
    }

    const newQ: Question = {
      question: addForm.question,
      options,
      answer: addForm.answer
    };

    const updated = [...questions, newQ];
    await handleSave(updated);
    
    setIsAdding(false);
    setAddForm({ question: "", opt1: "", opt2: "", opt3: "", opt4: "", answer: "" });
  };

  const handleDelete = async (idx: number) => {
    if (!confirm("Are you sure you want to remove this question?")) return;
    const updated = questions.filter((_, i) => i !== idx);
    await handleSave(updated);
  };

  if (loading) return <div className="text-sm text-neutral-400">Loading Trivia Manager...</div>;

  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6 text-yellow-400">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5" />
          <h2 className="font-semibold">Manage Fan Trivia</h2>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs font-semibold bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/20 hover:bg-yellow-500/30 transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add Question"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-neutral-800/40 rounded-xl border border-white/5 space-y-4">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Question Text</label>
            <input 
              type="text" required
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50"
              value={addForm.question} onChange={e => setAddForm({...addForm, question: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Option 1</label>
              <input type="text" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50" value={addForm.opt1} onChange={e => setAddForm({...addForm, opt1: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Option 2</label>
              <input type="text" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50" value={addForm.opt2} onChange={e => setAddForm({...addForm, opt2: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Option 3</label>
              <input type="text" className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50" value={addForm.opt3} onChange={e => setAddForm({...addForm, opt3: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Option 4</label>
              <input type="text" className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50" value={addForm.opt4} onChange={e => setAddForm({...addForm, opt4: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Correct Answer (Must match one option exactly)</label>
            <input 
              type="text" required
              className="w-full bg-neutral-900 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500"
              value={addForm.answer} onChange={e => setAddForm({...addForm, answer: e.target.value})}
            />
          </div>
          <button type="submit" className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Save Question
          </button>
        </form>
      )}

      <div className="space-y-3">
        {questions.length === 0 && <div className="text-neutral-500 text-sm italic">No trivia questions active.</div>}
        
        {questions.map((q, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-neutral-800/40 border border-white/5 relative group">
             <button onClick={() => handleDelete(idx)} className="absolute top-4 right-4 p-1.5 text-rose-400/50 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 rounded-lg">
               <Trash2 className="w-4 h-4" />
             </button>
             <h3 className="text-sm font-medium text-white mb-2 pr-8">{q.question}</h3>
             <ul className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
               {q.options.map((opt, i) => (
                 <li key={i} className={`px-2 py-1 bg-neutral-900 rounded-md border ${opt === q.answer ? 'border-emerald-500/40 text-emerald-400' : 'border-white/5'}`}>
                   {opt}
                 </li>
               ))}
             </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
