
import { GoogleGenAI, Type } from "@google/genai";
import { StoryConcept, ProductionScript, Character, GenerateQuestionsResponse, LocationSetting, Scene, WorldSetting, Outfit, LyricSegment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_TEXT = "gemini-3-flash-preview";
const MODEL_IMAGE = "gemini-2.5-flash-image";
const MODEL_VIDEO = "veo-3.1-fast-generate-preview";

const cleanJSON = (text: string): string => {
  if (!text) return "";
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
};

const repairTruncatedJSON = (jsonString: string): string => {
  let trimmed = jsonString.trim();
  if (trimmed.match(/,\s*$/)) trimmed = trimmed.replace(/,\s*$/, '');
  const stack: string[] = [];
  let insideString = false;
  let escape = false;
  for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (insideString) {
          if (char === '\\') escape = !escape;
          else if (char === '"' && !escape) insideString = false;
          else escape = false;
      } else {
          if (char === '"') insideString = true;
          else if (char === '{') stack.push('}');
          else if (char === '[') stack.push(']');
          else if (char === '}' || char === ']') {
              if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
          }
      }
  }
  if (insideString) trimmed += '"';
  while (stack.length > 0) trimmed += stack.pop();
  return trimmed;
};

export const generateInitialConcepts = async (topic: string, language: string, genre: string, duration: string, visualStyle: string, lyrics?: LyricSegment[], world?: WorldSetting, devices?: string[]): Promise<StoryConcept[]> => {
  const lyricsContext = lyrics ? ` Lyrics Context: ${JSON.stringify(lyrics)}.` : "";
  const worldContext = world ? ` World Setting Context: ${JSON.stringify(world)}.` : "";
  const devicesContext = devices && devices.length > 0 ? ` Required Story Devices: ${devices.join(', ')}.` : "";
  
  const prompt = `ROLE: Professional Film Director.
TASK: Develop 3 highly creative and distinct cinematic story concepts based on the following:
Topic/Logline: ${topic}
Genre: ${genre}
Visual Style: ${visualStyle}
Language: ${language}
Target Duration: ${duration}
${lyricsContext}${worldContext}${devicesContext}

OUTPUT: Return exactly 3 concepts in a JSON array. Each concept must have:
- id: a unique string
- title: engaging movie title
- logline: a 3-4 sentence detailed synopsis
- tone: emotional atmosphere
- visualStyle: visual aesthetic description
- genre: specific sub-genre`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              logline: { type: Type.STRING },
              tone: { type: Type.STRING },
              visualStyle: { type: Type.STRING },
              genre: { type: Type.STRING }
            },
            required: ["id", "title", "logline", "tone", "visualStyle"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(repairTruncatedJSON(cleanJSON(text)));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error in generateInitialConcepts:", error);
    return [];
  }
};

