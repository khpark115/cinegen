import React, { useEffect, useState, useRef } from 'react';
import { User, Project, Scene, WorldSetting, Character, LocationSetting, Gender } from '../types';
import { getUserProjects, deleteProject, updateUserProfile, updateProject, saveProject, saveWorldSetting, getUserWorlds, deleteWorldSetting } from '../services/storageService';
import { CalendarIcon, ChevronRightIcon, PlayCircleIcon, ImageIcon, FilmIcon, Trash2Icon, SettingsIcon, UserIcon, LockIcon, SaveIcon, Edit2Icon, DownloadIcon, UploadIcon, EyeIcon, XIcon, GridIcon, LayoutListIcon, GlobeIcon, BookOpenIcon, SparklesIcon, PlusCircleIcon, UsersIcon, PlusIcon, MapPinIcon } from 'lucide-react';

interface Props {
  user: User;
  onSelectProject: (project: Project) => void;
  onStartFromWorld?: (world: WorldSetting) => void;
  onEditWorld?: (world: WorldSetting) => void;
  onClose: () => void;
}

const GENDERS: Gender[] = ['Male', 'Female', 'Neutral', 'Non-Binary'];

const MyPage: React.FC<Props> = ({ user: initialUser, onSelectProject, onStartFromWorld, onEditWorld, onClose }) => {
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'WORLDS' | 'PROFILE'>('PROJECTS');
  const [user, setUser] = useState<User>(initialUser);
  const [projects, setProjects] = useState<Project[]>([]);
  const [worlds, setWorlds] = useState<WorldSetting[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingWorlds, setIsLoadingWorlds] = useState(false);
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedAssetProject, setSelectedAssetProject] = useState<Project | null>(null);
  const [assetTab, setAssetTab] = useState<'SCRIPT' | 'IMAGES' | 'VIDEOS'>('SCRIPT');

  // Create New World State
  const [isCreatingWorld, setIsCreatingWorld] = useState(false);
  const [newWorldTitle, setNewWorldTitle] = useState("");
  const [newWorldGenre, setNewWorldGenre] = useState("Fantasy");
  const [newWorldStyle, setNewWorldStyle] = useState("Cinematic");
  const [newWorldChars, setNewWorldChars] = useState<Character[]>([]);
  const [newWorldLocs, setNewWorldLocs] = useState<LocationSetting[]>([]);

  // Save Existing Project as World State
  const [saveWorldModalProject, setSaveWorldModalProject] = useState<Project | null>(null);
  const [saveWorldName, setSaveWorldName] = useState("");
  const [saveWorldDesc, setSaveWorldDesc] = useState("");

  const [name, setName] = useState(user.name);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProjects = async () => {
        setIsLoadingProjects(true);
        try {
            const data = await getUserProjects(user.email);
            setProjects(data);
        } catch (e) {
            console.error("Failed to load projects", e);
        } finally {
            setIsLoadingProjects(false);
        }
    };
    loadProjects();
  }, [user.email]);

  useEffect(() => {
    if (activeTab === 'WORLDS') {
        const loadWorlds = async () => {
            setIsLoadingWorlds(true);
            try {
                const data = await getUserWorlds(user.email);
                setWorlds(data);
            } catch (e) {
                console.error("Failed to load worlds", e);
            } finally {
                setIsLoadingWorlds(false);
            }
        };
        loadWorlds();
    }
  }, [activeTab, user.email, isCreatingWorld, saveWorldModalProject]);

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
          await deleteProject(projectId);
          setProjects(prev => prev.filter(p => p.id !== projectId));
      }
  };

  const openSaveWorldModal = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setSaveWorldModalProject(project);
      setSaveWorldName(`${project.title} (World)`);
      setSaveWorldDesc(`A world based on ${project.title}.`);
  };

  const handleConfirmSaveWorld = async () => {
      if (!saveWorldModalProject || !saveWorldName.trim()) return;
      const worldProjectMock = {
          ...saveWorldModalProject,
          title: saveWorldName,
          script: {
              ...saveWorldModalProject.script,
              synopsis: saveWorldDesc
          }
      };
      try {
          const newWorld = await saveWorldSetting(user.email, worldProjectMock);
          alert("World Saved Successfully! Check the 'Worlds' tab.");
          if (activeTab === 'WORLDS') setWorlds(prev => [newWorld, ...prev]);
          setSaveWorldModalProject(null);
      } catch(e) {
          alert("Failed to save world.");
      }
  };

  const handleDeleteWorld = async (e: React.MouseEvent, worldId: string) => {
      e.stopPropagation();
      if (confirm("Delete this World Setting?")) {
          await deleteWorldSetting(worldId);
          setWorlds(prev => prev.filter(w => w.id !== worldId));
      }
  };

  const startRenaming = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setEditingProjectId(project.id);
      setEditTitle(project.title);
  };

  const saveRenaming = async (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      if (!editTitle.trim()) return;
      const updatedScript = { ...project.script, title: editTitle };
      await updateProject(project.id, updatedScript);
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, title: editTitle, script: updatedScript } : p));
      setEditingProjectId(null);
  };
  
  const cancelRenaming = (e: React.MouseEvent) => { e.stopPropagation(); setEditingProjectId(null); };

  const handleExportJSON = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project.script));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", (project.title || "project") + ".json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };
  
  const triggerImportJSON = () => fileInputRef.current?.click();
  
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              const newProj = await saveProject(user.email, json);
              setProjects(prev => [newProj, ...prev]);
              alert("Project imported successfully!");
          } catch (err) { alert("Failed to parse project file."); }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenAssets = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setSelectedAssetProject(project);
      setAssetTab('SCRIPT');
  };

  const handleDeleteAsset = async (sceneIndex: number, type: 'image' | 'video') => {
      if (!selectedAssetProject) return;
      if (!confirm("Are you sure?")) return;
      const updatedScenes = [...selectedAssetProject.script.scenes];
      if (type === 'image') updatedScenes[sceneIndex].generatedImageUrl = undefined;
      else updatedScenes[sceneIndex].generatedVideoUrl = undefined;
      const updatedScript = { ...selectedAssetProject.script, scenes: updatedScenes };
      await updateProject(selectedAssetProject.id, updatedScript);
      setSelectedAssetProject({ ...selectedAssetProject, script: updatedScript });
      setProjects(prev => prev.map(p => p.id === selectedAssetProject.id ? { ...p, script: updatedScript } : p));
      setEditingProjectId(null);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);
      if (newPassword && newPassword !== confirmPassword) { setMessage({ text: "Passwords mismatch.", type: 'error' }); return; }
      const updates: { name?: string, password?: string } = {};
      if (name !== user.name) updates.name = name;
      if (newPassword) updates.password = newPassword;
      if (Object.keys(updates).length === 0) return; 

      const updatedUser = updateUserProfile(user.email, updates);
      if (updatedUser) { setUser(updatedUser); setMessage({ text: "Profile updated.", type: 'success' }); setNewPassword(''); setConfirmPassword(''); }
      else { setMessage({ text: "Update failed.", type: 'error' }); }
  };

  const handleAddNewChar = () => setNewWorldChars([...newWorldChars, { name: "New Char", gender: "Neutral", role: "Role", description: "Desc" }]);
  const handleAddNewLoc = () => setNewWorldLocs([...newWorldLocs, { name: "New Loc", description: "Desc" }]);
  
  const handleCharUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) { const u=[...newWorldChars]; u[idx].avatarUrl=reader.result as string; setNewWorldChars(u); }};
      reader.readAsDataURL(file);
  };
  const handleLocUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) { const u=[...newWorldLocs]; u[idx].imageUrl=reader.result as string; setNewWorldLocs(u); }};
      reader.readAsDataURL(file);
  };

  const handleSubmitNewWorld = async () => {
      if (!newWorldTitle) { alert("Title required"); return; }
      const mockProject: any = {
          title: newWorldTitle,
          script: { genre: newWorldGenre, selectedVisualStyle: newWorldStyle, characters: newWorldChars, locations: newWorldLocs }
      };
      await saveWorldSetting(user.email, mockProject);
      setIsCreatingWorld(false);
      setNewWorldChars([]); setNewWorldLocs([]); setNewWorldTitle("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-black w-full max-w-6xl h-[90vh] rounded-2xl border border-zinc-800 flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">My Studio</h1>
                    <p className="text-sm text-zinc-500">{user.email}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">
                <XIcon size={24} />
            </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b border-zinc-900 px-6 bg-black shrink-0 justify-between items-center">
            <div className="flex gap-6">
                <button onClick={() => setActiveTab('PROJECTS')} className={`pb-4 pt-4 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'PROJECTS' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500 hover:text-white'}`}><FilmIcon size={18} /> My Projects</button>
                <button onClick={() => setActiveTab('WORLDS')} className={`pb-4 pt-4 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'WORLDS' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-500 hover:text-white'}`}><GlobeIcon size={18} /> Worlds</button>
                <button onClick={() => setActiveTab('PROFILE')} className={`pb-4 pt-4 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'PROFILE' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500 hover:text-white'}`}><SettingsIcon size={18} /> Profile</button>
            </div>
            {activeTab === 'PROJECTS' && (<div><input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportJSON} /><button onClick={triggerImportJSON} className="text-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2"><UploadIcon size={14} /> Import Project</button></div>)}
            {activeTab === 'WORLDS' && (<button onClick={() => setIsCreatingWorld(true)} className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg border border-emerald-500 flex items-center gap-2"><PlusIcon size={14} /> Create New World</button>)}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-black relative">
            {activeTab === 'PROJECTS' && (
                <div>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 pb-2 text-white">All Projects ({projects.length})</h2>
                    {isLoadingProjects ? <div className="text-center text-zinc-600 py-20">Loading Library...</div> : 
                    projects.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed"><FilmIcon size={48} className="mx-auto text-zinc-700 mb-4" /><h3 className="text-xl font-bold text-zinc-600">No projects yet</h3></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => {
                            const scenes = project.script.scenes || [];
                            const imageCount = scenes.filter(s => s.generatedImageUrl).length;
                            const videoCount = scenes.filter(s => s.generatedVideoUrl).length;
                            const thumbnail = scenes.find(s => s.generatedImageUrl)?.generatedImageUrl;
                            const isRenaming = editingProjectId === project.id;
                            return (
                                <div key={project.id} onClick={() => onSelectProject(project)} className="group bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden hover:border-indigo-500 transition-all hover:shadow-xl cursor-pointer relative">
                                    <div className="h-40 bg-black relative overflow-hidden">
                                        {thumbnail ? <img src={thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-900"><FilmIcon size={32} className="text-zinc-800" /></div>}
                                        <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] text-white/50 font-mono border border-white/5 uppercase tracking-tighter">{project.script.aspectRatio || "16:9"}</div>
                                    </div>
                                    <div className="p-5 relative">
                                        {isRenaming ? (
                                            <div className="mb-2 flex gap-1" onClick={e => e.stopPropagation()}><input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-black border border-indigo-500 rounded px-2 py-1 text-sm text-white w-full outline-none" autoFocus /><button onClick={e => saveRenaming(e, project)} className="p-1 bg-green-600 rounded text-white"><SaveIcon size={14}/></button><button onClick={cancelRenaming} className="p-1 bg-zinc-800 rounded text-white"><SettingsIcon size={14} className="rotate-45"/></button></div>
                                        ) : (
                                            <div className="flex justify-between items-start mb-1 group/title"><h3 className="text-lg font-bold text-white truncate pr-2">{project.title}</h3><button onClick={(e) => startRenaming(e, project)} className="text-zinc-600 hover:text-indigo-400 opacity-0 group-hover/title:opacity-100 transition-opacity" title="Rename"><Edit2Icon size={14} /></button></div>
                                        )}
                                        <p className="text-xs text-zinc-600 mb-4 flex items-center gap-1"><CalendarIcon size={12} />{new Date(project.createdAt).toLocaleDateString()}</p>
                                        <div className="flex gap-4 text-sm text-zinc-500 mb-4">
                                            <div className="flex items-center gap-1"><ImageIcon size={14} className={imageCount > 0 ? "text-indigo-500" : ""} /><span>{imageCount} Imgs</span></div>
                                            <div className="flex items-center gap-1"><PlayCircleIcon size={14} className={videoCount > 0 ? "text-purple-500" : ""} /><span>{videoCount} Vids</span></div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button onClick={(e) => handleOpenAssets(e, project)} className="flex-1 py-2 rounded bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-indigo-400/80 flex items-center justify-center gap-2 mb-2 transition-colors border border-zinc-800"><GridIcon size={14} /> Assets</button>
                                            <button onClick={(e) => openSaveWorldModal(e, project)} className="flex-1 py-2 rounded bg-zinc-900 hover:bg-emerald-950/40 text-xs font-bold text-emerald-500/80 flex items-center justify-center gap-2 mb-2 transition-colors border border-zinc-800" title="Save Characters & Style as World Setting"><GlobeIcon size={14} /> World</button>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleDeleteProject(e, project.id)} className="p-2 bg-black/80 hover:bg-red-950/80 text-zinc-500 hover:text-red-500 rounded-lg backdrop-blur-md border border-white/5"><Trash2Icon size={16} /></button>
                                        <button onClick={(e) => handleExportJSON(e, project)} className="p-2 bg-black/80 hover:bg-indigo-950/80 text-zinc-500 hover:text-indigo-500 rounded-lg backdrop-blur-md border border-white/5"><DownloadIcon size={16} /></button>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'WORLDS' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 pb-2 text-white">Saved Worlds ({worlds.length})</h2>
                        <div className="text-sm text-zinc-500 italic">Save a Project as a World to reuse its characters.</div>
                    </div>
                    
                    {isLoadingWorlds ? <div className="text-center text-zinc-600 py-20">Loading Worlds...</div> : 
                    worlds.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed"><GlobeIcon size={48} className="mx-auto text-zinc-700 mb-4" /><h3 className="text-xl font-bold text-zinc-600">No worlds saved yet</h3><p className="text-zinc-700 mt-2 text-sm">Go to 'My Projects' and click 'World' on any project.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {worlds.map((world) => (
                                <div key={world.id} className="bg-zinc-950 border border-emerald-900/50 rounded-xl overflow-hidden hover:border-emerald-700 transition-all hover:shadow-xl relative p-5 flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-emerald-500/90 truncate pr-2">{world.title}</h3>
                                        <div className="flex gap-2">
                                            {onEditWorld && (
                                                <button onClick={(e) => { e.stopPropagation(); onEditWorld(world); }} className="text-zinc-600 hover:text-indigo-400 transition-colors" title="Edit World Assets">
                                                    <Edit2Icon size={16}/>
                                                </button>
                                            )}
                                            <button onClick={(e) => handleDeleteWorld(e, world.id)} className="text-zinc-600 hover:text-red-500 transition-colors"><Trash2Icon size={16}/></button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mb-4 flex-wrap">
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-black text-zinc-500 border border-zinc-900">{world.genre}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-black text-zinc-500 border border-zinc-900">{world.visualStyle}</span>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <div className="text-[10px] font-bold text-zinc-600 uppercase mb-2 flex items-center gap-1"><UsersIcon size={12}/> Characters ({world.characters.length})</div>
                                        <div className="flex -space-x-2 overflow-hidden">
                                            {world.characters.slice(0, 5).map((char, i) => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-950 bg-zinc-900 overflow-hidden" title={char.name}>
                                                    {char.avatarUrl ? <img src={char.avatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 font-bold">{char.name[0]}</div>}
                                                </div>
                                            ))}
                                            {world.characters.length > 5 && <div className="w-8 h-8 rounded-full border-2 border-zinc-950 bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-600">+{world.characters.length - 5}</div>}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => onStartFromWorld && onStartFromWorld(world)}
                                        className="mt-auto w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                                    >
                                        <SparklesIcon size={16} /> New Story
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'PROFILE' && (
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-bold mb-6 text-white">Manage Profile</h2>
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 shadow-xl">
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div><label className="block text-sm font-medium text-zinc-500 mb-2">Email</label><input type="email" value={user.email} disabled className="w-full bg-black border border-zinc-800 rounded-lg py-3 px-4 text-zinc-600 cursor-not-allowed"/></div>
                            <div><label className="block text-sm font-medium text-zinc-500 mb-2">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg py-3 px-4 text-white focus:border-indigo-500 outline-none transition-colors"/></div>
                            <div className="pt-6 border-t border-zinc-900"><h3 className="text-lg font-bold text-white mb-4">Change Password</h3><div className="space-y-4"><div><label className="block text-sm font-medium text-zinc-500 mb-2">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg py-3 px-4 text-white focus:border-indigo-500 outline-none transition-colors"/></div><div><label className="block text-sm font-medium text-zinc-500 mb-2">Confirm</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg py-3 px-4 text-white focus:border-indigo-500 outline-none transition-colors"/></div></div></div>
                            {message && <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{message.text}</div>}
                            <div className="flex justify-end pt-4"><button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"><SaveIcon size={18} /> Save</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>

        {/* Assets Overlay */}
        {selectedAssetProject && (
            <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setSelectedAssetProject(null)}>
                <div className="bg-black w-full max-w-6xl h-[85vh] rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-6 border-b border-zinc-900"><div><h2 className="text-2xl font-bold text-white">{selectedAssetProject.title}</h2><p className="text-sm text-zinc-500">Asset Library</p></div><button onClick={() => setSelectedAssetProject(null)} className="text-zinc-500 hover:text-white transition-colors"><XIcon size={24}/></button></div>
                    <div className="flex border-b border-zinc-900"><button onClick={() => setAssetTab('SCRIPT')} className={`flex-1 py-4 font-bold flex gap-2 justify-center transition-colors ${assetTab === 'SCRIPT' ? 'text-indigo-400 bg-zinc-900/50 border-b-2 border-indigo-400' : 'text-zinc-600 hover:text-zinc-400'}`}><LayoutListIcon size={18}/> Script</button><button onClick={() => setAssetTab('IMAGES')} className={`flex-1 py-4 font-bold flex gap-2 justify-center transition-colors ${assetTab === 'IMAGES' ? 'text-indigo-400 bg-zinc-900/50 border-b-2 border-indigo-400' : 'text-zinc-600 hover:text-zinc-400'}`}><ImageIcon size={18}/> Gallery</button><button onClick={() => setAssetTab('VIDEOS')} className={`flex-1 py-4 font-bold flex gap-2 justify-center transition-colors ${assetTab === 'VIDEOS' ? 'text-indigo-400 bg-zinc-900/50 border-b-2 border-indigo-400' : 'text-zinc-600 hover:text-zinc-400'}`}><FilmIcon size={18}/> Cinema</button></div>
                    <div className="flex-1 overflow-y-auto p-6 bg-black">
                        {assetTab === 'SCRIPT' && <div className="max-w-3xl mx-auto bg-white text-slate-900 p-12 rounded-sm shadow-2xl min-h-full font-mono text-sm leading-relaxed">{selectedAssetProject.script.scenes.map((s,i) => <div key={i} className="mb-8"><strong className="block border-b border-slate-200 mb-2 uppercase">Scene {s.sceneNumber}: {s.location}</strong><p className="text-slate-700">{s.actionDescription}</p></div>)}</div>}
                        {assetTab === 'IMAGES' && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{selectedAssetProject.script.scenes.map((s,i) => s.generatedImageUrl && <div key={i} className="relative group rounded-lg overflow-hidden border border-zinc-900"><img src={s.generatedImageUrl} className="w-full aspect-video object-cover"/><div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all"><a href={s.generatedImageUrl} download className="p-2 bg-indigo-600 rounded-lg text-white hover:scale-110 transition-transform"><DownloadIcon size={16}/></a><button onClick={() => handleDeleteAsset(i, 'image')} className="p-2 bg-red-600 rounded-lg text-white hover:scale-110 transition-transform"><Trash2Icon size={16}/></button></div></div>)}</div>}
                        {assetTab === 'VIDEOS' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{selectedAssetProject.script.scenes.map((s,i) => s.generatedVideoUrl && <div key={i} className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden group"><video src={s.generatedVideoUrl} controls className="w-full aspect-video bg-black"/><div className="p-4 flex justify-between items-center"><span className="text-zinc-500 text-xs font-bold">Scene {s.sceneNumber}</span><div className="flex gap-2"><a href={s.generatedVideoUrl} download className="text-indigo-500 hover:text-indigo-400 transition-colors"><DownloadIcon size={16}/></a><button onClick={() => handleDeleteAsset(i, 'video')} className="text-red-500 hover:text-red-400 transition-colors"><Trash2Icon size={16}/></button></div></div></div>)}</div>}
                    </div>
                </div>
            </div>
        )}

        {/* Create New World Modal */}
        {isCreatingWorld && (
            <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-black w-full max-w-4xl h-[85vh] rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-black">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><GlobeIcon className="text-indigo-500"/> Create New World</h2>
                        <button onClick={() => setIsCreatingWorld(false)}><XIcon className="text-zinc-500 hover:text-white transition-colors"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-black">
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">World Title</label><input className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-white mt-2 outline-none focus:border-indigo-500 transition-colors" value={newWorldTitle} onChange={e=>setNewWorldTitle(e.target.value)} placeholder="e.g. Cyberpunk 2077"/></div>
                            <div><label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Visual Style</label><input className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-white mt-2 outline-none focus:border-indigo-500 transition-colors" value={newWorldStyle} onChange={e=>setNewWorldStyle(e.target.value)} placeholder="e.g. Cinematic Realism"/></div>
                        </div>
                        
                        <div className="border-t border-zinc-900 pt-6">
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white text-lg">Characters</h3><button onClick={handleAddNewChar} className="text-xs bg-indigo-600 hover:bg-indigo-500 transition-colors px-4 py-1.5 rounded-lg font-bold text-white shadow-lg">+ Add Character</button></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {newWorldChars.map((c, i) => (
                                    <div key={i} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900 relative group">
                                        <button onClick={() => setNewWorldChars(newWorldChars.filter((_, idx)=>idx!==i))} className="absolute top-2 right-2 p-1 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2Icon size={14}/></button>
                                        <div className="w-full aspect-square bg-black rounded-xl mb-4 relative flex items-center justify-center group/img overflow-hidden border border-zinc-800">
                                            {c.avatarUrl ? <img src={c.avatarUrl} className="w-full h-full object-cover"/> : <UsersIcon className="text-zinc-800" size={32}/>}
                                            <label className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer text-[10px] font-bold text-white uppercase tracking-widest transition-opacity">Upload<input type="file" className="hidden" onChange={(e)=>handleCharUpload(i,e)}/></label>
                                        </div>
                                        <input className="w-full bg-transparent border-none text-white text-sm font-bold p-0 mb-1 outline-none" value={c.name} onChange={e=>{const u=[...newWorldChars];u[i].name=e.target.value;setNewWorldChars(u)}} placeholder="Character Name"/>
                                        <input className="w-full bg-transparent border-none text-zinc-600 text-xs p-0 outline-none" value={c.description} onChange={e=>{const u=[...newWorldChars];u[i].description=e.target.value;setNewWorldChars(u)}} placeholder="Brief description..."/>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-zinc-900 pt-6">
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white text-lg">Locations</h3><button onClick={handleAddNewLoc} className="text-xs bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-1.5 rounded-lg font-bold text-white shadow-lg">+ Add Location</button></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {newWorldLocs.map((l, i) => (
                                    <div key={i} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900 relative group">
                                        <button onClick={() => setNewWorldLocs(newWorldLocs.filter((_, idx)=>idx!==i))} className="absolute top-2 right-2 p-1 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2Icon size={14}/></button>
                                        <div className="w-full aspect-square bg-black rounded-xl mb-4 relative flex items-center justify-center group/img overflow-hidden border border-zinc-800">
                                            {l.imageUrl ? <img src={l.imageUrl} className="w-full h-full object-cover"/> : <MapPinIcon className="text-zinc-800" size={32}/>}
                                            <label className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer text-[10px] font-bold text-white uppercase tracking-widest transition-opacity">Upload<input type="file" className="hidden" onChange={(e)=>handleLocUpload(i,e)}/></label>
                                        </div>
                                        <input className="w-full bg-transparent border-none text-white text-sm font-bold p-0 outline-none" value={l.name} onChange={e=>{const u=[...newWorldLocs];u[i].name=e.target.value;setNewWorldLocs(u)}} placeholder="Location Name"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-zinc-900 flex justify-end bg-black">
                        <button onClick={handleSubmitNewWorld} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-xl">Save World Library</button>
                    </div>
                </div>
            </div>
        )}

        {/* Save Existing Project as World Modal */}
        {saveWorldModalProject && (
            <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-black">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><GlobeIcon className="text-emerald-500"/> Convert to World</h3>
                        <button onClick={() => setSaveWorldModalProject(null)} className="text-zinc-500 hover:text-white transition-colors"><XIcon size={20}/></button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">World Title</label>
                            <input 
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors" 
                                value={saveWorldName}
                                onChange={(e) => setSaveWorldName(e.target.value)}
                                placeholder="Universe Title..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Narrative Context</label>
                            <textarea 
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none h-28 resize-none transition-colors" 
                                value={saveWorldDesc}
                                onChange={(e) => setSaveWorldDesc(e.target.value)}
                                placeholder="Describe atmosphere and rules..."
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t border-zinc-900 bg-black flex justify-end gap-3">
                        <button onClick={() => setSaveWorldModalProject(null)} className="px-4 py-2 rounded-lg text-zinc-500 hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleConfirmSaveWorld} className="px-8 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg transition-all">Save Library</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;