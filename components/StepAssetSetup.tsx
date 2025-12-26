
import React, { useState } from 'react';
import { Character, LocationSetting, StoryConcept } from '../types';
import { 
    ArrowRightIcon, ArrowLeftIcon, Loader2Icon, 
    UsersIcon, UploadIcon, PlusIcon, Trash2Icon, XIcon, MapPinIcon, 
    SparklesIcon, GlobeIcon, SaveIcon
} from 'lucide-react';
import { generateCharacterPortrait, generateLocationImage } from '../services/geminiService';
import { saveWorldSetting, getCurrentUser } from '../services/storageService';

interface Props {
  initialCharacters: Character[];
  initialLocations: LocationSetting[];
  onNext: (characters: Character[], locations: LocationSetting[]) => void;
  onBack: () => void;
  selectedConcept?: StoryConcept;
  language?: string;
  selectedVisualStyle: string;
  isEditingWorld?: boolean;
}

const StepAssetSetup: React.FC<Props> = ({ 
    initialCharacters, initialLocations, onNext, onBack, 
    selectedConcept, selectedVisualStyle, isEditingWorld 
}) => {
    const [characters, setCharacters] = useState<Character[]>(initialCharacters || []);
    const [locations, setLocations] = useState<LocationSetting[]>(initialLocations || []);
    const [isSavingWorld, setIsSavingWorld] = useState(false);
    const [generatingIdx, setGeneratingIdx] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const handleFileUpload = (idx: number, type: 'char' | 'loc', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                const data = reader.result as string;
                if (type === 'char') {
                    const u = [...characters]; u[idx].avatarUrl = data; setCharacters(u);
                } else {
                    const u = [...locations]; u[idx].imageUrl = data; setLocations(u);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenChar = async (idx: number) => {
        const char = characters[idx];
        setGeneratingIdx(`char-${idx}`);
        try {
            const url = await generateCharacterPortrait(char.name, char.gender, char.description, selectedVisualStyle, {}, char.avatarUrl);
            const u = [...characters]; u[idx].avatarUrl = url; setCharacters(u);
        } catch (e) { alert("생성 실패"); } finally { setGeneratingIdx(null); }
    };

    const handleGenLoc = async (idx: number) => {
        const loc = locations[idx];
        setGeneratingIdx(`loc-${idx}`);
        try {
            const url = await generateLocationImage(loc.name, loc.description, selectedVisualStyle, loc.imageUrl);
            const u = [...locations]; u[idx].imageUrl = url; setLocations(u);
        } catch (e) { alert("생성 실패"); } finally { setGeneratingIdx(null); }
    };

    const handleSaveWorld = async () => {
        const user = getCurrentUser();
        if (!user) return alert("로그인이 필요합니다.");
        setIsSavingWorld(true);
        try {
            await saveWorldSetting(user.email, {
                title: selectedConcept?.title || "New World",
                script: { genre: selectedConcept?.genre || "General", selectedVisualStyle, characters, locations }
            });
            alert("세계관 라이브러리에 저장되었습니다!");
        } catch (e) { alert("저장 실패"); } finally { setIsSavingWorld(false); }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
            {zoomedImage && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="max-w-full max-h-full rounded shadow-2xl" /></div>}

            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black mb-2">{isEditingWorld ? 'Edit Assets' : 'Phase 1: Asset Setup'}</h2>
                    <p className="text-slate-400">Define characters and locations. Generate or upload your own images.</p>
                </div>
                <button onClick={handleSaveWorld} disabled={isSavingWorld} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all">
                    {isSavingWorld ? <Loader2Icon className="animate-spin" size={20}/> : <GlobeIcon size={20}/>} 세계관 저장 (Save World)
                </button>
            </div>

            <div className="space-y-12">
                <section>
                    <div className="flex items-center justify-between mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-3"><UsersIcon className="text-indigo-400" size={24} /><h3 className="text-2xl font-bold">Characters</h3></div>
                        <button onClick={() => setCharacters([...characters, { name: "New Char", gender: "Neutral", role: "Role", description: "" }])} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"><PlusIcon size={18}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {characters.map((char, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex gap-6 relative group">
                                <button onClick={() => setCharacters(characters.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400"><Trash2Icon size={18}/></button>
                                <div className="w-32 h-32 shrink-0 bg-slate-800 rounded-xl overflow-hidden relative cursor-zoom-in group/img" onClick={() => char.avatarUrl && setZoomedImage(char.avatarUrl)}>
                                    {char.avatarUrl ? <img src={char.avatarUrl} className="w-full h-full object-cover"/> : <UsersIcon size={40} className="text-slate-600 absolute inset-0 m-auto"/>}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleGenChar(idx)} className="bg-indigo-600 text-[10px] text-white px-2 py-1 rounded font-bold">{generatingIdx === `char-${idx}` ? '...' : 'Generate'}</button>
                                        <label className="bg-slate-700 text-[10px] text-white px-2 py-1 rounded font-bold cursor-pointer">Upload <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(idx, 'char', e)}/></label>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <input className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={char.name} onChange={(e) => {const u=[...characters]; u[idx].name=e.target.value; setCharacters(u)}} placeholder="Name"/>
                                    <input className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={char.role} onChange={(e) => {const u=[...characters]; u[idx].role=e.target.value; setCharacters(u)}} placeholder="Role"/>
                                    <textarea className="col-span-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white h-16 text-sm" value={char.description} onChange={(e) => {const u=[...characters]; u[idx].description=e.target.value; setCharacters(u)}} placeholder="Description..."/>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-3"><MapPinIcon className="text-emerald-400" size={24} /><h3 className="text-2xl font-bold">Locations</h3></div>
                        <button onClick={() => setLocations([...locations, { name: "New Location", description: "" }])} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"><PlusIcon size={18}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {locations.map((loc, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 relative group">
                                <button onClick={() => setLocations(locations.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400"><Trash2Icon size={18}/></button>
                                <div className="h-40 bg-slate-800 rounded-xl mb-4 relative overflow-hidden group/img cursor-zoom-in" onClick={() => loc.imageUrl && setZoomedImage(loc.imageUrl)}>
                                    {loc.imageUrl ? <img src={loc.imageUrl} className="w-full h-full object-cover"/> : <MapPinIcon size={40} className="text-slate-600 absolute inset-0 m-auto"/>}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-2 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleGenLoc(idx)} className="bg-emerald-600 text-xs text-white px-3 py-1.5 rounded font-bold">{generatingIdx === `loc-${idx}` ? '...' : 'Generate'}</button>
                                        <label className="bg-slate-700 text-xs text-white px-3 py-1.5 rounded font-bold cursor-pointer">Upload <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(idx, 'loc', e)}/></label>
                                    </div>
                                </div>
                                <input className="w-full bg-transparent border-b border-slate-700 text-white font-bold mb-2 outline-none" value={loc.name} onChange={(e) => {const u=[...locations]; u[idx].name=e.target.value; setLocations(u)}} placeholder="Location Name"/>
                                <textarea className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs h-16" value={loc.description} onChange={(e) => {const u=[...locations]; u[idx].description=e.target.value; setLocations(u)}} placeholder="Description..."/>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="pt-10 flex justify-between border-t border-slate-800">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white px-6 py-2 transition-all"><ArrowLeftIcon size={20}/> Back</button>
                    <button onClick={() => onNext(characters, locations)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-indigo-900/20 transform hover:scale-[1.02] transition-all">Next Step <ArrowRightIcon size={20}/></button>
                </div>
            </div>
        </div>
    );
};

export default StepAssetSetup;
