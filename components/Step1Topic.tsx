import React, { useState, useEffect } from 'react';
import { FilmIcon, SparklesIcon, GlobeIcon, UploadCloudIcon, Loader2Icon, ChevronDownIcon, Wand2Icon, MusicIcon, XIcon, StarIcon, CameraIcon, ApertureIcon, LayersIcon, BookOpenIcon, BoxIcon, PaletteIcon, MonitorIcon, MoonIcon, ClapperboardIcon, GridIcon, EyeIcon, ImagePlusIcon, Edit3Icon, ClockIcon, LanguagesIcon, BrainIcon, HeartIcon, PuzzleIcon, ViewIcon, AlertTriangleIcon, HelpCircleIcon, TimerIcon, GaugeIcon, RefreshCwIcon, CheckIcon } from 'lucide-react';
import { extractLyricsFromAudio, analyzeImageStyle, generateStoryboardImage } from '../services/geminiService';
import { LyricSegment, WorldSetting } from '../types';
import { getUserWorlds, getCurrentUser } from '../services/storageService';

interface Props {
  onSubmit: (topic: string, language: string, genre: string, duration: string, visualStyle: string, sceneDuration: number, lyrics?: LyricSegment[], world?: WorldSetting, storyDevices?: string[]) => void;
  isLoading: boolean;
  onBack?: () => void;
  initialValues?: { genre?: string; visualStyle?: string; };
}

