import React, { useState, useEffect } from 'react';
import { AppStep, Question, Answer, StoryConcept, ProductionScript, User, Project, Character, LyricSegment, LocationSetting, WorldSetting } from './types';
import Step1Topic from './components/Step1Topic';
import Step2Questions from './components/Step2Questions';
import Step3Concepts from './components/Step3Concepts';
import ProductionBoard from './components/ProductionBoard';
import AuthPage from './components/AuthPage';
import MyPage from './components/MyPage';
import AdminDashboard from './components/AdminDashboard';
import { generateQuestions, generateInitialConcepts, generateProductionScript, regenerateConceptsWithFeedback } from './services/geminiService';
import { getCurrentUser, logoutUser, getAutoSave, clearAutoSave } from './services/storageService';
import { LogOutIcon, HomeIcon, UserIcon, AlertCircleIcon, XIcon, ArrowRightIcon, ShieldIcon, SunIcon, MoonIcon } from 'lucide-react';

enum AppView {
  AUTH = 'AUTH',
  GENERATOR = 'GENERATOR',
  MY_PAGE = 'MY_PAGE',
  ADMIN = 'ADMIN',
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.AUTH);
  const [step, setStep] = useState<AppStep>(AppStep.TOPIC_INPUT);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('cinegen_theme');
    return saved === null ? true : saved === 'dark';
  });
  
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Korean');
  const [genre, setGenre] = useState('General / Mixed');
  const [duration, setDuration] = useState('1 Minute');
  const [sceneDuration, setSceneDuration] = useState(5);
  const [visualStyle, setVisualStyle] = useState('Photorealistic DSLR');
  const [lyrics, setLyrics] = useState<LyricSegment[] | undefined>(undefined);
  const [storyDevices, setStoryDevices] = useState<string[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [suggestedCharacters, setSuggestedCharacters] = useState<Character[]>([]);
  const [suggestedLocations, setSuggestedLocations] = useState<LocationSetting[]>([]);
  const [concepts, setConcepts] = useState<StoryConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<StoryConcept | null>(null);
  const [productionScript, setProductionScript] = useState<ProductionScript | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(undefined);
  const [startingWorld, setStartingWorld] = useState<WorldSetting | null>(null);
  const [autosaveFound, setAutosaveFound] = useState<{timestamp: number, script: ProductionScript} | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setCurrentView(user.isAdmin ? AppView.ADMIN : AppView.GENERATOR);
    }
    const savedSession = getAutoSave();
    if (savedSession) setAutosaveFound(savedSession);
  }, []);

  // Sync theme to document class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cinegen_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cinegen_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView(user.isAdmin ? AppView.ADMIN : AppView.GENERATOR);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentView(AppView.AUTH);
    resetGenerator();
  };

  const resetGenerator = () => {
    setStep(AppStep.TOPIC_INPUT);
    setTopic('');
    setLyrics(undefined);
    setProductionScript(null);
    setConcepts([]);
    setQuestions([]);
    setSuggestedCharacters([]);
    setSuggestedLocations([]);
    setCurrentProjectId(undefined);
    setStartingWorld(null);
    setGenre('General / Mixed');
    setVisualStyle('Photorealistic DSLR');
  };

  const handleSelectProject = (project: Project) => {
    setProductionScript(project.script);
    setCurrentProjectId(project.id);
    setStep(AppStep.PRODUCTION_DASHBOARD);
    setCurrentView(AppView.GENERATOR);
    setAutosaveFound(null);
  };
  
  const handleStartFromWorld = (world: WorldSetting) => {
    resetGenerator();
    setStartingWorld(world);
    setGenre(world.genre);
    setVisualStyle(world.visualStyle);
    setSuggestedCharacters(world.characters);
    setSuggestedLocations(world.locations);
    setCurrentView(AppView.GENERATOR);
    setStep(AppStep.TOPIC_INPUT);
  };
  
  const handleRestoreSession = () => {
      if (autosaveFound) {
          setProductionScript(autosaveFound.script);
          setStep(AppStep.PRODUCTION_DASHBOARD);
          setCurrentView(AppView.GENERATOR);
          setAutosaveFound(null);
      }
  };
  
  const handleDismissAutosave = () => {
      setAutosaveFound(null);
      clearAutoSave();
  };

  const handleTopicSubmit = async (
      inputTopic: string, 
      selectedLanguage: string, 
      selectedGenre: string, 
      selectedDuration: string, 
      selectedVisualStyle: string, 
      selectedSceneDuration: number, 
      extractedLyrics?: LyricSegment[],
      selectedWorld?: WorldSetting,
      selectedDevices?: string[]
  ) => {
    setTopic(inputTopic);
    setLanguage(selectedLanguage);
    setGenre(selectedGenre);
    setDuration(selectedDuration);
    setVisualStyle(selectedVisualStyle);
    setSceneDuration(selectedSceneDuration);
    setLyrics(extractedLyrics);
    setStoryDevices(selectedDevices || []);
    setIsLoading(true);
    setCurrentProjectId(undefined);
    
    if (selectedWorld) {
        setStartingWorld(selectedWorld);
        setSuggestedCharacters(selectedWorld.characters);
        setSuggestedLocations(selectedWorld.locations);
    } else {
        setStartingWorld(null);
    }
    
    clearAutoSave();
    setAutosaveFound(null);

    try {
      const generatedConcepts = await generateInitialConcepts(
          inputTopic, 
          selectedLanguage, 
          selectedGenre, 
          selectedDuration, 
          selectedVisualStyle, 
          extractedLyrics,
          selectedWorld,
          selectedDevices
      );
      setConcepts(generatedConcepts);
      setStep(AppStep.CONCEPT_SELECTION);
    } catch (error) {
      console.error(error);
      alert("Failed to generate concepts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConceptSelect = async (concept: StoryConcept) => {
    setSelectedConcept(concept);
    setIsLoading(true);
    try {
      const response = await generateQuestions(topic, concept, language, visualStyle);
      setQuestions(response.questions);
      
      if (startingWorld) {
          const mergedChars = [
              ...startingWorld.characters,
              ...response.characters.filter(nc => !startingWorld.characters.some(wc => wc.name === nc.name))
          ];
          setSuggestedCharacters(mergedChars);
          
          const mergedLocs = [
              ...startingWorld.locations,
              ...response.locations.filter(nl => !startingWorld.locations.some(wl => wl.name === nl.name))
          ];
          setSuggestedLocations(mergedLocs);
      } else {
          setSuggestedCharacters(response.characters);
          setSuggestedLocations(response.locations);
      }
      setStep(AppStep.DETAILS_REFINEMENT);
    } catch (error) {
        console.error(error);
        alert("Failed to generate details questions.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegenerateConcepts = async (feedback: string) => {
    setIsLoading(true);
    try {
      let generatedConcepts;
      if (feedback && feedback.trim()) {
         generatedConcepts = await regenerateConceptsWithFeedback(topic, language, genre, duration, feedback);
      } else {
         generatedConcepts = await generateInitialConcepts(topic, language, genre, duration, visualStyle, lyrics, startingWorld || undefined, storyDevices);
      }
      setConcepts(generatedConcepts);
    } catch (error) {
      console.error(error);
      alert("Failed to regenerate concepts.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDetailsSubmit = async (answers: Answer[], confirmedVisualStyle: string, aspectRatio: string, characters: Character[], locations: LocationSetting[]) => {
    if (!selectedConcept) return;

    const combinedQa = answers.map(a => {
      const q = questions.find(q => q.id === a.questionId);
      return { question: q?.question || '', answer: a.answer };
    });
    
    setIsLoading(true);
    try {
      const script = await generateProductionScript(
          selectedConcept, 
          combinedQa, 
          characters, 
          locations,
          language, 
          confirmedVisualStyle, 
          aspectRatio,
          duration,
          sceneDuration,
          lyrics
      );
      setProductionScript(script);
      setStep(AppStep.PRODUCTION_DASHBOARD);
    } catch (error) {
      console.error(error);
      alert("Failed to generate script. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (currentView === AppView.AUTH) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 flex items-center justify-center font-sans transition-colors duration-300">
             <AuthPage onLogin={handleLogin} />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col font-sans relative transition-colors duration-300">
      <nav className="bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center z-40 sticky top-0 backdrop-blur-md">
         <div 
            className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-300 cursor-pointer"
            onClick={() => { 
              if (currentUser?.isAdmin) setCurrentView(AppView.ADMIN);
              else { resetGenerator(); setCurrentView(AppView.GENERATOR); }
            }}
         >
            CineGen AI
         </div>
         
         <div className="flex items-center gap-4">
             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 transition-colors"
                title={isDarkMode ? "Light Mode" : "Dark Mode"}
             >
                {isDarkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}
             </button>

             <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 mx-1"></div>

             {currentUser?.isAdmin && (
                <button 
                  onClick={() => setCurrentView(AppView.ADMIN)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === AppView.ADMIN ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white'}`}
                >
                  <ShieldIcon size={18} /> Admin
                </button>
             )}
             <button 
                onClick={() => { resetGenerator(); setCurrentView(AppView.GENERATOR); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === AppView.GENERATOR && step === AppStep.TOPIC_INPUT ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white'}`}
             >
                <HomeIcon size={18} /> New Project
             </button>
             {!currentUser?.isAdmin && (
                <button 
                    onClick={() => setCurrentView(AppView.MY_PAGE)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === AppView.MY_PAGE ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white'}`}
                >
                    <UserIcon size={18} /> My Studio
                </button>
             )}
             <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-2 border-l border-slate-200 dark:border-zinc-800"
             >
                <LogOutIcon size={18} />
             </button>
         </div>
      </nav>

      <main className="flex-grow w-full">
        {currentView === AppView.ADMIN && <AdminDashboard />}
        {currentView === AppView.MY_PAGE && currentUser && (
            <MyPage 
                user={currentUser} 
                onSelectProject={handleSelectProject} 
                onStartFromWorld={handleStartFromWorld}
                onClose={() => setCurrentView(AppView.GENERATOR)}
            />
        )}
        {currentView === AppView.GENERATOR && (
            <>
                {step === AppStep.TOPIC_INPUT && (
                    <Step1Topic 
                        onSubmit={handleTopicSubmit} 
                        isLoading={isLoading} 
                        initialValues={startingWorld ? { genre: startingWorld.genre, visualStyle: startingWorld.visualStyle } : undefined}
                    />
                )}
                {step === AppStep.CONCEPT_SELECTION && (
                    <Step3Concepts 
                        concepts={concepts} 
                        onSelect={handleConceptSelect} 
                        onRegenerate={handleRegenerateConcepts}
                        onBack={() => setStep(AppStep.TOPIC_INPUT)}
                        isLoading={isLoading} 
                    />
                )}
                {step === AppStep.DETAILS_REFINEMENT && (
                    <Step2Questions 
                        questions={questions} 
                        initialCharacters={suggestedCharacters}
                        initialLocations={suggestedLocations}
                        onSubmit={handleDetailsSubmit} 
                        onBack={() => setStep(AppStep.CONCEPT_SELECTION)}
                        isLoading={isLoading}
                        selectedConcept={selectedConcept}
                        language={language}
                        selectedVisualStyle={visualStyle}
                    />
                )}
                {step === AppStep.PRODUCTION_DASHBOARD && productionScript && (
                    <ProductionBoard script={productionScript} user={currentUser} projectId={currentProjectId} />
                )}
            </>
        )}
      </main>

      {autosaveFound && currentView === AppView.GENERATOR && step === AppStep.TOPIC_INPUT && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center animate-[slideUp_0.3s_ease-out]">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-indigo-500/50 shadow-2xl rounded-2xl p-4 max-w-2xl w-full flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <div className="bg-indigo-600/10 dark:bg-indigo-500/20 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                          <AlertCircleIcon size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">Unsaved Session Found</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                              Restorable project: "{autosaveFound.script.title}" ({new Date(autosaveFound.timestamp).toLocaleTimeString()})
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={handleDismissAutosave} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><XIcon size={20} /></button>
                      <button onClick={handleRestoreSession} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg">Restore Session <ArrowRightIcon size={18} /></button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;