// Fixed missing imports for MapPinIcon and UsersIcon from lucide-react
import React, { useState, useRef, useEffect } from 'react';
import { ProductionScript, User, Scene, Character, LocationSetting } from '../types';
import { 
    FileTextIcon, ImageIcon, DownloadIcon, RefreshCwIcon, Loader2Icon, 
    SaveIcon, Edit3Icon, Trash2Icon, PlusIcon, GridIcon, 
    CheckSquareIcon, SquareIcon, XIcon, CheckIcon, ZapIcon, FileDownIcon, SparklesIcon, PlayIcon,
    MapPinIcon, UsersIcon
} from 'lucide-react';
import { generateStoryboardImage } from '../services/geminiService';
import { updateProject, saveProject } from '../services/storageService';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import JSZip from 'jszip';

interface Props {
  script: ProductionScript;
  user: User | null;
  projectId?: string;
}

const ProductionBoard: React.FC<Props> = ({ script: initialScript, user, projectId: initialProjectId }) => {
  const [script, setScript] = useState<ProductionScript>(initialScript);
  const [activeTab, setActiveTab] = useState<'SCRIPT' | 'STORYBOARD'>('STORYBOARD');
  const [scenes, setScenes] = useState<Scene[]>(initialScript?.scenes || []);
  const [title, setTitle] = useState(initialScript?.title || "Untitled Project");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Scene | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState<Record<number, boolean>>({});
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const storyboardRef = useRef<HTMLDivElement>(null);

  const toggleSelect = (idx: number) => {
      const n = new Set(selectedIndices);
      if (n.has(idx)) n.delete(idx); else n.add(idx);
      setSelectedIndices(n);
  };

  const handleSelectAll = () => {
      if (selectedIndices.size === (scenes?.length || 0)) setSelectedIndices(new Set());
      else setSelectedIndices(new Set((scenes || []).map((_, i) => i)));
  };

  const handleDownloadZip = async () => {
      const toDownload = scenes.filter((_, i) => selectedIndices.size > 0 ? selectedIndices.has(i) : true).filter(s => s.generatedImageUrl);
      if (toDownload.length === 0) return alert("다운로드할 생성된 이미지가 없습니다.");
      
      const zip = new JSZip();
      toDownload.forEach(s => {
          const data = s.generatedImageUrl!.split(',')[1];
          zip.file(`Scene_${s.sceneNumber}.png`, data, {base64: true});
      });
      const blob = await zip.generateAsync({type:"blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title}_images.zip`;
      link.click();
  };

  const handleExportPDF = async () => {
      if (!storyboardRef.current) return;
      const doc = new jsPDF('p', 'mm', 'a4');
      const cards = document.querySelectorAll('.scene-card-export');
      for (let i = 0; i < cards.length; i++) {
          const canvas = await html2canvas(cards[i] as HTMLElement, { scale: 1.5, backgroundColor: '#000000' });
          const imgData = canvas.toDataURL('image/png');
          if (i > 0) doc.addPage();
          doc.addImage(imgData, 'PNG', 10, 10, 190, 0);
      }
      doc.save(`${title}_storyboard.pdf`);
  };

  const handleExportDOC = () => {
      const content = `
        <html><head><style>
          body { font-family: 'Courier New', monospace; line-height: 1.2; padding: 50px; }
          .slugline { font-weight: bold; text-transform: uppercase; margin-top: 25px; border-bottom: 1px solid #000; }
          .action { margin-bottom: 15px; margin-top: 10px; }
          .char { text-align: center; width: 50%; margin: 15px auto 0; font-weight: bold; }
          .dial { text-align: center; width: 60%; margin: 0 auto 15px; font-style: italic; }
          h1 { text-align: center; text-transform: uppercase; text-decoration: underline; }
        </style></head><body>
        <h1>${title}</h1><br/>
        ${(scenes || []).map(s => `
          <div class="slugline">SCENE ${s.sceneNumber}: INT. ${s.location.toUpperCase()} - ${s.time.toUpperCase()}</div>
          <div class="action">${s.actionDescription}</div>
          ${(s.dialogue || []).map(d => `<div class="char">${d.speaker.toUpperCase()}</div><div class="dial">"${d.line}"</div>`).join('')}
        `).join('')}
        </body></html>`;
      const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title}_screenplay.doc`;
      link.click();
  };

  const handleSave = async () => {
      if (!user) return alert("로그인 필요");
      setIsSaving(true);
      try {
          const payload = { ...script, title, scenes };
          if (initialProjectId) await updateProject(initialProjectId, payload);
          else await saveProject(user.email, payload);
          alert("저장 완료");
      } catch (e) { alert("저장 실패"); } finally { setIsSaving(false); }
  };

  const getFullContextForScene = (scene: Scene) => {
      const charNames = Array.from(new Set((scene.dialogue || []).map(d => d.speaker)));
      const relevantChars = script.characters.filter(c => charNames.includes(c.name));
      const charContext = relevantChars.map(c => `${c.name}: ${c.description}`).join('. ');
      
      const relevantLoc = script.locations?.find(l => l.name === scene.location);
      const locContext = relevantLoc ? `Location (${relevantLoc.name}): ${relevantLoc.description}` : "";
      
      return `${charContext} ${locContext}`.trim();
  };

  const handleGenImg = async (idx: number) => {
      const scene = scenes[idx];
      if (!scene) return;
      setIsGenerating(p => ({...p, [idx]: true}));
      try {
          const context = getFullContextForScene(scene);
          const url = await generateStoryboardImage(scene.visualPrompt || scene.actionDescription, script.selectedVisualStyle, context, script.aspectRatio);
          setScenes(p => { const u=[...p]; u[idx].generatedImageUrl=url; return u; });
      } catch (e: any) { 
          alert(`장면 ${scene.sceneNumber} 생성 실패: ${e.message}`); 
      } finally { 
          setIsGenerating(p => ({...p, [idx]: false})); 
      }
  };

  const handleVisualizeAll = async () => {
      if (bulkGenerating) return;
      const confirmMsg = "이미지가 없는 모든 장면을 생성하시겠습니까? (API 할당량에 따라 시간이 걸릴 수 있습니다.)";
      if (!confirm(confirmMsg)) return;

      setBulkGenerating(true);
      const updatedScenes = [...scenes];
      for (let i = 0; i < updatedScenes.length; i++) {
          if (!updatedScenes[i].generatedImageUrl) {
              setIsGenerating(p => ({...p, [i]: true}));
              try {
                  const context = getFullContextForScene(updatedScenes[i]);
                  const url = await generateStoryboardImage(updatedScenes[i].visualPrompt || updatedScenes[i].actionDescription, script.selectedVisualStyle, context, script.aspectRatio);
                  updatedScenes[i].generatedImageUrl = url;
                  setScenes([...updatedScenes]);
                  await new Promise(r => setTimeout(r, 6000)); // Rate limit buffer
              } catch (e) {
                  console.error(`Failed at scene ${i}`, e);
                  break;
              } finally {
                  setIsGenerating(p => ({...p, [i]: false}));
              }
          }
      }
      setBulkGenerating(false);
  };

  return (
    <div className="w-full bg-black min-h-screen pb-40">
        {zoomedImage && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="max-w-full max-h-full rounded-xl shadow-2xl border border-zinc-800" /></div>}
        
        <div className="sticky top-24 z-30 mx-auto max-w-7xl px-4 mb-8">
            <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-2xl border-zinc-800/50">
                <div className="flex bg-zinc-900 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('STORYBOARD')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'STORYBOARD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><GridIcon size={18}/> Storyboard</button>
                    <button onClick={() => setActiveTab('SCRIPT')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'SCRIPT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><FileTextIcon size={18}/> Screenplay</button>
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={handleVisualizeAll} disabled={bulkGenerating} className="text-xs font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                        {bulkGenerating ? <Loader2Icon size={14} className="animate-spin"/> : <SparklesIcon size={14}/>} Visualize All
                    </button>
                    <div className="h-6 w-px bg-zinc-800 mx-1"></div>
                    <button onClick={handleSelectAll} className="text-xs text-slate-500 hover:text-white px-3 py-2 border border-zinc-800 rounded-lg">{selectedIndices.size === (scenes?.length || 0) ? 'Deselect All' : 'Select All'}</button>
                    <button onClick={handleDownloadZip} title="Download Images ZIP" className="p-2 bg-zinc-900 text-emerald-400 rounded-lg hover:bg-emerald-950 transition-colors"><DownloadIcon size={20}/></button>
                    <button onClick={handleExportPDF} title="Export PDF Storyboard" className="p-2 bg-zinc-900 text-indigo-400 rounded-lg hover:bg-indigo-950 transition-colors"><FileDownIcon size={20}/></button>
                    <button onClick={handleExportDOC} title="Export Screenplay DOC" className="p-2 bg-zinc-900 text-blue-400 rounded-lg hover:bg-blue-950 transition-colors"><FileTextIcon size={20}/></button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg transition-all">{isSaving ? <Loader2Icon className="animate-spin" size={16}/> : <SaveIcon size={16}/>} Save</button>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
            {activeTab === 'SCRIPT' ? (
                <div className="bg-[#fcfcfc] text-[#1a1a1a] p-12 md:p-20 shadow-2xl font-mono max-w-[850px] mx-auto min-h-[1100px] script-paper rounded-sm border border-gray-300 relative">
                    <div className="text-center mb-16 uppercase">
                        <h1 className="text-3xl font-bold tracking-widest mb-2">{title}</h1>
                        <p className="text-xs border-t border-gray-200 pt-2">Original Screenplay</p>
                    </div>
                    
                    {(scenes || []).map((s, i) => (
                        <div key={i} className="mb-12 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="font-bold uppercase mb-4 text-sm border-b border-gray-200 pb-1 flex justify-between">
                                <span>SCENE {s.sceneNumber}: INT. {s.location} - {s.time}</span>
                            </div>
                            <div className="mb-6 text-[13px] leading-relaxed tracking-tight">{s.actionDescription}</div>
                            {(s.dialogue || []).map((d, dx) => (
                                <div key={dx} className="mb-4 max-w-[70%] mx-auto text-center">
                                    <div className="uppercase font-bold text-xs mb-1 tracking-wider">{d.speaker}</div>
                                    <div className="text-[13px] italic leading-snug">"{d.line}"</div>
                                </div>
                            ))}
                        </div>
                    ))}
                    
                    <div className="absolute bottom-10 left-0 right-0 text-center text-[10px] text-gray-400 uppercase tracking-widest opacity-50">
                        Generated by CineGen AI Professional
                    </div>
                </div>
            ) : (
                <div ref={storyboardRef} className="space-y-12">
                    {(scenes || []).map((scene, index) => {
                        const isEditing = editingSceneIdx === index;
                        const data = isEditing && editForm ? editForm : scene;
                        const isSelected = selectedIndices.has(index);
                        const sceneCharacters = Array.from(new Set((scene.dialogue || []).map(d => d.speaker)));

                        return (
                            <div key={index} className={`scene-card-export relative rounded-3xl overflow-hidden border transition-all duration-300 ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-zinc-900 hover:border-zinc-800 shadow-xl'}`}>
                                <div className="absolute top-4 left-4 z-20">
                                    <button onClick={() => toggleSelect(index)} className={`p-1.5 rounded-lg border transition-all ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'}`}>
                                        {isSelected ? <CheckSquareIcon size={20}/> : <SquareIcon size={20}/>}
                                    </button>
                                </div>
                                <div className="flex flex-col lg:flex-row h-auto lg:min-h-[550px] bg-zinc-950/60">
                                    <div className="w-full lg:w-3/5 bg-black relative flex items-center justify-center group/img min-h-[350px]">
                                        {data.generatedImageUrl ? (
                                            <>
                                                <img src={data.generatedImageUrl} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover/img:scale-[1.01]" onClick={() => setZoomedImage(data.generatedImageUrl!)}/>
                                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-all duration-300">
                                                    <button onClick={() => handleGenImg(index)} title="Regenerate Frame" className="p-3 bg-black/80 hover:bg-indigo-600 text-white rounded-xl backdrop-blur-md shadow-xl border border-white/10"><RefreshCwIcon size={18}/></button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-800 animate-pulse">
                                                    <ImageIcon size={40}/>
                                                </div>
                                                <button onClick={() => handleGenImg(index)} disabled={isGenerating[index]} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center gap-3 shadow-2xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50">
                                                    {isGenerating[index] ? <Loader2Icon className="animate-spin" size={24}/> : <ZapIcon size={24}/>} 
                                                    {isGenerating[index] ? 'Synthesizing...' : 'Visualize Shot'}
                                                </button>
                                            </div>
                                        )}
                                        <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/60 rounded text-[10px] text-white/50 font-mono tracking-tighter uppercase border border-white/5">Ratio: {script.aspectRatio}</div>
                                    </div>
                                    <div className="w-full lg:w-2/5 p-8 flex flex-col bg-zinc-950">
                                        <div className="flex justify-between items-center mb-8">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black px-3 py-1.5 bg-indigo-600 rounded-lg text-white shadow-lg">SCENE {scene.sceneNumber}</span>
                                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{scene.time}</span>
                                            </div>
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => {const u=[...scenes]; u[index]=editForm!; setScenes(u); setEditingSceneIdx(null);}} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"><CheckIcon size={16}/></button>
                                                    <button onClick={() => setEditingSceneIdx(null)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"><XIcon size={16}/></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => {setEditingSceneIdx(index); setEditForm({...scene});}} className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-900 rounded-lg transition-all" title="Edit Scene Details"><Edit3Icon size={18}/></button>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-8 flex-1">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <PlayIcon size={12} className="text-indigo-400"/>
                                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Narrative Action</h4>
                                                </div>
                                                <p className="text-slate-300 text-sm leading-relaxed">{data.actionDescription}</p>
                                            </div>

                                            {data.dialogue && data.dialogue.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <FileTextIcon size={12} className="text-emerald-400"/>
                                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Key Dialogue</h4>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {(data.dialogue || []).map((d, dx) => (
                                                            <div key={dx} className="bg-black p-4 rounded-2xl border border-zinc-900 group/dial hover:border-zinc-800 transition-colors">
                                                                <div className="text-[10px] font-black text-indigo-400 mb-1.5 uppercase tracking-tighter flex items-center justify-between">
                                                                    {d.speaker}
                                                                    <div className="w-1 h-1 rounded-full bg-indigo-500/50"></div>
                                                                </div>
                                                                <div className="text-sm text-slate-400 leading-snug">"{d.line}"</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-zinc-900">
                                            <div className="text-[10px] font-bold text-zinc-600 uppercase mb-3 tracking-widest">On-Screen Assets</div>
                                            <div className="flex flex-wrap gap-2">
                                                <div className="px-3 py-1.5 bg-black border border-zinc-900 rounded-lg text-[10px] text-zinc-500 flex items-center gap-2">
                                                    <MapPinIcon size={10} className="text-emerald-500"/> {scene.location}
                                                </div>
                                                {sceneCharacters.map(name => (
                                                    <div key={name} className="px-3 py-1.5 bg-black border border-zinc-900 rounded-lg text-[10px] text-zinc-500 flex items-center gap-2">
                                                        <UsersIcon size={10} className="text-indigo-400"/> {name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default ProductionBoard;