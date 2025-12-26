
export enum AppStep {
  TOPIC_INPUT = 'TOPIC_INPUT',
  CONCEPT_SELECTION = 'CONCEPT_SELECTION',
  ASSET_SETUP = 'ASSET_SETUP',
  STORY_DETAILS = 'STORY_DETAILS',
  PRODUCTION_DASHBOARD = 'PRODUCTION_DASHBOARD',
  DETAILS_REFINEMENT = 'DETAILS_REFINEMENT'
}

export interface User {
  email: string;
  name: string;
  password?: string;
  isAdmin?: boolean;
}

export interface WorldSetting {
  id: string;
  userId: string;
  title: string;
  genre: string;
  description?: string;
  visualStyle: string;
  characters: Character[];
  locations: LocationSetting[];
  createdAt: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  script: ProductionScript;
}

export interface Question {
  id: string;
  question: string;
  placeholder?: string;
  context?: string;
  suggestedAnswer?: string;
}

export interface Answer {
  questionId: string;
  answer: string;
}

export interface StoryConcept {
  id: string;
  title: string;
  logline: string;
  tone: string;
  visualStyle: string;
  genre?: string;
}

export type Gender = 'Male' | 'Female' | 'Neutral' | 'Non-Binary';

export interface Outfit {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isDefault?: boolean;
}

export interface Character {
  id?: string;
  name: string;
  gender: Gender;
  age?: string;
  race?: string;
  bodyType?: string;
  description: string;
  role: string;
  avatarUrl?: string;
  outfits?: Outfit[];
}

export interface LocationSetting {
  id?: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface GenerateQuestionsResponse {
  questions: Question[];
  characters: Character[];
  locations: LocationSetting[];
}

// Added LyricSegment interface for audio sync features
export interface LyricSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface Scene {
  sceneNumber: string; 
  location: string;
  time: string;
  actionDescription: string;
  narration?: string;
  dialogue: Array<{ speaker: string; line: string }>;
  cameraDirections: string;
  
  selectedCharacterId?: string;
  selectedOutfitId?: string;
  selectedLocationId?: string;

  cameraAngle?: string;
  cameraPosition?: string;
  cameraLens?: string;
  flowPrompt?: string; 
  transitionEffect?: string; 

  visualPrompt: string; 
  generatedImageUrl?: string;
  isGeneratingImage?: boolean;
  generationError?: string | boolean; 
  
  videoPrompt?: string; 
  generatedVideoUrl?: string;
  isGeneratingVideo?: boolean;
  videoGenerationError?: string; 
}

export interface ProductionScript {
  title: string;
  genre: string;
  synopsis: string;
  selectedVisualStyle: string;
  aspectRatio: string;
  characters: Character[];
  locations?: LocationSetting[];
  scenes: Scene[];
}