const GENRE_CATEGORIES: Record<string, { desc: string, subs: string[] }> = {
  "기본영상 (Basic)": {
    desc: "표준적인 영상 포맷",
    subs: ["일반 (General)"]
  },
  "영화 (Movie)": {
    desc: "극장용 퀄리티, 웅장한 서사, 시네마틱 룩 (2.35:1 권장)",
    subs: [
      "사이버펑크 SF (Cyberpunk Sci-Fi)", "스페이스 오페라 (Space Opera)", "오컬트 호러 (Occult Horror)", 
      "슬래셔/고어 (Slasher)", "범죄 느와르 (Crime Noir)", "전쟁/에픽 (War/Epic)", 
      "재난/서바이벌 (Disaster)", "정통 멜로 (Classic Romance)", "법정 스릴러 (Legal Thriller)", "예술/독립영화 (Art House)"
    ]
  },
  "뮤지컬 (Musical)": {
    desc: "음악 중심 서사, 무대 연출, 화려한 의상",
    subs: [
      "브로드웨이/웨스트엔드 (Broadway Style)", "뮤지컬 영화 (Movie Musical)", "디즈니/동화풍 (Disney Style)", 
      "오페라/클래식 (Opera)", "K-POP 스테이지 (K-Pop Stage)", "락 뮤지컬 (Rock Musical)", 
      "주크박스 뮤지컬 (Jukebox)", "실험/아방가르드 (Avant-garde)", "합창/퍼포먼스 (Choral Performance)"
    ]
  },
  "유튜브/크리에이터 (YouTube/Creator)": {
    desc: "온라인 플랫폼 최적화, 구독자 타겟팅, 트렌디한 편집",
    subs: [
      "브이로그 (Vlog)", "테크 리뷰 (Tech Review)", "게임/스트리밍 (Gaming)", 
      "먹방/쿡방 (Mukbang/Cooking)", "튜토리얼/강의 (Tutorial)", "영화/드라마 리뷰 (Review)", 
      "ASMR (Sensory)", "토크쇼/인터뷰 (Talk Show)", "프랭크/몰래카메라 (Prank)", "뉴스/정보 (News/Info)"
    ]
  },
  "시트콤 (Sitcom)": {
    desc: "일상 속 유머, 과장된 캐릭터 (16:9)",
    subs: [
      "오피스 시트콤 (Office)", "가족 시트콤 (Family)", "캠퍼스/청춘 (Campus)", 
      "남매/현실남매 (Siblings)", "모큐멘터리 (Mockumentary)", "블랙 코미디 (Black Comedy)", 
      "이웃사촌 (Neighbors)", "버디 콤비 (Buddy Duo)", "슬랩스틱 (Slapstick)", "판타지 시트콤 (Fantasy Sitcom)"
    ]
  },
  "웹드라마 (Web Drama)": {
    desc: "모바일 최적화, 빠른 전개, 트렌디한 소재",
    subs: [
      "하이틴 로맨스 (High Teen)", "오피스 로맨스 (Office Romance)", "K-막장 (Makjang)", 
      "회귀/빙의물 (Isekai/Regression)", "공감/일상물 (Slice of Life)", "숏폼 스릴러 (Short Thriller)", 
      "BL/GL (Romance Fantasy)", "아이돌 성장물 (Idol Drama)", "SNS 추리물 (Social Mystery)", "인터랙티브 (Interactive)"
    ]
  },
  "동화 (Fairy Tale)": {
    desc: "상상력 자극, 교육적 메시지, 따뜻한 스타일",
    subs: [
      "전래 동화 (Folktale)", "마법 판타지 (Magic Fantasy)", "동물 우화 (Animal Fable)", 
      "수면 동화 (Bedtime Story)", "장난감 모험 (Toy Adventure)", "교육 동화 (Educational)", 
      "잔혹 동화 (Dark Fairy Tale)", "우주 동화 (Space Tale)", "뮤지컬 동화 (Musical Tale)", "감동/치유 (Healing)"
    ]
  },
  "뮤직비디오 (Music Video)": {
    desc: "비트 싱크, 감각적 이미지, 분위기 중심",
    subs: [
      "댄스 퍼포먼 (K-Pop Dance)", "드라마 타이즈 (Narrative MV)", "힙합/스트릿 (Hip-hop)", 
      "시티팝/레트로 (City Pop)", "몽환/감성 (Dreamy/Mood)", "리릭 비디오 (Lyric Video)", 
      "밴드/라이브 (Band Play)", "사이버펑크 (Futuristic)", "Vlog 스타일 (Travel MV)", "예술/추상 (Abstract Art)"
    ]
  },
  "다큐멘터리 (Documentary)": {
    desc: "사실 전달, 인터뷰, 내레이션",
    subs: [
      "야생/동물 (Wildlife)", "범죄/수사 (True Crime)", "인물/휴먼 (Biography)", 
      "역사/아카이브 (History)", "과학/우주 (Science/Tech)", "여행/탐험 (Travel/Exploration)", 
      "음식/요리 (Culinary)", "사회 고발 (Investigative)", "스포츠/도전 (Sports)", "메이킹 필름 (Behind the Scenes)"
    ]
  },
  "광고 (Commercial)": {
    desc: "시선 강탈(Hook), 설득, 고급스러운 톤",
    subs: [
      "뷰티/화장품 (Cosmetics)", "식음료/씨즐 (Food Sizzle)", "패션/의류 (Fashion)", 
      "가전/테크 (Electronics)", "자동차 (Automotive)", "명품/주얼리 (Luxury)", 
      "게임 광고 (Game Ad)", "앱/서비스 (App Service)", "금융/신뢰 (Finance)", "병맛/바이럴 (Viral Ad)"
    ]
  },
  "홍보물 (Promotional)": {
    desc: "브랜드 가치 전달, 정보 안내, 신뢰감",
    subs: [
      "기업 브랜드 필름 (Brand Film)", "행사 티저 (Event Teaser)", "채용/조직문화 (Recruitment)", 
      "ESG/캠페인 (Public Campaign)", "자기소개/PR (Personal Portfolio)", "크라우드 펀딩 (Crowdfunding)", 
      "부동산/건축 (Real Estate)", "대학/교육 (Education)", "관광/지자체 (Tourism)", "컨퍼런스/세미나 (Highlight)"
    ]
  }
};

