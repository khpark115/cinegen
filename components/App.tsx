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
import { LogOutIcon, HomeIcon, UserIcon, AlertCircleIcon, XIcon, ArrowRightIcon, ShieldIcon } from 'lucide-react';

// Enum for managing "Views" outside of the generator steps
enum AppView {
  AUTH = 'AUTH',
  GENERATOR = 'GENERATOR',
  MY_PAGE = 'MY_PAGE',
  ADMIN = 'ADMIN',
}

const App: React.FC = () => {
  // Global App State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.AUTH);

  // Generator State
  const [step, setStep] = useState<AppStep>(AppStep.TOPIC_INPUT);
  const [isLoading, setIsLoading] = useState(false);
  
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Korean');
  const [genre, setGenre] = useState('General / Mixed');
  const [duration, setDuration] = useState('1 Minute');
  const [sceneDuration, setSceneDuration] = useState(5); // Default 5s
  const [visualStyle, setVisualStyle] = useState('Photorealistic DSLR');
  const [lyrics, setLyrics] = useState<LyricSegment[] | undefined>(undefined);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [suggestedCharacters, setSuggestedCharacters] = useState<Character[]>([]);
  const [suggestedLocations, setSuggestedLocations] = useState<LocationSetting[]>([]);
  const [concepts, setConcepts] = useState<StoryConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<StoryConcept | null>(null);
  const [productionScript, setProductionScript] = useState<ProductionScript | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(undefined);
  
  const [startingWorld, setStartingWorld] = useState<WorldSetting | null>(null);

  // Restore Session State
  const [autosaveFound, setAutosaveFound] = useState<{timestamp: number, script: ProductionScript} | null>(null);

  // Initialize Auth & Check Autosave
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      if (user.isAdmin) {
        setCurrentView(AppView.ADMIN);
      } else {
        setCurrentView(AppView.GENERATOR);
      }
    }
    
    // Check for autosave
    const savedSession = getAutoSave();
    if (savedSession) {
        setAutosaveFound(savedSession);
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.isAdmin) {
      setCurrentView(AppView.ADMIN);
    } else {
      setCurrentView(AppView.GENERATOR);
    }
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
    setStartingWorld(null); // Reset world
    setGenre('General / Mixed');
    setVisualStyle('Photorealistic DSLR');
  };

  // --- Logic for Loading Saved Project ---
  const handleSelectProject = (project: Project) => {
    setProductionScript(project.script);
    setCurrentProjectId(project.id);
    setStep(AppStep.PRODUCTION_DASHBOARD);
    setCurrentView(AppView.GENERATOR);
    setAutosaveFound(null); // Dismiss autosave prompt if explicitly loading a project
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

  // --- Generator Handlers ---
  const handleTopicSubmit = async (
      inputTopic: string, 
      selectedLanguage: string, 
      selectedGenre: string, 
      selectedDuration: string, 
      selectedVisualStyle: string, 
      selectedSceneDuration: number, 
      extractedLyrics?: LyricSegment[],
      selectedWorld?: WorldSetting
  ) => {
    setTopic(inputTopic);
    setLanguage(selectedLanguage);
    setGenre(selectedGenre);
    setDuration(selectedDuration);
    setVisualStyle(selectedVisualStyle);
    setSceneDuration(selectedSceneDuration);
    setLyrics(extractedLyrics);
    setIsLoading(true);
    setCurrentProjectId(undefined); // Reset project ID for new creation
    
    // Set Starting World if selected
    if (selectedWorld) {
        setStartingWorld(selectedWorld);
        // Pre-load characters and locations from world into suggestions
        setSuggestedCharacters(selectedWorld.characters);
        setSuggestedLocations(selectedWorld.locations);
    } else {
        setStartingWorld(null);
    }
    
    // Clear old autosave when starting fresh
    clearAutoSave();
    setAutosaveFound(null);

    try {
      // Pass extractedLyrics and visualStyle to the concept generation service
      const generatedConcepts = await generateInitialConcepts(inputTopic, selectedLanguage, selectedGenre, selectedDuration, selectedVisualStyle, extractedLyrics);
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
      
      // If we are starting from a world, PRESERVE the world characters
      if (startingWorld) {
          // Merge: World Characters First + New suggestions if needed.
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
         // Pass lyrics and visualStyle again if they exist in state
         generatedConcepts = await generateInitialConcepts(topic, language, genre, duration, visualStyle, lyrics);
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
          sceneDuration, // Pass user defined scene duration
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

  // --- View Rendering ---

  if (currentView === AppView.AUTH) {
    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center font-sans">
             <AuthPage onLogin={handleLogin} />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans relative">
      
      {/* Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
         <div 
            className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-300 cursor-pointer"
            onClick={() => { 
              if (currentUser?.isAdmin) {
                setCurrentView(AppView.ADMIN);
              } else {
                resetGenerator(); 
                setCurrentView(AppView.GENERATOR);
              }
            }}
         >
            CineGen AI
         </div>
         
         <div className="flex items-center gap-4">
             {currentUser?.isAdmin && (
                <button 
                  onClick={() => setCurrentView(AppView.ADMIN)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === AppView.ADMIN ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-white'}`}
                >
                  <ShieldIcon size={18} /> Admin
                </button>
             )}

             <button 
                onClick={() => { resetGenerator(); setCurrentView(AppView.GENERATOR); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === AppView.GENERATOR && step === AppStep.TOPIC_INPUT ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
             >
                <HomeIcon size={18} /> New Project
             </button>
             
             {!currentUser?.isAdmin && (
                <button 
                    onClick={() => setCurrentView(AppView.MY_PAGE)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === AppView.MY_PAGE ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                >
                    <UserIcon size={18} /> My Studio
                </button>
             )}

             <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 transition-colors ml-4 border-l border-slate-700"
             >
                <LogOutIcon size={18} />
             </button>
         </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full">
        {currentView === AppView.ADMIN && <AdminDashboard />}

        {currentView === AppView.MY_PAGE && currentUser && (
            <MyPage 
                user={currentUser} 
                onSelectProject={handleSelectProject} 
                onStartFromWorld={handleStartFromWorld}
            />
        )}

        {currentView === AppView.GENERATOR && (
            // Generator View
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

      {/* Autosave Restore Banner/Modal */}
      {autosaveFound && currentView === AppView.GENERATOR && step === AppStep.TOPIC_INPUT && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center animate-[slideUp_0.3s_ease-out]">
              <div className="bg-slate-800 border border-indigo-500/50 shadow-2xl rounded-2xl p-4 max-w-2xl w-full flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
                          <AlertCircleIcon size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-white">Unsaved Session Found</h3>
                          <p className="text-sm text-slate-400">
                              Restorable project: "{autosaveFound.script.title}" ({new Date(autosaveFound.timestamp).toLocaleTimeString()})
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button 
                          onClick={handleDismissAutosave}
                          className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Dismiss"
                      >
                          <XIcon size={20} />
                      </button>
                      <button 
                          onClick={handleRestoreSession}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
                      >
                          Restore Session <ArrowRightIcon size={18} />
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;