import React, { useState, useEffect } from 'react';
import { Question, Answer, StoryConcept } from '../types';
import { ArrowLeftIcon, BoxIcon, LayersIcon, MonitorIcon, MonitorPlayIcon, SmartphoneIcon, SquareIcon, TvIcon, RefreshCwIcon, Loader2Icon, PaletteIcon } from 'lucide-react';
import { regenerateDetailsAnswer } from '../services/geminiService';

interface Props {
  questions: Question[];
  onSubmit: (answers: Answer[], aspectRatio: string) => void;
  onBack: () => void;
  isLoading: boolean;
  selectedConcept?: StoryConcept;
  language?: string;
  selectedVisualStyle: string;
}

const ASPECT_RATIOS = [
  { id: '16:9', label: 'Landscape (16:9)', icon: <MonitorPlayIcon size={24} />, desc: 'YouTube, Cinema, TV' },
  { id: '9:16', label: 'Portrait (9:16)', icon: <SmartphoneIcon size={24} />, desc: 'TikTok, Reels, Shorts' },
  { id: '4:3', label: 'Standard (4:3)', icon: <TvIcon size={24} />, desc: 'Classic TV, iPad' },
  { id: '1:1', label: 'Square (1:1)', icon: <SquareIcon size={24} />, desc: 'Instagram Post' },
];

const StepStoryDetails: React.FC<Props> = ({ questions, onSubmit, onBack, isLoading, selectedConcept, language = 'English', selectedVisualStyle }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedRatio, setSelectedRatio] = useState<string>('16:9');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    questions.forEach(q => {
      if (q.suggestedAnswer) initialAnswers[q.id] = q.suggestedAnswer;
    });
    setAnswers(initialAnswers);
  }, [questions]);

  const handleInputChange = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));
  
  const handleRegenerateSuggestion = async (q: Question) => {
    if (!selectedConcept || regeneratingId) return;
    setRegeneratingId(q.id);
    try {
      const newAnswer = await regenerateDetailsAnswer(q.question, selectedConcept, language);
      setAnswers(prev => ({ ...prev, [q.id]: newAnswer }));
    } catch (e) { console.error(e); } finally { setRegeneratingId(null); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedAnswers: Answer[] = questions.map((q) => ({ questionId: q.id, answer: answers[q.id] || '' }));
    onSubmit(formattedAnswers, selectedRatio);
  };

  if (isLoading) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 backdrop-blur-md">
              <div className="w-full max-w-md text-center space-y-8">
                  <div className="relative w-32 h-32 mx-auto"><div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div><div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div><Loader2Icon size={48} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" /></div>
                  <div><h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-300 mb-2">Generating Script...</h2><p className="text-xl text-zinc-500 font-mono">Finalizing Storyboard</p></div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative animate-fade-in">
        
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-600/20 text-indigo-400 mb-4 ring-1 ring-indigo-500/50">
                <LayersIcon size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Phase 3: Narrative Architecture</h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                These 7 answers will dictate your screenplay's structure. 
                AI suggested initial ideas based on your concept—refine them to control the story.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Technical Specs */}
                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MonitorIcon size={20} className="text-indigo-400"/> Technical Specs</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-2">Aspect Ratio</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ASPECT_RATIOS.map(ratio => (
                                    <button
                                        key={ratio.id}
                                        type="button"
                                        onClick={() => setSelectedRatio(ratio.id)}
                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedRatio === ratio.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black border-zinc-800 text-slate-500 hover:border-zinc-600'}`}
                                    >
                                        {ratio.icon}
                                        <span className="text-xs font-bold">{ratio.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-black rounded-xl border border-zinc-800">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Visual Style</div>
                            <div className="text-sm text-white font-medium flex items-center gap-2">
                                <PaletteIcon size={14} className="text-pink-400"/> {selectedVisualStyle}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Question 1-3 (Setup) */}
                <div className="space-y-6">
                    {questions.slice(0, 3).map((q, idx) => (
                        <div key={q.id} className="relative group">
                            <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-black border border-indigo-500 flex items-center justify-center text-indigo-400 font-bold text-sm shadow-lg z-10">
                                {idx + 1}
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors">
                                <label className="block text-sm font-bold text-indigo-100 mb-2 pl-4">{q.question}</label>
                                <div className="relative">
                                    <textarea
                                        className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none h-24 leading-relaxed transition-all"
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        placeholder={q.placeholder || "Enter details..."}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRegenerateSuggestion(q)}
                                        disabled={!!regeneratingId}
                                        className="absolute bottom-3 right-3 p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/30 rounded-lg transition-all"
                                        title="Regenerate AI Suggestion"
                                    >
                                        {regeneratingId === q.id ? <Loader2Icon className="animate-spin" size={16}/> : <RefreshCwIcon size={16}/>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Questions 4-7 (Development & Resolution) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {questions.slice(3).map((q, idx) => (
                    <div key={q.id} className="relative group">
                        <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-black border border-purple-500 flex items-center justify-center text-purple-400 font-bold text-sm shadow-lg z-10">
                            {idx + 4}
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 hover:border-purple-500/50 transition-colors h-full">
                            <label className="block text-sm font-bold text-purple-100 mb-2 pl-4">{q.question}</label>
                            <div className="relative h-full">
                                <textarea
                                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-slate-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none resize-none h-24 leading-relaxed transition-all"
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                                    placeholder={q.placeholder || "Enter details..."}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRegenerateSuggestion(q)}
                                    disabled={!!regeneratingId}
                                    className="absolute bottom-3 right-3 p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-900/30 rounded-lg transition-all"
                                    title="Regenerate AI Suggestion"
                                >
                                    {regeneratingId === q.id ? <Loader2Icon className="animate-spin" size={16}/> : <RefreshCwIcon size={16}/>}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center pt-8 mt-8 border-t border-zinc-800">
                <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white px-4 py-2 transition-colors"><ArrowLeftIcon size={18} /> Back to Assets</button>
                <button type="submit" disabled={isLoading} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all transform hover:scale-[1.02]">
                    {isLoading ? <Loader2Icon className="animate-spin" size={20} /> : <BoxIcon size={20} />}
                    Generate Storyboard
                </button>
            </div>
        </form>
    </div>
  );
};

export default StepStoryDetails;