"use client";

import { useState, useEffect } from "react";
import { Gamepad2, Award, Zap, ChevronRight, Loader2 } from "lucide-react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";

type Question = {
  question: string;
  options: string[];
  answer: string;
};

export default function FanGame() {
  const { venueId } = useVenue();
  return <FanGameInner key={venueId} venueId={venueId} />;
}

function FanGameInner({ venueId }: { venueId: string }) {
  const [triviaQuestions, setTriviaQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    const triviaRef = venuePaths.trivia(venueId);
    const unsubscribe = onSnapshot(triviaRef, (snap) => {
      if (!snap.exists()) {
        const defaultDoc = {
          questions: [
            {
              question: "What year did the headliner's debut album drop?",
              options: ["2015", "2018", "2019", "2021"],
              answer: "2018",
            },
            {
              question: "Which of these is NOT a stage at today's event?",
              options: [
                "Neon Stage",
                "Echo Valley",
                "Thunder Dome",
                "Solar Stage",
              ],
              answer: "Thunder Dome",
            },
            {
              question: "How many times has the main act performed here?",
              options: ["First time", "Twice", "Three times", "Five times"],
              answer: "First time",
            },
          ],
        };
        setDoc(triviaRef, defaultDoc);
        setTriviaQuestions(defaultDoc.questions);
      } else {
        const data = snap.data();
        if (data.questions && data.questions.length > 0) {
          setTriviaQuestions(data.questions as Question[]);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [venueId]);

  const handleAnswer = (option: string) => {
    setSelectedOption(option);
    setTimeout(() => {
      if (option === triviaQuestions[currentQ]?.answer) {
        setScore((s) => s + 100);
      }
      if (currentQ < triviaQuestions.length - 1) {
        setCurrentQ((q) => q + 1);
        setSelectedOption(null);
      } else {
        setShowResult(true);
      }
    }, 1000);
  };

  const resetGame = () => {
    setCurrentQ(0);
    setScore(0);
    setShowResult(false);
    setSelectedOption(null);
  };

  const cardBase =
    "bg-gradient-to-br from-indigo-950 to-neutral-900 border border-indigo-500/20 rounded-2xl flex flex-col relative overflow-hidden";
  const cardTall = `${cardBase} min-h-[min(480px,56vh)] max-h-[min(760px,90vh)]`;

  if (loading) {
    return (
      <section
        className={`${cardBase} p-6 min-h-[240px] max-h-[min(360px,45vh)] items-center justify-center`}
        aria-busy="true"
        aria-label="Loading trivia"
      >
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" aria-hidden />
      </section>
    );
  }

  if (triviaQuestions.length === 0) {
    return (
      <section
        className={`${cardBase} p-6 min-h-[200px] max-h-[min(320px,40vh)] items-center justify-center`}
      >
        <Gamepad2 className="w-8 h-8 text-indigo-400/50 mb-3" aria-hidden />
        <p className="text-neutral-500 text-sm">Trivia coming soon!</p>
      </section>
    );
  }

  return (
    <section className={`${cardTall} p-4 sm:p-6`} aria-labelledby="fan-trivia-heading">
      <div className="absolute -top-10 -right-10 p-4 opacity-5 pointer-events-none" aria-hidden>
        <Gamepad2 className="w-48 h-48" />
      </div>

      <div className="flex items-center justify-between gap-2 mb-4 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Gamepad2 className="w-5 h-5 text-indigo-400 flex-shrink-0" aria-hidden />
          <h2 id="fan-trivia-heading" className="font-semibold text-base sm:text-lg text-white truncate">
            Fan Trivia Challenge
          </h2>
        </div>
        <div className="flex items-center gap-1.5 bg-neutral-950/50 px-3 py-1.5 rounded-full border border-white/10 flex-shrink-0">
          <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" aria-hidden />
          <span className="font-mono text-sm text-yellow-400">{score} pts</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain relative z-10 pr-1 -mr-1">
        {showResult ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4 py-6">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mb-2">
              <Award className="w-8 h-8 text-indigo-400" aria-hidden />
            </div>
            <h3 className="text-xl font-bold text-white text-center">Quiz Complete!</h3>
            <p className="text-neutral-400 text-center mb-4">
              You earned <span className="text-yellow-400 font-bold">{score}</span> points.
            </p>
            <button
              type="button"
              onClick={resetGame}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors border border-white/10 text-sm font-medium"
            >
              Play Again
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-2">
            <div className="flex gap-1" role="progressbar" aria-valuenow={currentQ + 1} aria-valuemin={1} aria-valuemax={triviaQuestions.length} aria-label="Question progress">
              {triviaQuestions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full ${idx <= currentQ ? "bg-indigo-500" : "bg-white/10"}`}
                />
              ))}
            </div>
            <h3 className="text-lg font-medium text-white leading-snug">
              {triviaQuestions[currentQ]?.question}
            </h3>

            <div className="space-y-3" role="list">
              {triviaQuestions[currentQ]?.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === triviaQuestions[currentQ]?.answer;
                const isWrong = isSelected && !isCorrect;

                let btnStyle =
                  "bg-neutral-950/50 border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/10";
                if (selectedOption) {
                  if (isCorrect)
                    btnStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
                  else if (isWrong)
                    btnStyle = "bg-rose-500/20 border-rose-500/50 text-rose-300";
                  else btnStyle = "bg-neutral-950/50 border-white/5 opacity-50";
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    role="listitem"
                    disabled={!!selectedOption}
                    onClick={() => handleAnswer(option)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-2 ${btnStyle}`}
                  >
                    <span className="text-sm font-medium text-balance">{option}</span>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 ${selectedOption ? "opacity-0" : "opacity-40"}`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
