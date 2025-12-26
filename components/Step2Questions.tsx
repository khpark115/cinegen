import React, { useState, useEffect } from 'react';
import { Question, Answer, Character, LocationSetting, Gender, Outfit } from '../types';
import { ArrowRightIcon, ArrowLeftIcon, Edit3Icon, CameraIcon, MonitorIcon, BoxIcon, LayersIcon, MonitorPlayIcon, SmartphoneIcon, SquareIcon, TvIcon, RefreshCwIcon, Loader2Icon, UsersIcon, UploadIcon, PlusIcon, Trash2Icon, Maximize2Icon, XIcon, MapPinIcon, PaletteIcon, ShirtIcon, SparklesIcon, CheckIcon, SaveIcon, GlobeIcon, CalendarIcon, FlagIcon, UserIcon, DownloadIcon, CheckSquareIcon } from 'lucide-react';
import { regenerateDetailsAnswer, generateCharacterPortrait, generateLocationImage, generateOutfitImage, suggestStoryAssets } from '../services/geminiService';
import { saveWorldSetting, getCurrentUser } from '../services/storageService';
// @ts-ignore
import JSZip from 'jszip';

interface Props {
  questions: Question[];
  initialCharacters: Character[];
  initialLocations?: LocationSetting[];
  onSubmit: (answers: Answer[], visualStyle: string, aspectRatio: string, characters: Character[], locations: LocationSetting[]) => void;
  onBack: () => void;
  isLoading: boolean;
  selectedConcept?: any;
  language?: string;
  selectedVisualStyle: string;
  isEditingWorld?: boolean;
  onSaveWorldEdit?: (characters: Character[], locations: LocationSetting[]) => void;
}

const ASPECT_RATIOS = [
  { id: '16:9', label: 'Landscape (16:9)', icon: <MonitorPlayIcon size={24} />, desc: 'YouTube, Cinema, TV' },
  { id: '9:16', label: 'Portrait (9:16)', icon: <SmartphoneIcon size={24} />, desc: 'TikTok, Reels, Shorts' },
  { id: '4:3', label: 'Standard (4:3)', icon: <TvIcon size={24} />, desc: 'Classic TV, iPad' },
  { id: '1:1', label: 'Square (1:1)', icon: <SquareIcon size={24} />, desc: 'Instagram Post' },
];

const GENDERS: Gender[] = ['Male', 'Female', 'Neutral', 'Non-Binary'];