const NARRATIVE_DEVICES: Record<string, { icon: React.ReactNode, devices: {name: string, desc: string}[] }> = {
    "인식의 전환 (Insight)": {
        icon: <BrainIcon size={14}/>,
        devices: [
            { name: "리빌 (Reveal)", desc: "숨겨진 사실(정체, 진실) 공개" },
            { name: "각성 (Anagnorisis)", desc: "인물이 스스로 진실을 깨닫는 순간" },
            { name: "의미 전환", desc: "같은 사건이 완전히 다르게 보이는 지점" }
        ]
    },
    "감정의 반전 (Emotion)": {
        icon: <HeartIcon size={14}/>,
        devices: [
            { name: "배신 (Betrayal)", desc: "신뢰 붕괴로 인한 감정 폭발" },
            { name: "희생 (Sacrifice)", desc: "예상 못한 선택으로 감정 고조" },
            { name: "구원 (Salvation)", desc: "절망 끝에서 오는 안도감" },
            { name: "상실 (Loss)", desc: "상실로 생기는 서사 압력" }
        ]
    },
    "서사 구조 (Structure)": {
        icon: <PuzzleIcon size={14}/>,
        devices: [
            { name: "미스디렉션", desc: "독자의 시선 조작 (속임수)" },
            { name: "복선/회수", desc: "나중에 터지는 설계형 장치" },
            { name: "서사적 공백", desc: "설명을 생략하여 궁금증 유발" },
            { name: "지연 공개", desc: "정보를 늦게 풀어 긴장 유지" }
        ]
    },
    "관점의 변화 (Perspective)": {
        icon: <ViewIcon size={14}/>,
        devices: [
            { name: "비신뢰 화자", desc: "화자의 말이 거짓일 가능성" },
            { name: "시점 전환", desc: "1인칭↔3인칭 또는 인물 교체" },
            { name: "관찰자 개입", desc: "제3자가 사건을 재해석" }
        ]
    },
    "세계관 붕괴 (World Rules)": {
        icon: <GlobeIcon size={14}/>,
        devices: [
            { name: "규칙 붕괴", desc: "믿었던 세계의 룰이 깨짐" },
            { name: "정체성 붕괴", desc: "나는 누구인가에 대한 충격" },
            { name: "도덕적 전복", desc: "선/악, 옳음/그름의 역전" }
        ]
    },
    "여운/결말 (Ending)": {
        icon: <AlertTriangleIcon size={14}/>,
        devices: [
            { name: "열린 결말", desc: "답을 독자에게 넘김" },
            { name: "침묵 엔딩", desc: "설명 없는 긴 여운" },
            { name: "역설적 결말", desc: "해결되었지만 비극적인 끝" }
        ]
    }
};

