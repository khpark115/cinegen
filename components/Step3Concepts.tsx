import React, { useState, useEffect } from 'react';
import { StoryConcept } from '../types';
import { SparklesIcon, ArrowLeftIcon, RefreshCcwIcon, ArrowRightIcon, Loader2Icon, FilmIcon, ClapperboardIcon, Edit3Icon, CheckIcon, XIcon, AlertCircleIcon } from 'lucide-react';

interface Props {
  concepts: StoryConcept[];
  onSelect: (concept: StoryConcept) => void;
  onRegenerate: (feedback: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

const Step3Concepts: React.FC<Props> = ({ concepts = [], onSelect, onRegenerate, onBack, isLoading }) => {
  const [localConcepts, setLocalConcepts] = useState<StoryConcept[]>(Array.isArray(concepts) ? concepts : []);
  const [feedback, setFeedback] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StoryConcept | null>(null);

  useEffect(() => {
    setLocalConcepts(Array.isArray(concepts) ? concepts : []);
    setEditingId(null);
    setEditForm(null);
    setSelectedId(null);
  }, [concepts]);

  const handleStartEdit = (e: React.MouseEvent, concept: StoryConcept) => {
      e.stopPropagation();
      setEditingId(concept.id);
      setEditForm({ ...concept });
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(null);
      setEditForm(null);
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (editForm) {
          setLocalConcepts(prev => prev.map(c => c.id === editForm.id ? editForm : c));
          setEditingId(null);
          setEditForm(null);
      }
  };

  const handleFormChange = (field: keyof StoryConcept, value: string) => {
      if (editForm) {
          setEditForm({ ...editForm, [field]: value });
      }
  };

  const handleCardClick = (id: string) => {
      if (!editingId) {
          setSelectedId(id);
      }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="text-center mb-12 animate-fade-in">
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Directorial Vision</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Select or customize the concept that best matches your creative intent.</p>
      </div>

      {!isLoading && localConcepts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-20 text-center mb-12 shadow-inner">
            <div className="bg-slate-100 dark:bg-slate-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500 dark:text-indigo-400 shadow-xl">
                <AlertCircleIcon size={40}/>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">No concepts generated</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
                The AI couldn't generate a story based on your topic. 
                Please try a more descriptive logline.
            </p>
            <button onClick={onBack} className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-bold transition-all">
                Go Back and Try Again
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {(localConcepts || []).map((concept, idx) => {
                const isSelected = selectedId === concept.id;
                const isEditing = editingId === concept.id;
                const data = isEditing && editForm ? editForm : concept;

                return (
                <div 
                    key={concept.id}
                    onClick={() => handleCardClick(concept.id)}
                    className={`
                    relative group transition-all duration-300 animate-slide-up
                    ${isSelected ? 'scale-105 z-10' : 'hover:scale-[1.02]'}
                    ${isEditing ? 'z-20 scale-105' : 'cursor-pointer'}
                    `}
                    style={{ animationDelay: `${idx * 100}ms` }}
                >
                    <div className={`
                        h-full glass-panel rounded-3xl p-8 flex flex-col transition-all border
                        ${isSelected ? 'border-indigo-600 dark:border-indigo-500 ring-4 ring-indigo-500/10 dark:ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-600'}
                        ${isEditing ? 'bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-2xl' : ''}
                    `}>
                        <div className="flex justify-between items-start mb-6">
                            <span className="text-xs font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase border border-indigo-600/30 px-3 py-1 rounded-full bg-indigo-600/5 dark:bg-indigo-500/10">
                                Option {idx + 1}
                            </span>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button onClick={handleSaveEdit} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg" title="Save"><CheckIcon size={16}/></button>
                                        <button onClick={handleCancelEdit} className="p-1.5 bg-slate-500 hover:bg-slate-400 text-white rounded-full shadow-lg" title="Cancel"><XIcon size={16}/></button>
                                    </>
                                ) : (
                                    <>
                                        {isSelected && <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg mr-2 animate-pulse"><CheckIcon size={16}/></div>}
                                        <button onClick={(e) => handleStartEdit(e, concept)} className="text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-white transition-colors p-1"><Edit3Icon size={16}/></button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {isEditing ? (
                            <input className="text-2xl font-bold text-slate-900 dark:text-white mb-4 bg-slate-50 dark:bg-slate-900/80 border border-indigo-500/50 rounded-lg px-3 py-2 w-full outline-none" value={data.title} onChange={(e) => handleFormChange('title', e.target.value)} />
                        ) : (
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 leading-tight min-h-[60px]">{data.title}</h3>
                        )}
                        
                        <div className={`flex-1 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl mb-4 border border-slate-200 dark:border-slate-700/50 overflow-y-auto ${isEditing ? 'h-[300px]' : 'max-h-[250px]'} scrollbar-thin`}>
                            {isEditing ? (
                                <textarea className="w-full h-full bg-transparent text-slate-600 dark:text-slate-300 text-sm leading-relaxed outline-none resize-none" value={data.logline} onChange={(e) => handleFormChange('logline', e.target.value)} />
                            ) : (
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm text-justify whitespace-pre-wrap">{data.logline}</p>
                            )}
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                            <div className="flex items-start gap-3">
                                <ClapperboardIcon size={16} className="text-slate-400 mt-1 shrink-0"/>
                                <div className="w-full">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Tone</div>
                                    {isEditing ? (
                                        <input className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 w-full outline-none" value={data.tone} onChange={(e) => handleFormChange('tone', e.target.value)} />
                                    ) : (
                                        <div className="text-sm text-slate-600 dark:text-slate-300">{data.tone}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <FilmIcon size={16} className="text-slate-400 mt-1 shrink-0"/>
                                <div className="w-full">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Visual Style</div>
                                    {isEditing ? (
                                        <input className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 w-full outline-none" value={data.visualStyle} onChange={(e) => handleFormChange('visualStyle', e.target.value)} />
                                    ) : (
                                        <div className="text-sm text-slate-600 dark:text-slate-300">{data.visualStyle}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
      )}

      <div className="glass-panel rounded-2xl p-4 mb-10 flex flex-col md:flex-row gap-4 items-center animate-fade-in shadow-xl transition-colors">
         <div className="flex-1 w-full relative">
            <RefreshCcwIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input 
                type="text" 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Suggest global changes (e.g. 'More mystery')..."
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 shadow-sm dark:shadow-none"
                disabled={isLoading}
            />
         </div>
         <button 
            onClick={() => onRegenerate(feedback)}
            disabled={isLoading}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold border border-slate-200 dark:border-slate-600 transition-all flex items-center gap-2 whitespace-nowrap shadow-md"
         >
            {isLoading ? <Loader2Icon className="animate-spin" size={18} /> : <RefreshCcwIcon size={18} />}
            Regenerate All
         </button>
      </div>

      <div className="flex justify-between items-center px-2">
          <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-6 py-3 font-medium flex items-center gap-2 transition-colors">
              <ArrowLeftIcon size={20} /> Back
          </button>
          
          <button 
            onClick={() => { const c = localConcepts.find(c => c.id === selectedId); if(c) onSelect(c); }}
            disabled={!selectedId || isLoading || !!editingId}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-xl font-bold shadow-2xl shadow-indigo-500/30 flex items-center gap-3 transition-all transform hover:scale-[1.02]"
          >
              Develop Assets <ArrowRightIcon size={20} />
          </button>
      </div>
    </div>
  );
};

export default Step3Concepts;