const downloadBase64 = (base64: string, filename: string) => {
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const Step2Questions: React.FC<Props> = ({ questions = [], initialCharacters = [], initialLocations = [], onSubmit, onBack, isLoading, selectedConcept, language = 'English', selectedVisualStyle, isEditingWorld, onSaveWorldEdit }) => {
  const [subStep, setSubStep] = useState<'ASSETS' | 'DETAILS'>('ASSETS');
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<LocationSetting[]>([]);
  const [selectedRatio, setSelectedRatio] = useState<string>('16:9');
  
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [generatingAvatarIdx, setGeneratingAvatarIdx] = useState<number | null>(null);
  const [generatingLocationIdx, setGeneratingLocationIdx] = useState<number | null>(null);
  const [generatingOutfitIdx, setGeneratingOutfitIdx] = useState<{cIdx: number, oIdx: number} | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [bulkGeneratingCharacters, setBulkGeneratingCharacters] = useState(false);
  const [bulkGeneratingLocations, setBulkGeneratingLocations] = useState(false);
  const [isSuggestingAssets, setIsSuggestingAssets] = useState(false);
  const [selectedCharIndices, setSelectedCharIndices] = useState<Set<number>>(new Set());
  const [selectedLocIndices, setSelectedLocIndices] = useState<Set<number>>(new Set());
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('Initializing...');
  const [isSaveWorldModalOpen, setIsSaveWorldModalOpen] = useState(false);
  const [isPromptSaveModalOpen, setIsPromptSaveModalOpen] = useState(false);
  const [pendingProceed, setPendingProceed] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [newWorldDesc, setNewWorldDesc] = useState("");

  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    (questions || []).forEach(q => {
      if (q && q.suggestedAnswer) initialAnswers[q.id] = q.suggestedAnswer;
    });
    setAnswers(initialAnswers);
    setCharacters(initialCharacters || []);
    setLocations(initialLocations || []);
    if (selectedConcept?.title) setNewWorldName(selectedConcept.title + " (World)");
  }, [questions, initialCharacters, initialLocations, selectedConcept]);

  useEffect(() => {
    if (isLoading) {
        setLoadingProgress(0);
        const steps = ["Analyzing Story...", "Refining Characters...", "Designing Backgrounds...", "Writing Script...", "Visualizing...", "Finalizing Board..."];
        let stepIdx = 0;
        const interval = setInterval(() => {
            setLoadingProgress(prev => Math.min(prev + (Math.random() * 5), 95));
            if (Math.random() > 0.7) {
                stepIdx = (stepIdx + 1) % steps.length;
                setLoadingStep(steps[stepIdx]);
            }
        }, 800);
        return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleAutoSuggestWardrobe = async () => {
      if (!selectedConcept || isSuggestingAssets) return;
      setIsSuggestingAssets(true);
      try {
          const suggestions = await suggestStoryAssets(selectedConcept, characters, language);
          const updatedChars = [...characters];
          updatedChars.forEach(char => {
             const newOutfits = (suggestions.outfitSuggestions && suggestions.outfitSuggestions[char.name]) || [];
             if (newOutfits.length > 0) {
                 if (!char.outfits) char.outfits = [];
                 const existingNames = new Set(char.outfits.map(o => o.name));
                 newOutfits.forEach((no: Outfit) => {
                     if (!existingNames.has(no.name)) {
                         char.outfits!.push(no);
                     }
                 });
             }
          });
          setCharacters(updatedChars);
      } catch (e) { alert("의상 제안 실패"); } finally { setIsSuggestingAssets(false); }
  };

  const handleAutoSuggestLocations = async () => {
      if (!selectedConcept || isSuggestingAssets) return;
      setIsSuggestingAssets(true);
      try {
          const suggestions = await suggestStoryAssets(selectedConcept, characters, language);
          const currentNames = new Set(locations.map(l => l.name));
          const toAdd = (suggestions.locationSuggestions || []).filter((l: LocationSetting) => !currentNames.has(l.name));
          if (toAdd.length > 0) setLocations(prev => [...prev, ...toAdd]);
      } catch (e) { alert("장소 제안 실패"); } finally { setIsSuggestingAssets(false); }
  };

  const handleCharacterChange = (idx: number, field: keyof Character, value: any) => {
    setCharacters(prev => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [field]: value };
        return updated;
    });
  };

  const handleAddCharacter = () => setCharacters(prev => [...prev, { name: "New Character", gender: "Neutral", role: "Role", description: "", outfits: [] }]);
  const handleDeleteCharacter = (idx: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== idx));
    const nextSel = new Set(selectedCharIndices); nextSel.delete(idx); setSelectedCharIndices(nextSel);
  };

  const handleAvatarUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (reader.result) handleCharacterChange(idx, 'avatarUrl', reader.result as string); };
    reader.readAsDataURL(file);
  };

  const handleGenerateAvatar = async (idx: number) => {
    if (generatingAvatarIdx !== null || bulkGeneratingCharacters) return;
    const char = characters[idx];
    setGeneratingAvatarIdx(idx);
    try {
        const url = await generateCharacterPortrait(char.name, char.gender, char.description, selectedVisualStyle, { age: char.age, race: char.race, bodyType: char.bodyType }, char.avatarUrl);
        setCharacters(prev => { const updated = [...prev]; updated[idx] = { ...updated[idx], avatarUrl: url }; return updated; });
    } catch (e: any) { alert(`생성 실패: ${e.message}`); } finally { setGeneratingAvatarIdx(null); }
  };

  const handleGenerateAllAvatars = async () => {
    if (bulkGeneratingCharacters) return;
    setBulkGeneratingCharacters(true);
    const updatedCharacters = [...characters];
    for (let i = 0; i < updatedCharacters.length; i++) {
        if (!updatedCharacters[i].avatarUrl) {
            try {
                const char = updatedCharacters[i];
                const url = await generateCharacterPortrait(char.name, char.gender, char.description, selectedVisualStyle, { age: char.age, race: char.race, bodyType: char.bodyType });
                updatedCharacters[i].avatarUrl = url;
                setCharacters([...updatedCharacters]); 
                await new Promise(resolve => setTimeout(resolve, 8000));
            } catch (e: any) { if (e.message.includes('Quota')) break; }
        }
    }
    setBulkGeneratingCharacters(false);
  };

  const toggleCharSelection = (idx: number) => {
      const next = new Set(selectedCharIndices);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      setSelectedCharIndices(next);
  };

  const handleAddOutfit = (cIdx: number) => {
      const updated = [...characters];
      if (!updated[cIdx].outfits) updated[cIdx].outfits = [];
      updated[cIdx].outfits!.push({ id: crypto.randomUUID(), name: "New Outfit", description: "", isDefault: updated[cIdx].outfits!.length === 0 });
      setCharacters(updated);
  };

  const handleGenerateOutfit = async (cIdx: number, oIdx: number) => {
      if (generatingOutfitIdx) return;
      const char = characters[cIdx];
      const outfits = char.outfits || [];
      const outfit = outfits[oIdx];
      if (!outfit) return;
      setGeneratingOutfitIdx({cIdx, oIdx});
      try {
          const url = await generateOutfitImage(char.name, char.gender, outfit.description || "Casual clothing", selectedVisualStyle, { age: char.age, race: char.race, bodyType: char.bodyType });
          const updated = [...characters];
          if (updated[cIdx].outfits) { updated[cIdx].outfits![oIdx].imageUrl = url; setCharacters(updated); }
      } catch(e: any) { alert(`의상 생성 실패: ${e.message}`); } finally { setGeneratingOutfitIdx(null); }
  };

  const handleSetDefaultOutfit = (cIdx: number, oIdx: number) => {
      const updated = [...characters];
      if (updated[cIdx].outfits) { updated[cIdx].outfits!.forEach((o, i) => o.isDefault = i === oIdx); setCharacters(updated); }
  };

  const handleLocationChange = (idx: number, field: keyof LocationSetting, value: string) => {
    setLocations(prev => { const updated = [...prev]; updated[idx] = { ...updated[idx], [field]: value }; return updated; });
  };
  const handleAddLocation = () => setLocations(prev => [...prev, { name: "New Location", description: "" }]);
  const handleDeleteLocation = (idx: number) => setLocations(prev => prev.filter((_, i) => i !== idx));

  const handleInputChange = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const handleRegenerateSuggestion = async (q: Question) => {
    if (!selectedConcept || regeneratingId) return;
    setRegeneratingId(q.id);
    try {
      const newAnswer = await regenerateDetailsAnswer(q.question, selectedConcept, language);
      setAnswers(prev => ({ ...prev, [q.id]: newAnswer }));
    } catch (e) { console.error(e); } finally { setRegeneratingId(null); }
  };

  // Fix: Added missing handleSaveWorldEdit to call the onSaveWorldEdit prop
  const handleSaveWorldEdit = () => {
    if (onSaveWorldEdit) onSaveWorldEdit(characters, locations);
  };

  // Fix: Added missing handleProceedClick to transition between sub-steps
  const handleProceedClick = () => {
    setSubStep('DETAILS');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedAnswers: Answer[] = (questions || []).map((q) => ({ questionId: q.id, answer: answers[q.id] || '' }));
    onSubmit(formattedAnswers, selectedVisualStyle, selectedRatio, characters, locations);
  };

  if (isLoading) {
      return (
          <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-black flex flex-col items-center justify-center p-8 backdrop-blur-md">
              <div className="w-full max-w-md text-center space-y-8">
                  <div className="relative w-32 h-32 mx-auto"><div className="absolute inset-0 border-4 border-slate-200 dark:border-zinc-800 rounded-full"></div><div className="absolute inset-0 border-4 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div><Loader2Icon size={48} className="absolute inset-0 m-auto text-indigo-600 dark:text-indigo-400 animate-pulse" /></div>
                  <div><h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-300 mb-2">Generating Board...</h2><p className="text-xl text-slate-500 dark:text-zinc-400 font-mono min-h-[1.5em]">{loadingStep}</p></div>
                  <div className="w-full bg-slate-200 dark:bg-zinc-900 rounded-full h-4 overflow-hidden border border-slate-300 dark:border-zinc-800"><div className="bg-gradient-to-r from-indigo-600 to-cyan-500 h-full transition-all duration-500 ease-out" style={{ width: `${loadingProgress}%` }} /></div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      {zoomedImage && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}><button className="absolute top-4 right-4 text-white hover:text-red-400"><XIcon size={32}/></button><img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-full rounded-lg shadow-2xl border border-slate-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}/></div>}

      <div className="mb-8 flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
                {isEditingWorld ? 'Edit World Assets' : (subStep === 'ASSETS' ? 'Phase 1: Asset Setup' : 'Phase 2: Narrative Architecture')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
                {isEditingWorld ? 'Modify characters and locations.' : (subStep === 'ASSETS' ? 'Define characters, outfits, and locations.' : 'Deepen your story with 7 Pillars.')}
            </p>
        </div>
        {!isEditingWorld && (
            <div className="flex gap-2">
                <button onClick={() => setSubStep('ASSETS')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${subStep === 'ASSETS' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-500 hover:bg-slate-50 dark:hover:text-slate-300 shadow-sm border border-slate-200 dark:border-zinc-800'}`}>1. Assets</button>
                <button onClick={() => setSubStep('DETAILS')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${subStep === 'DETAILS' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-500 hover:bg-slate-50 dark:hover:text-slate-300 shadow-sm border border-slate-200 dark:border-zinc-800'}`}>2. Story 7-Pillars</button>
            </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {(subStep === 'ASSETS' || isEditingWorld) && (
            <>
                <section>
                    <div className="flex items-center justify-between mb-4 bg-white dark:bg-zinc-950/50 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors">
                        <div className="flex items-center gap-2"><UsersIcon className="text-indigo-600 dark:text-indigo-400" size={20} /><h3 className="text-xl font-bold text-slate-900 dark:text-white">Main Characters</h3></div>
                        <div className="flex gap-2 items-center">
                            <button type="button" onClick={handleAutoSuggestWardrobe} disabled={isSuggestingAssets} className="text-xs flex items-center gap-1 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors shadow-md">
                                {isSuggestingAssets ? <Loader2Icon className="animate-spin" size={14}/> : <ShirtIcon size={14}/>} Auto-Suggest Wardrobe
                            </button>
                            <button type="button" onClick={handleGenerateAllAvatars} disabled={bulkGeneratingCharacters} className="text-xs flex items-center gap-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors shadow-md">
                                {bulkGeneratingCharacters ? <Loader2Icon className="animate-spin" size={14}/> : <SparklesIcon size={14}/>} Generate Portraits
                            </button>
                            <button type="button" onClick={handleAddCharacter} className="text-xs flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-md">
                                <PlusIcon size={14} /> Add Character
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        {(characters || []).map((char, idx) => {
                            const isSelected = selectedCharIndices.has(idx);
                            return (
                                <div key={idx} className={`bg-white dark:bg-zinc-950/40 border rounded-xl p-5 relative group shadow-sm hover:shadow-md transition-all ${isSelected ? 'border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-200 dark:border-zinc-800'}`}>
                                    <button type="button" onClick={() => handleDeleteCharacter(idx)} className="absolute top-3 right-3 p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors z-10"><Trash2Icon size={16}/></button>
                                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                                        <div className="flex-shrink-0 w-32 flex flex-col gap-3 pt-6">
                                            <div className="w-32 h-32 bg-slate-50 dark:bg-black rounded-xl border-2 border-slate-200 dark:border-zinc-800 overflow-hidden relative cursor-pointer group/avatar shadow-inner" onClick={() => char.avatarUrl && setZoomedImage(char.avatarUrl)}>
                                                {char.avatarUrl ? <img src={char.avatarUrl} className="w-full h-full object-cover"/> : <UsersIcon size={40} className="text-slate-200 dark:text-zinc-800 absolute inset-0 m-auto"/>}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                                                    <button type="button" onClick={(e) => {e.stopPropagation(); handleGenerateAvatar(idx);}} disabled={generatingAvatarIdx === idx || bulkGeneratingCharacters} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-full font-bold">
                                                        {generatingAvatarIdx === idx ? <Loader2Icon className="animate-spin" size={12}/> : (char.avatarUrl ? 'Restyle' : 'Generate')}
                                                    </button>
                                                    <label className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full font-bold cursor-pointer" onClick={e => e.stopPropagation()}>
                                                        Upload <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAvatarUpload(idx, e)}/>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-3 pt-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="text-xs text-indigo-600 dark:text-indigo-300 font-bold uppercase mb-1 block">Name</label><input className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-indigo-500 outline-none" value={char.name} onChange={(e) => handleCharacterChange(idx, 'name', e.target.value)} /></div>
                                                <div><label className="text-xs text-indigo-600 dark:text-indigo-300 font-bold uppercase mb-1 block">Role</label><input className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-indigo-500 outline-none" value={char.role} onChange={(e) => handleCharacterChange(idx, 'role', e.target.value)} /></div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div><label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Gender</label><select className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded px-2 py-1.5 text-slate-900 dark:text-white text-xs outline-none" value={char.gender} onChange={(e) => handleCharacterChange(idx, 'gender', e.target.value)}>{GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                                                <div><label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Age</label><input className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded px-2 py-1.5 text-slate-900 dark:text-white text-xs outline-none" value={char.age || ''} onChange={(e) => handleCharacterChange(idx, 'age', e.target.value)} placeholder="e.g. 20s"/></div>
                                                <div><label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Race</label><input className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded px-2 py-1.5 text-slate-900 dark:text-white text-xs outline-none" value={char.race || ''} onChange={(e) => handleCharacterChange(idx, 'race', e.target.value)} placeholder="Origin"/></div>
                                                <div><label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Body</label><input className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded px-2 py-1.5 text-slate-900 dark:text-white text-xs outline-none" value={char.bodyType || ''} onChange={(e) => handleCharacterChange(idx, 'bodyType', e.target.value)} placeholder="Slim"/></div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-indigo-600 dark:text-indigo-300 font-bold uppercase mb-1 block flex items-center gap-1"><SparklesIcon size={12}/> Visual Foundation</label>
                                                <textarea className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300 text-sm h-24 resize-none focus:border-indigo-500 outline-none leading-relaxed transition-colors" value={char.description} onChange={(e) => handleCharacterChange(idx, 'description', e.target.value)} placeholder="Visual profile..." />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-black/60 rounded-xl p-4 border border-slate-200 dark:border-zinc-800/50">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-500 flex items-center gap-2"><ShirtIcon size={14}/> Wardrobe ({char.outfits?.length || 0})</span>
                                            <button type="button" onClick={() => handleAddOutfit(idx)} className="text-xs bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-white px-3 py-1 rounded-full flex items-center gap-1 transition-colors border border-slate-300 dark:border-zinc-700"><PlusIcon size={12}/> Add Outfit</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(char.outfits || []).map((outfit, oIdx) => (
                                                <div key={outfit.id} className={`flex gap-4 p-4 rounded-xl bg-white dark:bg-zinc-950 border transition-all ${outfit.isDefault ? 'border-indigo-600 dark:border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-md' : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'}`}>
                                                    <div className="w-24 h-32 bg-slate-100 dark:bg-black rounded-lg flex-shrink-0 relative overflow-hidden group/outfit cursor-pointer border border-slate-200 dark:border-zinc-800" onClick={() => outfit.imageUrl && setZoomedImage(outfit.imageUrl)}>
                                                        {outfit.imageUrl ? <img src={outfit.imageUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><ShirtIcon size={24} className="text-slate-300 dark:text-zinc-800"/></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                                                        <div className="flex justify-between items-start">
                                                            <input className="bg-transparent text-sm font-bold text-slate-900 dark:text-white w-full border-none p-0 focus:ring-0 placeholder-slate-400 dark:placeholder-slate-600" value={outfit.name} onChange={(e) => {const u=[...characters]; if(u[idx].outfits) u[idx].outfits![oIdx].name=e.target.value; setCharacters(u)}} placeholder="Outfit Name"/>
                                                            <div className="flex gap-1 ml-1">
                                                                <button type="button" onClick={() => handleSetDefaultOutfit(idx, oIdx)} className={`p-1 rounded ${outfit.isDefault ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`} title="Set Default"><SparklesIcon size={14} fill={outfit.isDefault ? "currentColor" : "none"}/></button>
                                                                <button type="button" onClick={() => {const u=[...characters]; if(u[idx].outfits) u[idx].outfits = u[idx].outfits!.filter((_,i)=>i!==oIdx); setCharacters(u)}} className="p-1 text-slate-400 hover:text-red-500"><XIcon size={14}/></button>
                                                            </div>
                                                        </div>
                                                        <textarea className="bg-slate-50 dark:bg-black text-xs text-slate-600 dark:text-slate-400 w-full border border-slate-200 dark:border-zinc-800 rounded p-2 focus:border-indigo-500 outline-none resize-none h-16 leading-tight placeholder-slate-400 dark:placeholder-slate-600" value={outfit.description} onChange={(e) => {const u=[...characters]; if(u[idx].outfits) u[idx].outfits![oIdx].description=e.target.value; setCharacters(u)}} placeholder="Details..."/>
                                                        <div className="mt-auto flex gap-2">
                                                            <button type="button" onClick={(e) => {e.stopPropagation(); handleGenerateOutfit(idx, oIdx)}} disabled={generatingOutfitIdx !== null} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors">
                                                                {generatingOutfitIdx?.cIdx===idx && generatingOutfitIdx?.oIdx===oIdx ? <Loader2Icon size={12} className="animate-spin"/> : <RefreshCwIcon size={12}/>} Generate
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
                <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-zinc-800">
                    <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-4 py-2 transition-colors"><ArrowLeftIcon size={18} /> Back</button>
                    <div className="flex gap-3">
                        {isEditingWorld ? (
                            <button type="button" onClick={handleSaveWorldEdit} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"><SaveIcon size={18} /> Save World Changes</button>
                        ) : (
                            <button type="button" onClick={handleProceedClick} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg">Next: Narrative Architecture <ArrowRightIcon size={18} /></button>
                        )}
                    </div>
                </div>
            </>
        )}

        {subStep === 'DETAILS' && !isEditingWorld && (
            <section className="animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 mb-4 ring-1 ring-indigo-500/50">
                        <LayersIcon size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Narrative Architecture</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto">AI suggestions provided based on your concept. Refine them to guide the generation.</p>
                </div>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><MonitorIcon size={20} className="text-indigo-600 dark:text-indigo-400"/> Technical Specs</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-2">Aspect Ratio</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ASPECT_RATIOS.map(ratio => (
                                            <button key={ratio.id} type="button" onClick={() => setSelectedRatio(ratio.id)} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedRatio === ratio.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-50 dark:bg-black border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-slate-900 dark:hover:border-zinc-600'}`}>{ratio.icon}<span className="text-xs font-bold">{ratio.label}</span></button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-black rounded-xl border border-slate-200 dark:border-zinc-800"><div className="text-xs text-slate-500 uppercase font-bold mb-1">Visual Style</div><div className="text-sm text-slate-900 dark:text-white font-medium flex items-center gap-2"><PaletteIcon size={14} className="text-pink-600 dark:text-pink-400"/> {selectedVisualStyle}</div></div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {(questions || []).slice(0, 3).map((q, idx) => (
                                <div key={q.id} className="relative group"><div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-white dark:bg-black border border-indigo-600 dark:border-indigo-500 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shadow-md z-10">{idx + 1}</div><div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors shadow-sm"><label className="block text-sm font-bold text-indigo-800 dark:text-indigo-100 mb-2 pl-4">{q.question}</label><div className="relative"><textarea className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none h-24 resize-none transition-colors" value={answers[q.id] || ''} onChange={(e) => handleInputChange(q.id, e.target.value)} /><button type="button" onClick={() => handleRegenerateSuggestion(q)} className="absolute bottom-3 right-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">{regeneratingId === q.id ? <Loader2Icon className="animate-spin" size={16}/> : <RefreshCwIcon size={16}/>}</button></div></div></div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-200 dark:border-zinc-800">
                    <button type="button" onClick={() => setSubStep('ASSETS')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-4 py-2 transition-colors"><ArrowLeftIcon size={18} /> Back to Assets</button>
                    <button type="submit" disabled={isLoading} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transform hover:scale-[1.02] transition-all">{isLoading ? <Loader2Icon className="animate-spin" size={20} /> : <BoxIcon size={20} />}Generate Storyboard</button>
                </div>
            </section>
        )}
      </form>
    </div>
  );
};

export default Step2Questions;