export const generateQuestions = async (topic: string, concept: StoryConcept, language: string, visualStyle: string): Promise<GenerateQuestionsResponse> => {
  const prompt = `ROLE: Lead Concept Artist & Screenwriter.
CONTEXT: We are developing assets for a project titled "${concept.title}".
SYNOPSIS: ${concept.logline}
GENRE: ${concept.genre}
VISUAL STYLE: ${visualStyle}
LANGUAGE: ${language}

TASK: 
1. Generate 7 core narrative pillar questions that define the story's depth.
2. Define 3 main characters with extremely detailed VISUAL and PERSONALity profiles.
3. Define 2 key locations with atmospheric and architectural details.

OUTPUT: Return valid JSON matching the responseSchema.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  placeholder: { type: Type.STRING },
                  suggestedAnswer: { type: Type.STRING }
                }
              }
            },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  gender: { type: Type.STRING },
                  age: { type: Type.STRING },
                  race: { type: Type.STRING },
                  bodyType: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            locations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            }
          },
          required: ["questions", "characters", "locations"]
        }
      }
    });

    const parsed = JSON.parse(repairTruncatedJSON(cleanJSON(response.text || "{}")));
    return {
      questions: (Array.isArray(parsed.questions) ? parsed.questions : []).map((q: any) => ({ ...q, id: crypto.randomUUID() })),
      characters: (Array.isArray(parsed.characters) ? parsed.characters : []).map((c: any) => ({ 
        ...c, 
        id: crypto.randomUUID(), 
        gender: c.gender || 'Neutral',
        outfits: [] 
      })),
      locations: (Array.isArray(parsed.locations) ? parsed.locations : []).map((l: any) => ({ ...l, id: crypto.randomUUID() }))
    };
  } catch (error) { 
    console.error("Error generating initial asset info:", error);
    return { questions: [], characters: [], locations: [] }; 
  }
};

export const generateProductionScript = async (concept: StoryConcept, qaPairs: any[], finalCharacters: Character[], finalLocations: LocationSetting[], language: string, visualStyle: string, aspectRatio: string, duration: string, sceneDuration: number, lyrics?: LyricSegment[]): Promise<ProductionScript> => {
  const lyricsContext = lyrics ? ` Lyrics: ${JSON.stringify(lyrics)}.` : "";
  const prompt = `ROLE: Professional Screenwriter.
TASK: Generate a sequential production script (scenes) for "${concept.title}".
STYLE: ${visualStyle}. LANGUAGE: ${language}. RATIO: ${aspectRatio}. 
PACING: ${sceneDuration}s per scene. TOTAL DURATION: ${duration}.
CONTEXT: ${JSON.stringify(qaPairs)}
CHARACTERS: ${JSON.stringify(finalCharacters.map(c => ({ name: c.name, role: c.role })))}
LOCATIONS: ${JSON.stringify(finalLocations.map(l => l.name))}
${lyricsContext}

OUTPUT: Return valid JSON with a "scenes" array. Each scene MUST include:
- sceneNumber
- location (name from the list)
- time (Day/Night)
- actionDescription
- dialogue (array of {speaker, line})
- visualPrompt (detailed image generation prompt for this specific shot)
- videoPrompt (motion description)`;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(repairTruncatedJSON(cleanJSON(response.text || "{}")));
    return { 
      ...data, 
      scenes: Array.isArray(data.scenes) ? data.scenes : [],
      characters: finalCharacters, 
      locations: finalLocations, 
      selectedVisualStyle: visualStyle, 
      aspectRatio 
    };
  } catch (error) { 
    console.error("Script generation failed:", error);
    throw new Error("Script generation failed."); 
  }
};

/**
 * Common image generation logic to handle candidate parsing consistently
 */
const parseImageResponse = (response: any, fallbackErrorPrefix: string): string => {
  const candidate = response.candidates?.[0];
  if (!candidate) throw new Error(`${fallbackErrorPrefix}: No response candidates returned by AI.`);

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(`${fallbackErrorPrefix}: AI stopped generating (Reason: ${candidate.finishReason}).`);
  }

  const parts = candidate.content?.parts;
  if (!parts) throw new Error(`${fallbackErrorPrefix}: Candidate content is empty.`);

  const imagePart = parts.find((p: any) => p.inlineData);
  if (imagePart?.inlineData) {
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }
  
  const textPart = parts.find((p: any) => p.text);
  if (textPart?.text) {
    const lowerText = textPart.text.toLowerCase();
    // Check if the text is just a conversational confirmation
    if (lowerText.includes("here is") || lowerText.includes("sure") || lowerText.includes("absolutely") || lowerText.includes("request")) {
       throw new Error(`${fallbackErrorPrefix}: AI returned text confirmation instead of image data. Please try again.`);
    }
    throw new Error(`${fallbackErrorPrefix}: ${textPart.text}`);
  }
  
  throw new Error(`${fallbackErrorPrefix}: Unknown failure. No image data or descriptive text found.`);
};

export const generateStoryboardImage = async (prompt: string, style: string, context: string, aspectRatio: string): Promise<string> => {
  const fullPrompt = `Cinematic Film Frame.
Shot Description: ${prompt}
Visual Context: ${context}
Artistic Style: ${style}
Quality: masterpiece, cinematic lighting.
Output: IMAGE ONLY. NO TEXT.`;
  
  const response = await ai.models.generateContent({
    model: MODEL_IMAGE,
    contents: { parts: [{ text: fullPrompt }] },
    config: { 
      imageConfig: { aspectRatio: aspectRatio as any },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    }
  });

  return parseImageResponse(response, "Storyboard generation failed");
};

export const generateCharacterPortrait = async (name: string, gender: string, description: string, style: string, traits: any, ref?: string): Promise<string> => {
  const prompt = `Cinematic character portrait.
Subject: ${name} (${gender})
Visual Description: ${description}
Traits: ${JSON.stringify(traits)}
Style: ${style}
Output: IMAGE ONLY. NO TEXT.`;

  const parts: any[] = [{ text: prompt }];
  if (ref && ref.includes('base64,')) {
    try {
      const mime = ref.split(';')[0].split(':')[1];
      parts.unshift({ inlineData: { mimeType: mime, data: ref.split(',')[1] } });
    } catch (e) {
      console.warn("Failed to attach reference image to portrait generation:", e);
    }
  }

  const response = await ai.models.generateContent({ 
    model: MODEL_IMAGE, 
    contents: { parts }, 
    config: { 
      imageConfig: { aspectRatio: "1:1" },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    } 
  });

  return parseImageResponse(response, "Portrait generation failed");
};

export const generateLocationImage = async (name: string, description: string, style: string, ref?: string): Promise<string> => {
  const prompt = `Wide cinematic landscape image.
Subject: ${name}
Visual Details: ${description || 'Atmospheric scenery'}
Style: ${style}
Output: IMAGE ONLY. NO TEXT.`;

  const parts: any[] = [{ text: prompt }];
  if (ref && ref.includes('base64,')) {
    try {
      const mime = ref.split(';')[0].split(':')[1];
      parts.unshift({ inlineData: { mimeType: mime, data: ref.split(',')[1] } });
    } catch (e) {
      console.warn("Failed to attach reference image to location generation:", e);
    }
  }

  const response = await ai.models.generateContent({ 
    model: MODEL_IMAGE, 
    contents: { parts }, 
    config: { 
      imageConfig: { aspectRatio: "16:9" },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    } 
  });

  return parseImageResponse(response, "Location generation failed");
};

export const extractLyricsFromAudio = async (base64: string, mimeType: string): Promise<LyricSegment[]> => {
  const prompt = "Extract lyrics from this audio with timestamps in JSON format: [{startTime: number, endTime: number, text: string}]";
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    const parsed = JSON.parse(repairTruncatedJSON(cleanJSON(response.text || "[]")));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) { return []; }
};

export const analyzeImageStyle = async (base64: string): Promise<string> => {
  const data = base64.includes('base64,') ? base64.split(',')[1] : base64;
  const prompt = "Analyze the visual style of this image. Describe lighting, texture, color palette, and artistic style in one descriptive sentence for prompt engineering.";
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data } },
          { text: prompt }
        ]
      }
    });
    return response.text?.trim() || "Cinematic realism";
  } catch (error) { return "Cinematic realism"; }
};

export const regenerateDetailsAnswer = async (question: string, concept: StoryConcept, language: string): Promise<string> => {
  const prompt = `Project: ${concept.title}. Synopsis: ${concept.logline}. Pillar Question: ${question}. Language: ${language}. Provide a creative and structural answer.`;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt
    });
    return response.text?.trim() || "";
  } catch (error) { return ""; }
};

export const generateOutfitImage = async (charName: string, gender: string, description: string, style: string, traits: any): Promise<string> => {
  const prompt = `Cinematic wardrobe concept image.
Subject: ${charName} (${gender})
Visual Description: ${description}
Traits: ${JSON.stringify(traits)}
Style: ${style}
Output: IMAGE ONLY. NO TEXT.`;
  
  const response = await ai.models.generateContent({
    model: MODEL_IMAGE,
    contents: { parts: [{ text: prompt }] },
    config: { 
      imageConfig: { aspectRatio: "3:4" },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    }
  });

  return parseImageResponse(response, "Outfit generation failed");
};

export const suggestStoryAssets = async (concept: StoryConcept, existingChars: Character[], language: string): Promise<any> => {
    const prompt = `Based on the concept "${concept.title}" (${concept.logline}), suggest 3 wardrobe outfits for each character: ${existingChars.map(c => c.name).join(', ')} and 3 additional cinematic locations. JSON format: { outfitSuggestions: { [charName: string]: Outfit[] }, locationSuggestions: LocationSetting[] }. Lang: ${language}`;
    try {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(repairTruncatedJSON(cleanJSON(response.text || "{}")));
      return {
        outfitSuggestions: parsed.outfitSuggestions || {},
        locationSuggestions: Array.isArray(parsed.locationSuggestions) ? parsed.locationSuggestions : []
      };
    } catch (error) { return { outfitSuggestions: {}, locationSuggestions: [] }; }
};

export const regenerateConceptsWithFeedback = async (topic: string, language: string, genre: string, duration: string, feedback: string): Promise<StoryConcept[]> => {
    const prompt = `Topic: ${topic}. Genre: ${genre}. Duration: ${duration}. Lang: ${language}. User Feedback: ${feedback}. Regenerate 3 improved story concepts in JSON format.`;
    try {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(repairTruncatedJSON(cleanJSON(response.text || "[]")));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) { return []; }
};