const VISUAL_STYLE_GROUPS = [
  {
    name: "Camera",
    icon: <CameraIcon size={16}/>,
    styles: [
      { id: "High-Quality Realism (DSLR)", label: "High-Quality Realism", desc: "DSLR Sharp focus", bg: "from-slate-200 to-slate-400 dark:from-zinc-800 dark:to-black" },
      { id: "Film & Retro Mood", label: "Film & Retro Mood", desc: "Classic cinema look", bg: "from-amber-100 to-amber-200 dark:from-amber-950 dark:to-black" },
      { id: "Vintage / Retro Film", label: "Vintage Film", desc: "Aged film texture", bg: "from-orange-100 to-orange-200 dark:from-orange-950/40 dark:to-sepia-950/40" },
      { id: "Polaroid / Vintage Instant", label: "Polaroid", desc: "Instant photo nostalgia", bg: "from-yellow-100 to-yellow-200 dark:from-yellow-950/30 dark:to-zinc-900" },
      { id: "Cinematic Lighting / Dramatic", label: "Cinematic Lighting", desc: "High contrast drama", bg: "from-indigo-100 to-indigo-200 dark:from-indigo-950 dark:to-black" },
      { id: "Cinematic Movie Still", label: "Movie Still", desc: "Blockbuster frame", bg: "from-blue-100 to-blue-200 dark:from-blue-950/50 dark:to-black" },
      { id: "Underwater / Submerged", label: "Underwater", desc: "Submerged effects", bg: "from-cyan-100 to-cyan-200 dark:from-cyan-950/50 dark:to-blue-950/50" },
      { id: "Thermal Vision / Heat Map", label: "Thermal Vision", desc: "Heat map aesthetics", bg: "from-red-100 via-yellow-100 to-blue-100 dark:from-red-600/30 dark:via-yellow-500/30 dark:to-blue-500/30" },
      { id: "X-Ray / Transparent", label: "X-Ray", desc: "See-through structure", bg: "from-slate-100 to-slate-200 dark:from-zinc-900 dark:to-black" }
    ]
  },
  {
    name: "3D",
    icon: <BoxIcon size={16}/>,
    styles: [
      { id: "3D GRAPHIC (General 3D)", label: "General 3D", desc: "Standard render", bg: "from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30" },
      { id: "Unreal Engine 5 / 8K Render", label: "Unreal Engine 5", desc: "Hyper-realistic", bg: "from-slate-200 to-slate-300 dark:from-zinc-900 dark:to-black" },
      { id: "Isometric / 3D Room", label: "Isometric", desc: "Orthographic view", bg: "from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30" },
      { id: "Low Poly / Geometric", label: "Low Poly", desc: "Simplified shapes", bg: "from-pink-100 to-orange-100 dark:from-pink-900/30 dark:to-orange-900/30" },
      { id: "Voxel Art / Block World", label: "Voxel Art", desc: "Block world", bg: "from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-950/30" },
      { id: "Glassmorphism / Frosted Glass", label: "Glassmorphism", desc: "Translucent glass", bg: "from-white/40 to-slate-100/40 dark:from-white/10 dark:to-white/5" },
      { id: "Fluid Art / 3D Liquid", label: "Fluid Art", desc: "Liquid physics", bg: "from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-950/30" },
      { id: "Metaball / Organic 3D", label: "Metaball", desc: "Organic blobs", bg: "from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-950/30" },
      { id: "Holographic / Iridescent", label: "Holographic", desc: "Shimmering light", bg: "from-pink-100 via-cyan-100 to-violet-100 dark:from-pink-900/20 dark:via-cyan-900/20 dark:to-violet-900/20" }
    ]
  },
  {
    name: "Anime",
    icon: <FilmIcon size={16}/>,
    styles: [
      { id: "Ghibli / Anime Style", label: "Ghibli Style", desc: "Lush, painted", bg: "from-green-100 to-sky-100 dark:from-green-900/30 dark:to-sky-900/30" },
      { id: "Disney / Pixar 3D", label: "Disney/Pixar", desc: "High-end 3D", bg: "from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30" },
      { id: "Arcane / Painted 3D", label: "Arcane Style", desc: "Painterly 3D", bg: "from-purple-100 to-pink-100 dark:from-purple-950/40 dark:to-pink-950/40" },
      { id: "Spider-Verse / Glitch Effect", label: "Spider-Verse", desc: "Halftone 3D", bg: "from-red-100 to-blue-100 dark:from-red-950/40 dark:to-blue-950/40" },
      { id: "Tim Burton / Gothic", label: "Tim Burton", desc: "Dark whimsical", bg: "from-slate-200 to-slate-400 dark:from-zinc-900 dark:to-black" },
      { id: "Retro Anime / 90s VHS", label: "Retro Anime", desc: "90s cel animation", bg: "from-pink-100 via-slate-100 to-slate-200 dark:from-pink-950/30 dark:via-zinc-900/20 dark:to-black" }
    ]
  }
];

const findGroupByStyleId = (id: string) => {
    return VISUAL_STYLE_GROUPS.findIndex(g => g.styles.some(s => s.id === id));
};

const getStyleGradient = (styleId: string) => {
    for (const group of VISUAL_STYLE_GROUPS) {
        const style = group.styles.find(s => s.id === styleId);
        if (style) return style.bg;
    }
    return "from-slate-200 to-slate-300 dark:from-zinc-900 dark:to-black"; 
};

const Step1Topic: React.FC<Props> = ({ onSubmit, isLoading, initialValues }) => {
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Korean');
  const [mainCategory, setMainCategory] = useState<string>('영화 (Movie)');
  const [subGenre, setSubGenre] = useState<string>('사이버펑크 SF (Cyberpunk Sci-Fi)');
  const [durationMin, setDurationMin] = useState(1);
  const [durationSec, setDurationSec] = useState(0);
  const [sceneDuration, setSceneDuration] = useState(5); 
  const [visualStyle, setVisualStyle] = useState('High-Quality Realism (DSLR)');
  const [activeStyleCategory, setActiveStyleCategory] = useState(0); 
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [uploadedStyleImage, setUploadedStyleImage] = useState<string | null>(null);
  const [userWorlds, setUserWorlds] = useState<WorldSetting[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<WorldSetting | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState<LyricSegment[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  useEffect(() => {
    if (initialValues) {
        if (initialValues.genre) {
            const parts = initialValues.genre.split(' - ');
            if (parts.length === 2 && GENRE_CATEGORIES[parts[0]]) {
                setMainCategory(parts[0]);
                setSubGenre(parts[1]);
            }
        }
        if (initialValues.visualStyle) {
            setVisualStyle(initialValues.visualStyle);
            const groupIdx = findGroupByStyleId(initialValues.visualStyle);
            if (groupIdx !== -1) setActiveStyleCategory(groupIdx);
            else if (initialValues.visualStyle.startsWith("Custom:")) setActiveStyleCategory(-1);
        }
    }
    const currentUser = getCurrentUser();
    if (currentUser) getUserWorlds(currentUser.email).then(setUserWorlds);
  }, [initialValues]);

  const handleWorldSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const worldId = e.target.value;
      if (!worldId) { setSelectedWorld(null); return; }
      const world = userWorlds.find(w => w.id === worldId);
      if (world) { 
          setSelectedWorld(world); 
          setVisualStyle(world.visualStyle); 
          const groupIdx = findGroupByStyleId(world.visualStyle);
          if (groupIdx !== -1) setActiveStyleCategory(groupIdx);
          else if (world.visualStyle.startsWith("Custom:")) setActiveStyleCategory(-1);
      }
  };

  const handleMainCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMain = e.target.value;
      setMainCategory(newMain);
      setSubGenre(GENRE_CATEGORIES[newMain].subs[0]);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return;
      setAudioFile(file);
      const reader = new FileReader();
      reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const extracted = await extractLyricsFromAudio(base64, file.type);
          setLyrics(extracted);
      };
      reader.readAsDataURL(file);
  };
  
  const handleStyleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsAnalyzingStyle(true);
      const reader = new FileReader();
      reader.onload = async () => {
          if (reader.result) {
              const base64 = reader.result as string;
              setUploadedStyleImage(base64);
              try {
                  const styleDescription = await analyzeImageStyle(base64);
                  setVisualStyle(`Custom: ${styleDescription}`);
              } catch (e) {
                  alert("Failed to analyze image style.");
              } finally {
                  setIsAnalyzingStyle(false);
              }
          }
      };
      reader.readAsDataURL(file);
  };

  const toggleDevice = (deviceName: string) => {
      setSelectedDevices(prev => {
          if (prev.includes(deviceName)) return prev.filter(d => d !== deviceName);
          return [...prev, deviceName];
      });
  };

  const combinedGenre = `${mainCategory} - ${subGenre}`;
  const totalDurationStr = `${durationMin}:${durationSec.toString().padStart(2, '0')}`;
  const estimatedScenes = Math.ceil(((durationMin * 60) + durationSec) / sceneDuration);
  const activeGradient = getStyleGradient(visualStyle);

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 space-y-8 animate-fade-in font-sans relative">
        {isLoading && (
            <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-black/95 flex flex-col items-center justify-center p-8 backdrop-blur-md animate-in fade-in duration-300">
                <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 border-4 border-slate-200 dark:border-zinc-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                    <SparklesIcon size={48} className="absolute inset-0 m-auto text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-300 dark:via-white dark:to-purple-300 mb-4 tracking-tight animate-pulse text-center">
                    Crafting Narrative...
                </h2>
                <div className="flex flex-col gap-2 items-center text-slate-500 dark:text-zinc-500 font-mono text-sm">
                    <p>Analyzing genre constraints...</p>
                    <p>Structuring key plot points...</p>
                </div>
            </div>
        )}

        <div className="text-center space-y-3 mb-10">
           <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-200 dark:via-white dark:to-purple-200 tracking-tighter drop-shadow-lg">
               CINEGEN AI
           </h1>
           <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg font-light tracking-wide">
               Transform your vision into a production-ready storyboard.
           </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl space-y-6 shadow-xl relative overflow-hidden transition-colors">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                 
                 <div className="flex items-center gap-2 mb-4">
                     <BookOpenIcon className="text-indigo-600 dark:text-indigo-400" size={24}/>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Narrative Core</h3>
                 </div>
                 
                 {userWorlds.length > 0 && (
                     <div className="space-y-3 mb-4 p-3 bg-slate-50 dark:bg-black rounded-xl border border-indigo-500/20">
                         <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block flex items-center gap-1">
                             <GlobeIcon size={12}/> World Setting (Optional)
                         </label>
                         <select 
                            value={selectedWorld?.id || ""} 
                            onChange={handleWorldSelect}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-500"
                         >
                             <option value="">-- No World Selected --</option>
                             {userWorlds.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                         </select>
                     </div>
                 )}

                 <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Genre</label>
                    <div className="grid grid-cols-1 gap-2">
                       <div className="relative">
                           <select value={mainCategory} onChange={handleMainCategoryChange} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm font-bold focus:border-indigo-500 outline-none appearance-none hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
                               {Object.keys(GENRE_CATEGORIES).map(cat => (
                                   <option key={cat} value={cat}>{cat.split('(')[0].trim()}</option>
                               ))}
                           </select>
                           <ChevronDownIcon size={16} className="absolute right-4 top-4 text-slate-500 dark:text-slate-500 pointer-events-none"/>
                       </div>
                       <div className="relative">
                           <select value={subGenre} onChange={(e) => setSubGenre(e.target.value)} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm font-medium focus:border-indigo-500 outline-none appearance-none hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
                               {GENRE_CATEGORIES[mainCategory].subs.map(sub => (
                                   <option key={sub} value={sub}>{sub}</option>
                               ))}
                           </select>
                           <ChevronDownIcon size={16} className="absolute right-4 top-4 text-slate-500 dark:text-slate-500 pointer-events-none"/>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Logline</label>
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="A detective discovers his partner is an AI..."
                        className="w-full min-h-[140px] bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none resize-none leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm shadow-inner"
                    />
                 </div>
                 
                 <div className="space-y-3 pt-2">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                         <MusicIcon size={12}/> Audio / Lyrics (Optional)
                     </label>
                     <div className="relative group">
                         <input type="file" accept="audio/*" onChange={handleAudioUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                         <div className={`w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex items-center gap-3 transition-colors ${audioFile ? 'border-green-500/50 bg-green-50 dark:bg-green-950/10' : 'hover:border-slate-300 dark:hover:border-zinc-700'}`}>
                             {audioFile ? (
                                 <>
                                     <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-full text-green-600 dark:text-green-400"><MusicIcon size={16}/></div>
                                     <div className="flex-1 overflow-hidden">
                                         <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{audioFile.name}</div>
                                         <div className="text-[10px] text-green-600 dark:text-green-400">{lyrics.length > 0 ? `${lyrics.length} Extracted` : "Ready"}</div>
                                     </div>
                                     <button onClick={(e) => { e.stopPropagation(); setAudioFile(null); setLyrics([]); }} className="text-slate-400 hover:text-red-500 transition-colors"><XIcon size={14}/></button>
                                 </>
                             ) : (
                                 <>
                                     <div className="p-2 bg-slate-200 dark:bg-zinc-900 rounded-full text-slate-500"><UploadCloudIcon size={16}/></div>
                                     <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Upload audio to sync</div>
                                 </>
                             )}
                         </div>
                     </div>
                 </div>

                 <div className="space-y-3 pt-2">
                     <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest block flex items-center gap-1">
                         <SparklesIcon size={12}/> Story Devices
                     </label>
                     <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-800 pr-1">
                         {Object.values(NARRATIVE_DEVICES).flatMap(cat => cat.devices).map(device => {
                             const isActive = selectedDevices.includes(device.name);
                             return (
                                 <button
                                     key={device.name}
                                     onClick={() => toggleDevice(device.name)}
                                     className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isActive ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-black border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-white'}`}
                                 >
                                     {device.name}
                                 </button>
                             )
                         })}
                     </div>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-8 space-y-6 flex flex-col h-full">
              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl flex flex-col h-full relative overflow-hidden shadow-xl transition-colors">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                 
                 <div className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <EyeIcon className="text-pink-600 dark:text-pink-400" size={24}/>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Visual Lens</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Define the aesthetic soul of your project.</p>
                        </div>
                        <div className="hidden sm:block text-right">
                             <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Selected Style</div>
                             <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-black text-xs font-bold text-slate-900 dark:text-white shadow-sm`}>
                                 <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${activeGradient}`}></span>
                                 {visualStyle.startsWith("Custom:") ? "Custom Analysis" : visualStyle}
                             </div>
                        </div>
                    </div>
                 </div>

                 <div className="px-6 pb-4">
                     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-800">
                        <button onClick={() => setActiveStyleCategory(-1)} className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${activeStyleCategory === -1 ? 'bg-pink-600 border-pink-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-black border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-pink-600 dark:hover:text-white'}`}>
                            <ImagePlusIcon size={14}/> AI Analysis
                        </button>
                        <div className="w-px bg-slate-200 dark:bg-zinc-800 mx-1 shrink-0 h-8 self-center"></div>
                        {VISUAL_STYLE_GROUPS.map((g, i) => (
                           <button key={i} onClick={() => setActiveStyleCategory(i)} className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${activeStyleCategory === i ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-black border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-indigo-600 dark:hover:text-white'}`}>
                              {g.icon} {g.name}
                           </button>
                        ))}
                     </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-black/40 min-h-[400px]">
                    {activeStyleCategory === -1 ? (
                        <div className="h-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl bg-white dark:bg-black group hover:border-pink-500/50 transition-all cursor-pointer relative">
                            <input type="file" accept="image/*" onChange={handleStyleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" disabled={isAnalyzingStyle}/>
                            {uploadedStyleImage ? (
                                <img src={uploadedStyleImage} className="w-64 h-64 object-cover rounded-xl shadow-xl mb-4" />
                            ) : (
                                <div className="p-6 bg-slate-100 dark:bg-zinc-900 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloudIcon size={40} className="text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors"/>
                                </div>
                            )}
                            <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-1">{isAnalyzingStyle ? "Analyzing..." : "Upload Reference Image"}</h4>
                            <p className="text-slate-500 text-sm max-w-xs text-center">AI extracts mood and lighting for generation.</p>
                            {isAnalyzingStyle && <Loader2Icon className="animate-spin text-pink-500 mt-4" size={32}/>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                           {VISUAL_STYLE_GROUPS[activeStyleCategory].styles.map(style => (
                               <button
                                   key={style.id}
                                   onClick={() => setVisualStyle(style.id)}
                                   className={`relative group rounded-xl overflow-hidden text-left transition-all duration-300 border ${visualStyle === style.id ? 'border-indigo-600 ring-2 ring-indigo-600/30 scale-105 shadow-xl z-10' : 'border-slate-200 dark:border-zinc-800 hover:border-indigo-400 hover:scale-[1.02]'}`}
                               >
                                   <div className={`h-16 w-full bg-gradient-to-br ${style.bg} relative`}>
                                       {visualStyle === style.id && <div className="absolute top-2 right-2 bg-white text-indigo-600 rounded-full p-1 shadow-md"><CheckIcon size={12} strokeWidth={4}/></div>}
                                   </div>
                                   <div className="p-3 bg-white dark:bg-zinc-950 h-full">
                                       <div className="font-bold text-xs text-slate-900 dark:text-white mb-1 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{style.label}</div>
                                       <div className="text-[10px] text-slate-500 line-clamp-2 leading-snug">{style.desc}</div>
                                   </div>
                               </button>
                           ))}
                        </div>
                    )}
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-6 items-center shadow-lg transition-colors">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-black px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800">
                <LanguagesIcon size={16} className="text-slate-400 dark:text-slate-400"/>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Language</span>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent text-slate-900 dark:text-white text-sm font-bold outline-none cursor-pointer">
                        <option>Korean</option>
                        <option>English</option>
                        <option>Japanese</option>
                    </select>
                </div>
            </div>

            <div className="w-px h-10 bg-slate-200 dark:bg-zinc-800 hidden md:block"></div>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-black px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800">
                <ClockIcon size={16} className="text-slate-400 dark:text-slate-400"/>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Duration</span>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" value={durationMin} onChange={(e) => setDurationMin(Math.max(0, parseInt(e.target.value) || 0))} className="bg-transparent w-8 text-right text-slate-900 dark:text-white text-sm font-bold outline-none p-0" />
                        <span className="text-xs text-slate-400 font-bold">m</span>
                        <input type="number" min="0" max="59" value={durationSec} onChange={(e) => setDurationSec(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} className="bg-transparent w-8 text-right text-slate-900 dark:text-white text-sm font-bold outline-none p-0" />
                        <span className="text-xs text-slate-400 font-bold">s</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full flex items-center gap-4 bg-slate-50 dark:bg-black px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800">
                <GaugeIcon size={16} className="text-slate-400"/>
                <div className="flex-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                        <span>Pacing: Fast</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{sceneDuration}s / cut</span>
                        <span>Slow</span>
                    </div>
                    <input type="range" min="3" max="15" step="1" value={sceneDuration} onChange={(e) => setSceneDuration(parseInt(e.target.value))} className="w-full accent-indigo-600 dark:accent-indigo-500 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded border border-slate-200 dark:border-zinc-800 min-w-[80px] text-center">
                    ~{estimatedScenes} Scenes
                </div>
            </div>

            <button 
              onClick={() => onSubmit(topic, language, combinedGenre, totalDurationStr, visualStyle, sceneDuration, lyrics, selectedWorld || undefined, selectedDevices)}
              disabled={isLoading || !topic}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-3 transition-all transform hover:scale-[1.02] md:ml-auto w-full md:w-auto justify-center"
            >
              {isLoading ? <Loader2Icon className="animate-spin" size={20} /> : <Wand2Icon size={20} />}
              <span className="tracking-wide uppercase">Generate</span>
            </button>
        </div>
    </div>
  );
};

export default Step1Topic;