import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type, Modality, ThinkingLevel } from "@google/genai";
import { VirtualModel, Message, AgentActionItem, ChatSession } from "../types";
import { getPersonalizationConfig, buildPersonalizationSystemInstruction } from "./personalizationService";
import { getActiveWorkspaceDeclarations, executeWorkspaceTool } from "./workspaceToolService";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

export const ai = new GoogleGenAI({ 
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const normalizeModelName = (modelName?: string): string => {
  if (!modelName) return 'gemini-3.8-flash';
  const clean = modelName.toLowerCase().trim();
  if (
    clean.includes('2.5-flash') ||
    clean.includes('1.5-flash') ||
    clean.includes('2.0-flash') ||
    clean.includes('gemini-pro') ||
    clean === 'gemini-flash' ||
    clean === 'gemini-3-pro-preview'
  ) {
    return 'gemini-3.8-flash';
  }
  return modelName;
};

// --- TTS Audio Helpers with Gemini Voice Models (gemini-3.8-flash-lite-tts) ---

export const GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede', 'Calliope', 'Leda'] as const;
export type GeminiVoiceName = typeof GEMINI_VOICES[number];

export const decodePCM16AudioData = (
  base64Data: string,
  audioContext: AudioContext,
  sampleRate: number = 24000
): AudioBuffer | null => {
  try {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const alignedLen = len - (len % 2);
    const bytes = new Uint8Array(alignedLen);
    for (let i = 0; i < alignedLen; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer, bytes.byteOffset, alignedLen / 2);
    const numChannels = 1;
    const frameCount = dataInt16.length;
    const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  } catch (err) {
    console.warn("PCM16 Audio decode error:", err);
    return null;
  }
};

/**
 * High-fidelity neural voice generation using Gemini TTS voice models (gemini-3.8-flash-lite-tts).
 * Replaces legacy browser speech synthesis with realistic human-grade voices.
 */
export const generateSpeechWithGemini = async (
  text: string,
  voiceName: string = 'Kore'
): Promise<string | null> => {
  const cleanText = text
    .replace(/\[CORRECTION_AUDIT\].*?\|\|CORRECTION_AUDIT\|\|/gs, '')
    .replace(/\|\|.*?\|\|/gs, '')
    .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
    .replace(/[#*`~_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: cleanText.slice(0, 3500) }]
        }
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.warn("Gemini voice model TTS request error:", error);
    return null;
  }
};

let activeTTSAudioContext: AudioContext | null = null;
let activeTTSSourceNode: AudioBufferSourceNode | null = null;

export const stopTextToSpeech = () => {
  if (activeTTSSourceNode) {
    try { activeTTSSourceNode.stop(); } catch (e) {}
    activeTTSSourceNode = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
};

export const playTextToSpeech = async (text: string, voiceName: string = 'Kore'): Promise<void> => {
  stopTextToSpeech();

  // 1. Prefer Gemini high-fidelity neural voice models
  try {
    const base64Audio = await generateSpeechWithGemini(text, voiceName);
    if (base64Audio && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!activeTTSAudioContext || activeTTSAudioContext.state === 'closed') {
        activeTTSAudioContext = new AudioCtx({ sampleRate: 24000 });
      } else if (activeTTSAudioContext.state === 'suspended') {
        await activeTTSAudioContext.resume();
      }

      const buffer = decodePCM16AudioData(base64Audio, activeTTSAudioContext, 24000);
      if (buffer) {
        return new Promise<void>((resolve) => {
          const source = activeTTSAudioContext!.createBufferSource();
          source.buffer = buffer;
          source.connect(activeTTSAudioContext!.destination);
          activeTTSSourceNode = source;

          source.onended = () => {
            activeTTSSourceNode = null;
            resolve();
          };
          source.start(0);
        });
      }
    }
  } catch (geminiTtsErr) {
    console.warn("Gemini neural voice model bypassed, attempting fallback:", geminiTtsErr);
  }

  // 2. Safe fallback if model API is unreachable or offline
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    const cleanText = text
      .replace(/\[CORRECTION_AUDIT\].*?\|\|CORRECTION_AUDIT\|\|/gs, '')
      .replace(/\|\|.*?\|\|/gs, '')
      .replace(/[#*`]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') resolve();
      else reject(e);
    };

    window.speechSynthesis.speak(utterance);
  });
};

// --- Image Generation ---

// --- Image Generation & Advanced Editing Studio ---

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
  styleName?: string;
  stylePrompt?: string;
  quality?: 'Standard' | 'HD' | 'Ultra Pro' | 'Cinema 8K';
  negativePrompt?: string;
  guidanceScale?: number;
  lightingMode?: 'Natural' | 'Cinematic Studio' | 'Golden Hour' | 'Cyberpunk Neon' | 'Dramatic Noir';
  cameraLens?: 'Standard 50mm' | 'Portrait 85mm Bokeh' | 'Wide 24mm' | 'Macro Close-Up';
}

export const generateSingleImage = async (
  optionsOrPrompt: GenerateImageOptions | string,
  extraOptions?: Partial<GenerateImageOptions> & { style?: string }
): Promise<string> => {
  let prompt = '';
  let aspectRatio: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' = '1:1';
  let stylePrompt: string | undefined;
  let quality: 'Standard' | 'HD' | 'Ultra Pro' | 'Cinema 8K' = 'HD';
  let negativePrompt: string | undefined;
  let lightingMode: string | undefined;
  let cameraLens: string | undefined;

  if (typeof optionsOrPrompt === 'string') {
    prompt = optionsOrPrompt.trim();
    if (extraOptions) {
      if (extraOptions.aspectRatio) aspectRatio = extraOptions.aspectRatio;
      if (extraOptions.stylePrompt) stylePrompt = extraOptions.stylePrompt;
      else if (extraOptions.style) stylePrompt = extraOptions.style;
      if (extraOptions.quality) quality = extraOptions.quality;
      if (extraOptions.negativePrompt) negativePrompt = extraOptions.negativePrompt;
      if (extraOptions.lightingMode) lightingMode = extraOptions.lightingMode;
      if (extraOptions.cameraLens) cameraLens = extraOptions.cameraLens;
    }
  } else if (typeof optionsOrPrompt === 'object' && optionsOrPrompt !== null) {
    prompt = (optionsOrPrompt.prompt || '').trim();
    if (optionsOrPrompt.aspectRatio) aspectRatio = optionsOrPrompt.aspectRatio;
    if (optionsOrPrompt.stylePrompt) stylePrompt = optionsOrPrompt.stylePrompt;
    if (optionsOrPrompt.quality) quality = optionsOrPrompt.quality;
    if (optionsOrPrompt.negativePrompt) negativePrompt = optionsOrPrompt.negativePrompt;
    if (optionsOrPrompt.lightingMode) lightingMode = optionsOrPrompt.lightingMode;
    if (optionsOrPrompt.cameraLens) cameraLens = optionsOrPrompt.cameraLens;
  }

  if (!prompt) {
    throw new Error("Prompt is required for image generation.");
  }

  const qualityToSizeMap: Record<string, string> = {
    'Standard': '512px',
    'HD': '1K',
    'Ultra Pro': '2K',
    'Cinema 8K': '2K'
  };
  const internalSize = qualityToSizeMap[quality] || '1K';

  let powerModifiers = '';
  if (quality === 'Cinema 8K') {
    powerModifiers += ', ultra-high fidelity masterpiece 8K resolution, dynamic range, crisp raytraced textures';
  } else if (quality === 'Ultra Pro') {
    powerModifiers += ', studio quality 4K resolution, ultra-fine details';
  }

  if (lightingMode && lightingMode !== 'Natural') {
    powerModifiers += `, ${lightingMode.toLowerCase()} lighting`;
  }

  if (cameraLens) {
    powerModifiers += `, captured with ${cameraLens.toLowerCase()} lens`;
  }

  if (negativePrompt?.trim()) {
    powerModifiers += ` (Avoid: ${negativePrompt.trim()})`;
  }

  const fullPrompt = stylePrompt ? `${stylePrompt}: ${prompt}${powerModifiers}` : `${prompt}${powerModifiers}`;

  // 1. Try primary image generation model: gemini-3.1-flash-image
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: { parts: [{ text: fullPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: internalSize as any,
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from primary model");
  } catch (error: any) {
    console.warn("Primary gemini-3.1-flash-image failed, trying gemini-3.1-flash-lite-image:", error?.message || error);
    
    // 2. Fallback to gemini-3.1-flash-lite-image
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (liteError: any) {
      console.warn("Secondary gemini-3.1-flash-lite-image failed, attempting pro image fallback:", liteError?.message || liteError);
    }

    // 3. Fallback to gemini-3-pro-image
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: '1K',
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image data generated across models");
    } catch (finalError: any) {
      console.error("Image Generation Critical Failure:", finalError);
      throw new Error(finalError?.message || error?.message || "Image generation failed. Please try a different prompt.");
    }
  }
};

export const generateImageWithQuality = async (
  prompt: string,
  quality: 'Standard' | 'HD' | 'Ultra Pro' | 'Cinema 8K' = 'HD',
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' = '1:1',
  stylePrompt?: string
): Promise<string> => {
  return generateSingleImage({
    prompt,
    quality,
    aspectRatio,
    stylePrompt
  });
};

export const generateBatchImages = async (
  options: GenerateImageOptions,
  count: number = 1
): Promise<string[]> => {
  const promises: Promise<string>[] = [];
  const variations = [
    '',
    ', alternative aesthetic angle and lighting',
    ', varied dynamic composition',
    ', unique complementary perspective'
  ];

  for (let i = 0; i < count; i++) {
    const variationPrompt = i === 0 ? options.prompt : `${options.prompt}${variations[i % variations.length]}`;
    promises.push(
      generateSingleImage({
        ...options,
        prompt: variationPrompt
      })
    );
  }

  const results = await Promise.allSettled(promises);
  const successfulImages: string[] = [];
  
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      successfulImages.push(r.value);
    }
  }

  if (successfulImages.length === 0) {
    throw new Error("Failed to generate batch images. Please check your prompt and try again.");
  }

  return successfulImages;
};

export interface EditImageParams {
  imageUrl: string; // data URL or pure base64
  mode: 'edit_message' | 'remove_object' | 'move_object' | 'perspective_shift' | 'area_select_edit' | 'extend_image' | 'imagine_scene' | string;
  instruction: string;
  targetObject?: string;
  movementDirection?: 'left' | 'center' | 'right' | 'up' | 'down';
  perspectiveType?: string;
  perspectiveAngles?: {
    rotateX: number; // pitch (-45 to 45 deg)
    rotateY: number; // yaw (-45 to 45 deg)
    scale: number;
    skewX?: number;
  };
  selectedArea?: {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    width: number; // percentage 0-100
    height: number; // percentage 0-100
    action: 'remove' | 'modify_or_add' | 'add' | 'modify';
  };
  quality?: 'Standard' | 'HD' | 'Ultra Pro' | 'Cinema 8K';
  gestureMaskBase64?: string;
  extendDirection?: string;
  extendRatio?: string;
}

export const editImageWithAI = async (params: EditImageParams): Promise<string> => {
  const { imageUrl, mode, instruction, targetObject, movementDirection, perspectiveType, perspectiveAngles, selectedArea } = params;

  // Extract pure base64 and mimeType from data URL if needed
  let base64Data = imageUrl;
  let mimeType = 'image/png';

  if (imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  // Construct comprehensive surgical AI edit instructions
  let finalPrompt = instruction;

  if (mode === 'area_select_edit' && selectedArea) {
    const areaCoords = `at roughly X:${Math.round(selectedArea.x)}%, Y:${Math.round(selectedArea.y)}%, width:${Math.round(selectedArea.width)}%, height:${Math.round(selectedArea.height)}% of the frame`;
    if (selectedArea.action === 'remove') {
      const target = targetObject || instruction || 'the object or person within this marked boundary';
      finalPrompt = `Surgically remove ${target} located specifically ${areaCoords}. Seamlessly inpaint, reconstruct, and blend the background behind this area with photorealistic texture, matching lighting, natural shadows, and accurate perspective, completely erasing all traces of the removed subject. Keep everything else outside this selected region unchanged.`;
    } else {
      // modify_or_add
      finalPrompt = `In the targeted area ${areaCoords}, perform the following modification or addition: "${instruction}". Seamlessly integrate and blend this new element or change into the scene, precisely matching the ambient lighting, shadows, colors, resolution, and camera perspective of the surrounding image.`;
    }
  } else if (mode === 'remove_object') {
    const target = targetObject || instruction || 'the selected object';
    finalPrompt = `Surgically remove ${target} from this image. Seamlessly inpaint and reconstruct the background behind it with realistic texture, matching lighting, natural shadows, and accurate perspective, completely erasing all traces of ${target}. Keep everything else in the image identical.`;
  } else if (mode === 'move_object') {
    const target = targetObject || 'the subject/object';
    const dir = movementDirection || 'center';
    finalPrompt = `Reposition and move ${target} in this image so it is positioned towards the ${dir} of the frame. Inpaint and seamlessly reconstruct the original area where ${target} was located to match the background environment. Ensure the moved subject retains their exact appearance, proportions, and casts realistic shadows consistent with the scene lighting.`;
  } else if (mode === 'perspective_shift') {
    let pDesc = 'shift the camera perspective to center the subject directly in the frame like iOS Center Stage';
    if (perspectiveType === 'custom_3d_drag' && perspectiveAngles) {
      const pitchDesc = perspectiveAngles.rotateX > 5 ? `tilted up by ${Math.round(perspectiveAngles.rotateX)}° (low-angle view)` :
                        perspectiveAngles.rotateX < -5 ? `tilted down by ${Math.round(Math.abs(perspectiveAngles.rotateX))}° (high-angle overhead view)` : 'level horizon';
      const yawDesc = perspectiveAngles.rotateY > 5 ? `rotated ${Math.round(perspectiveAngles.rotateY)}° to the right (viewed from right angle)` :
                      perspectiveAngles.rotateY < -5 ? `rotated ${Math.round(Math.abs(perspectiveAngles.rotateY))}° to the left (viewed from left angle)` : 'facing straight on';
      pDesc = `re-render and transform the 3D camera perspective of the entire scene with an interactive camera rotation of: pitch ${pitchDesc}, yaw ${yawDesc}, and scale ${perspectiveAngles.scale.toFixed(2)}x. Re-calculate the vanishing point, line convergence, perspective distortion, and ground plane shadows accordingly`;
    } else if (perspectiveType === 'right_to_center') {
      pDesc = 're-frame and change the camera perspective so the subject (currently on the right side) is positioned directly in the center of the frame, expanding the scene context on the right and balancing the visual perspective seamlessly, like iOS 27 smart re-framing';
    } else if (perspectiveType === 'left_to_center') {
      pDesc = 're-frame and change the camera perspective so the subject (currently on the left side) is positioned directly in the center of the frame with balanced camera framing';
    } else if (perspectiveType === 'wide_angle') {
      pDesc = 'change the camera perspective to an ultra-wide angle view, showing more of the surrounding environment and centering the subject in the wider frame';
    } else if (perspectiveType === 'low_angle') {
      pDesc = 'change the camera angle to a dramatic low-angle perspective looking upwards towards the subject';
    } else if (perspectiveType === 'high_angle') {
      pDesc = 'change the camera angle to a high-angle overhead view looking down at the subject';
    } else if (perspectiveType === 'three_quarter') {
      pDesc = 'rotate the camera perspective into a cinematic three-quarter side angle of the subject';
    }
    finalPrompt = `Re-frame and adjust the camera perspective of this scene: ${pDesc}. ${instruction ? `Additional directive: ${instruction}` : ''} Maintain photorealistic subject identity, consistent facial features, clothing, and scene lighting.`;
  } else {
    // edit_message
    finalPrompt = `Modify this image according to the following instruction: "${instruction}". Preserve the subject's core visual traits, quality, lighting, and background consistency where not explicitly modified.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          {
            text: finalPrompt
          }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image returned");
  } catch (error: any) {
    console.warn("Primary gemini-3.1-flash-image edit failed, trying flash-lite:", error.message);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: finalPrompt
            }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (liteError: any) {
      console.error("Secondary edit failed:", liteError.message);
    }
    throw new Error(`Image edit failed: ${error.message || 'Please try another prompt'}`);
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  return generateSingleImage({ prompt });
};

// --- Persona Generation ---

export const generatePersona = async (description: string): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an expert AI architect. Create a detailed persona for a virtual agent based on this description: "${description}".
      
      Return a valid JSON object. Do not include markdown code blocks.
      The fields required are:
      - name: Creative name for the agent
      - description: Short 1-sentence description
      - systemInstruction: Comprehensive system instructions defining personality, behavior, and rules.
      - knowledgeBase: A starting set of "memories", "facts" or "lore" this agent knows.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            systemInstruction: { type: Type.STRING },
            knowledgeBase: { type: Type.STRING },
          },
          required: ["name", "description", "systemInstruction", "knowledgeBase"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating persona:", error);
    throw error;
  }
};

// --- Model Knowledge Self-Learning ---

export const synthesizeAndLearnKnowledge = async (
  model: VirtualModel,
  recentMessages: Message[]
): Promise<{ learnedFacts: string[]; updatedKnowledgeBase: string }> => {
  try {
    const chatSnippet = recentMessages
      .slice(-10)
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `You are the master neural engine managing the virtual model "${model.name}".
The model currently has this internal knowledge base:
"""
${model.knowledgeBase || "(Empty)"}
"""

Recent conversation history with the user:
"""
${chatSnippet}
"""

Task:
Extract new, valuable, durable facts, user preferences, corrections, insights, or domain knowledge from this conversation that this virtual model should memorize and learn.
Synthesize these new learnings and provide an updated, consolidated knowledge base for the model.

Return a JSON object with:
- "learnedFacts": list of short bullet points representing the newly extracted knowledge items.
- "updatedKnowledgeBase": the consolidated full knowledge base incorporating both previous knowledge and newly learned information clearly and concisely.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            learnedFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            updatedKnowledgeBase: { type: Type.STRING }
          },
          required: ["learnedFacts", "updatedKnowledgeBase"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No learning output generated");
    return JSON.parse(text);
  } catch (error) {
    console.error("Auto-learning failed:", error);
    throw error;
  }
};

// --- Domain & Favicon Helpers ---
export const extractDomain = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const getFaviconUrl = (domainOrUrl: string): string => {
  const domain = extractDomain(domainOrUrl);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
};

// --- Main Chat Stream ---

export const streamGeminiResponse = async (
  modelConfig: VirtualModel,
  history: Message[],
  currentMessage: string,
  currentAttachment: { mimeType: string, data: string } | null,
  enableResearch: boolean,
  enableThinking: boolean,
  enableStudyMode: boolean,
  onChunk: (text: string) => void,
  onMetadata: (metadata: any) => void,
  onThoughtChunk?: (thought: string) => void,
  onActionItemOrSignal?: ((action: AgentActionItem) => void) | AbortSignal,
  maybeSignal?: AbortSignal
): Promise<string> => {
  const signal = (maybeSignal || (typeof onActionItemOrSignal === 'object' && onActionItemOrSignal && 'aborted' in onActionItemOrSignal ? onActionItemOrSignal : undefined)) as AbortSignal | undefined;
  const onActionItem = typeof onActionItemOrSignal === 'function' ? onActionItemOrSignal : undefined;
  
  // 1. Construct the model configuration with normalization
  const modelName = normalizeModelName(modelConfig.baseModel);
  
  // 2. Prepare System Instruction
  let fullSystemInstruction = `${modelConfig.systemInstruction}\n\n[INTERNAL KNOWLEDGE BASE]:\n${modelConfig.knowledgeBase}

[DOCUMENT & PRESENTATION CAPABILITIES]:
- You can draft comprehensive Word Documents (.docx) and PowerPoint Presentations (.pptx).
- When asked to create or draft slides or presentations, structure them with clear slide titles (# Slide 1: Title) and high-impact bullet points and notes so the user can directly export them via the built-in PowerPoint (.pptx) generator.
- When asked to draft reports, essays, proposals, or documentation, format them with clear hierarchical headings (#, ##, ###), bold highlights, and tables for one-click export into Microsoft Word (.docx).

[ARCHIVE & CODEBASE INSPECTION CAPABILITIES]:
- The application includes an interactive Archive & Code Inspector Studio that can unpack, inspect, edit, and repack ZIP and TAR (.tar, .tgz, .tar.gz) archives.
- When users provide archive file structures or ask you to inspect codebases, analyze the directory layout, detect issues or missing files, explain project structure, provide file fixes, and propose code additions.`;

  // Connected Workspace Agent Tools
  const workspaceDeclarations = getActiveWorkspaceDeclarations();
  if (workspaceDeclarations.length > 0) {
    fullSystemInstruction += `\n\n[CONNECTED GOOGLE WORKSPACE AGENT TOOLS]:
You have direct, autonomous, real-time access to the user's connected Google Workspace via function declarations:
${workspaceDeclarations.map(d => `- ${d.name}: ${d.description}`).join('\n')}

INSTRUCTIONS:
1. When the user asks you to read, list, search, or check emails, calendar events, Google Drive files, Google Sheets, Google Docs, or Google Tasks, call the relevant tool function directly.
2. When the user asks you to schedule an event, add a task, append a row/data, append to a doc, or send an email, call the relevant tool function.
3. Once you receive the tool response, synthesize a clear, helpful, factual answer for the user.`;
  }

  // Inject Active Personalization (Tone, Characteristics, Custom Instructions)
  const personalizationConfig = getPersonalizationConfig();
  const personalizationInstruction = buildPersonalizationSystemInstruction(personalizationConfig);
  if (personalizationInstruction) {
    fullSystemInstruction += `\n\n${personalizationInstruction}`;
  }

  if (enableStudyMode) {
    fullSystemInstruction += `
    
    [STUDY MODE ACTIVE]
    You are an expert, interactive tutor, mathematician, and educator. Your responses should be clear, detailed yet concise, prioritizing rigorous educational value.
    
    1. MATHEMATICS & FORMULAS (LaTeX): Always use standard LaTeX syntax for mathematical, scientific, physical, or statistical equations and symbols. Use \`$inline$\` for inline formulas (e.g. \`$E = mc^2$\`) and \`$$block$$\` for displayed equations.
    
    2. STEP-BY-STEP CALCULATIONS & SOLVERS: Whenever solving a math problem, numerical calculation, physics equation, statistics, matrix, derivative, integral, or financial equation, provide an interactive calculation card:
       FORMAT: ||CALC|| {"title": "Problem Title", "expression": "f(x) = ...", "result": "Exact and Approximate Result", "formula": "LaTeX formula", "steps": [{"step": 1, "label": "Initial Equation", "math": "...", "explanation": "..."}, {"step": 2, "label": "Substitution", "math": "...", "explanation": "..."}, {"step": 3, "label": "Final Solution", "math": "...", "explanation": "..."}], "variables": {"x": 4}, "graph": {"fn": "x^2 - 4*x + 3", "domain": [-5, 5]}} ||CALC||
       
    3. VISUALS: If a historical event, place, or concept would benefit from a visual aid, generate a visual description block.
       FORMAT: ||VISUAL|| {"prompt": "Detailed image generation prompt...", "title": "Short Cinematic Title", "caption": "1-sentence caption explaining the visual"} ||VISUAL||
       
    4. QUIZZES: If the user asks for a quiz, test, or practice, do NOT output plain text. Output a JSON block for the interactive UI.
       FORMAT: ||QUIZ|| {"title": "Quiz Title", "questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..."}]} ||QUIZ||
       
    5. VIDEOS: If a topic is complex, actively search for and provide YouTube links to high-quality educational videos using the googleSearch tool.
    `;
  }

  if (enableResearch) {
    fullSystemInstruction += `
    
    [RESEARCH & DEEP DIVE GROUNDING ACTIVE]
    You are in comprehensive Research & Deep Investigation Mode.
    
    1. RESEARCH INQUIRIES & QUESTIONS:
    Formulate and investigate 2-4 critical research sub-questions exploring technical details, historical background, counter-evidence, and future implications.
    
    2. DISCOVER & LINK VIDEOS AND IMAGES:
    Actively search for relevant, high-quality videos (such as YouTube educational videos, tutorials, tech talks, documentaries) and verified image/diagram links.
    When you find relevant videos or visual media, include them in an interactive block:
    FORMAT: ||MEDIA_LINKS|| {"title": "Discovered Videos & Visual Media", "items": [{"type": "video", "title": "Video title...", "url": "https://www.youtube.com/watch?v=...", "platform": "YouTube", "description": "Brief description of video..."}, {"type": "image", "title": "Image title...", "url": "https://...", "description": "Visual diagram or photo..."}]} ||MEDIA_LINKS||
    
    3. DEEP DIVE CONCLUSION:
    Always end your research with a synthesized, conclusive Deep Dive Conclusion block containing clear verdicts and key takeaways:
    FORMAT: ||DEEP_DIVE|| {"title": "Deep Dive Conclusion & Strategic Synthesis", "verdict": "Clear, direct 1-2 sentence core verdict", "keyTakeaways": ["Key takeaway 1...", "Key takeaway 2...", "Key takeaway 3..."], "criticalNuance": "Crucial caveats, risks, or contrasting viewpoints...", "confidence": 95} ||DEEP_DIVE||
    `;
  }
  const tools: any[] = [];
  if (enableResearch || enableStudyMode) {
    tools.push({ googleSearch: {} });
  }
  if (workspaceDeclarations.length > 0) {
    tools.push({ functionDeclarations: workspaceDeclarations });
  }

  // 4. Prepare Safety Settings
  let safetySettings = modelConfig.safetySettings || [];
  if (enableResearch) {
    safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];
  }

  // 5. Prepare Thinking Config
  let thinkingConfig: any = undefined;
  if (enableThinking) {
    thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH }; 
  }

  let fullText = "";
  let fullThought = "";
  const collectedSources: Map<string, { uri: string; title: string; domain: string; iconUrl: string; snippet?: string }> = new Map();

  try {
    // 6. Initialize Chat History
    const chatHistory = history
      .filter(m => m.role !== 'system')
      .map(m => {
        const content = (m.versions && m.currentVersionIndex !== undefined) 
          ? m.versions[m.currentVersionIndex] 
          : m.content;
          
        const parts: any[] = [{ text: content }];
        
        if (m.attachment) {
          parts.push({
            inlineData: {
              mimeType: m.attachment.mimeType,
              data: m.attachment.data
            }
          });
        }

        return {
          role: m.role,
          parts: parts
        };
      });

    const chatConfig: any = {
      systemInstruction: fullSystemInstruction,
      safetySettings: safetySettings,
      tools: tools.length > 0 ? tools : undefined,
      thinkingConfig: thinkingConfig,
    };
    if (tools.some(t => t.googleSearch) && tools.some(t => t.functionDeclarations)) {
      chatConfig.toolConfig = { includeServerSideToolInvocations: true };
    }

    const chat = ai.chats.create({
      model: modelName,
      config: chatConfig,
      history: chatHistory,
    });

    // 7. Send Message Stream with Function Calling loop
    const messageParts: any[] = [{ text: currentMessage }];
    if (currentAttachment) {
      messageParts.push({
        inlineData: {
          mimeType: currentAttachment.mimeType,
          data: currentAttachment.data
        }
      });
    }

    let activeStream: any = await chat.sendMessageStream({
      message: messageParts
    });

    let toolLoops = 0;
    while (activeStream && toolLoops < 5) {
      toolLoops++;
      let pendingFunctionCalls: any[] = [];

      for await (const chunk of activeStream) {
        if (signal?.aborted) {
          break;
        }

        const candidate = chunk.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        // Check for functionCalls in candidate parts or chunk.functionCalls
        const functionCalls = chunk.functionCalls || [];
        if (functionCalls.length > 0) {
          pendingFunctionCalls.push(...functionCalls);
        } else {
          for (const part of parts) {
            if ((part as any).functionCall) {
              pendingFunctionCalls.push((part as any).functionCall);
            }
          }
        }

        for (const part of parts) {
          if ((part as any).thought) {
            const t = (part as any).text || (typeof (part as any).thought === 'string' ? (part as any).thought : '');
            if (t) {
              fullThought += t;
              if (onThoughtChunk) onThoughtChunk(t);
            }
          }
        }

        // Extract text content
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          onChunk(chunkText);
        }

        // Extract Grounding Metadata (Search queries & actual sources)
        if (candidate?.groundingMetadata) {
          const meta = candidate.groundingMetadata;
          const searchQueries = meta.webSearchQueries || [];
          
          if (Array.isArray(meta.groundingChunks)) {
            for (const chunkItem of meta.groundingChunks) {
              const web = (chunkItem as any).web || chunkItem;
              if (web && web.uri) {
                const domain = extractDomain(web.uri);
                collectedSources.set(web.uri, {
                  uri: web.uri,
                  title: web.title || domain,
                  domain: domain,
                  iconUrl: getFaviconUrl(domain),
                });
              }
            }
          }

          const webSources = Array.from(collectedSources.values());
          onMetadata({
            groundingMetadata: {
              searchQueries,
              webSources,
              groundingChunks: meta.groundingChunks,
              searchEntryPoint: meta.searchEntryPoint
            },
            thought: fullThought || undefined
          });
        }
      }

      // If the model called workspace tools, execute them and feed back to continue streaming
      if (pendingFunctionCalls.length > 0 && !signal?.aborted) {
        const functionResponses: any[] = [];
        for (const call of pendingFunctionCalls) {
          const actionId = 'tool_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
          if (onActionItem) {
            onActionItem({
              id: actionId,
              type: 'workspace_tool',
              title: `Agent Tool: ${call.name}`,
              status: 'running',
              detail: typeof call.args === 'object' ? JSON.stringify(call.args).slice(0, 100) : String(call.args),
              timestamp: Date.now(),
              toolData: {
                toolName: call.name,
                args: call.args
              }
            });
          }

          const toolResult = await executeWorkspaceTool(call.name, call.args);

          if (onActionItem) {
            onActionItem({
              id: actionId,
              type: 'workspace_tool',
              title: `Agent Tool: ${call.name}`,
              status: 'completed',
              detail: typeof toolResult === 'string' ? toolResult.slice(0, 120) : JSON.stringify(toolResult).slice(0, 120),
              timestamp: Date.now(),
              toolData: {
                toolName: call.name,
                args: call.args,
                result: toolResult
              }
            });
          }

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: toolResult }
            }
          });
        }

        activeStream = await chat.sendMessageStream({
          message: functionResponses
        });
      } else {
        activeStream = null;
      }
    }

    // Final metadata dispatch
    if (fullThought || collectedSources.size > 0) {
      onMetadata({
        groundingMetadata: {
          webSources: Array.from(collectedSources.values()),
        },
        thought: fullThought || undefined
      });
    }

    return fullText;

  } catch (error) {
    if (signal?.aborted) {
        return fullText;
    }
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// --- Text Formatting & Manipulation Tools ---

export const formatTextWithGemini = async (
  originalText: string,
  action: 'shorten' | 'longer' | 'simplify' | 'bullets' | 'professional' | 'summarize',
  customDirective?: string
): Promise<string> => {
  let prompt = '';
  switch (action) {
    case 'shorten':
      prompt = `Rewrite and condense the following text to make it significantly shorter, punchy, and direct. Eliminate all redundant filler, verbose phrasing, and fluff while preserving all core facts and meaning:\n\n${originalText}`;
      break;
    case 'longer':
      prompt = `Expand and elaborate deeply on the following text. Provide rich explanatory context, concrete real-world examples, step-by-step depth, nuance, and comprehensive background:\n\n${originalText}`;
      break;
    case 'simplify':
      prompt = `Simplify the following text so that anyone can easily understand it (Explain Like I'm 5 / ELI5). Use clear everyday language, intuitive analogies, and remove confusing jargon:\n\n${originalText}`;
      break;
    case 'bullets':
      prompt = `Restructure and format the following text into clean, scannable bullet points with bold keywords and structured headers for high legibility:\n\n${originalText}`;
      break;
    case 'professional':
      prompt = `Polish and refine the following text to have executive, professional poise, sophisticated vocabulary, impeccable grammar, and dignified authority:\n\n${originalText}`;
      break;
    case 'summarize':
      prompt = `Provide a concise 2-sentence executive summary highlighting the essential conclusions of the following text:\n\n${originalText}`;
      break;
    default:
      prompt = `Refine the following text:\n\n${originalText}`;
  }

  if (customDirective) {
    prompt += `\n\nAdditional Directive: ${customDirective}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    return response.text?.trim() || originalText;
  } catch (error) {
    console.error('Text formatting failed:', error);
    throw error;
  }
};

// --- Council Mode Multi-Agent Deliberation Stream ---

export const streamCouncilDebateResponse = async (
  topic: string,
  onChunk: (text: string) => void,
  onThoughtChunk?: (thought: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  const councilSystemInstruction = `You are orchestrating the "AI Council" — an elite multi-agent panel where distinct expert agents deliberate, debate, challenge one another, and iteratively negotiate until reaching an authoritative, unanimous consensus agreement.

The 4 Council Members are:
1. 🧐 Dr. Marcus Vance (Analytical & Systems Lead): Rigorous logic, empirical data, technical correctness.
2. ⚖️ Elena Rostova (Devil's Advocate & Risk Auditor): Identifies edge cases, hidden traps, risks, counter-arguments.
3. 💡 Kai Takahashi (Creative Strategist & UX Visionary): Innovative lateral thinking, user empathy, high impact.
4. 🏛️ Council Arbiter (Supreme Synthesizer): Moderates the debate, resolves disagreements, and seals the final consensus agreement.

Structure your output in 3 distinct phases:
### 🏛️ Round 1: Initial Stances & Independent Analysis
Each agent presents their perspective on "${topic}".

### ⚔️ Round 2: Cross-Examination & Debate
Agents challenge and refine each other's points, addressing counter-arguments and concessions.

### 📜 Round 3: The Unified Consensus Agreement
The Council Arbiter synthesizes the agreed-upon solution, noting key compromises and the final actionable consensus.

At the very end of your response, output a structured JSON block enclosed in ||COUNCIL_DATA|| ... ||COUNCIL_DATA|| with:
{
  "topic": "${topic}",
  "rounds": 2,
  "consensusReached": true,
  "consensusSummary": "1-2 sentence executive consensus",
  "perspectives": [
    {
      "agentName": "Dr. Marcus Vance",
      "role": "Analytical & Systems Lead",
      "avatar": "MV",
      "color": "indigo",
      "initialStance": "Summary of initial stance...",
      "critique": "Key critique of other points...",
      "revisedStance": "Final aligned position..."
    },
    {
      "agentName": "Elena Rostova",
      "role": "Devil's Advocate & Risk Auditor",
      "avatar": "ER",
      "color": "amber",
      "initialStance": "Summary of initial stance...",
      "critique": "Key risks and objections identified...",
      "revisedStance": "Final aligned position..."
    },
    {
      "agentName": "Kai Takahashi",
      "role": "Creative Strategist & UX Visionary",
      "avatar": "KT",
      "color": "pink",
      "initialStance": "Summary of initial stance...",
      "critique": "User experience and opportunity critique...",
      "revisedStance": "Final aligned position..."
    }
  ],
  "finalAgreement": "The comprehensive final agreement agreed by all council members."
}`;

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: `Convene the AI Council to deliberate and reach a unanimous agreement on the following topic:\n\n"${topic}"`,
      config: {
        systemInstruction: councilSystemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH
        }
      }
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (signal?.aborted) break;
      
      const chunkText = chunk.text || '';
      fullText += chunkText;
      onChunk(fullText);

      // Capture thoughts if present
      const candidates = chunk.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if ((part as any).thought && onThoughtChunk) {
            onThoughtChunk((part as any).thought);
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    if (signal?.aborted) return '';
    console.error('Council debate stream failed:', error);
    throw error;
  }
};

/**
 * Correction Mode: Rigorous adversarial fact-checking and counter-research audit
 * to determine if existing research, claims, or citations are incorrect, outdated, or hallucinated.
 */
export const streamCorrectionAudit = async (
  targetContent: string,
  onChunk: (text: string) => void,
  onThoughtChunk?: (thought: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  const correctionPrompt = `You are an elite, independent Research Auditor and Adversarial Fact-Checker.
Your mission is to rigorously examine the following AI message to determine IF THE RESEARCH IS WRONG, outdated, misleading, exaggerated, or hallucinated.

TARGET RESEARCH & CLAIMS TO AUDIT:
"""
${targetContent}
"""

INSTRUCTIONS:
1. Cross-examine every load-bearing factual statement, statistic, claim, and source.
2. Search for counter-evidence, debunking reports, recent changes, or nuance.
3. Determine an overall audit verdict:
   - VERIFIED_ACCURATE (if all facts hold true)
   - MINOR_INACCURACIES (if mostly true with minor errors, exaggerations, or missing caveats)
   - CORRECTION_NEEDED (if there are significant inaccuracies or wrong conclusions)
4. Output the structured audit card block FIRST:
FORMAT: ||CORRECTION_AUDIT|| {"targetClaimSummary": "1-2 sentence summary of claims audited", "verdict": "VERIFIED_ACCURATE" | "MINOR_INACCURACIES" | "CORRECTION_NEEDED", "overallAccuracy": 90, "pointsChecked": [{"claim": "Specific claim made", "status": "accurate" | "disputed" | "incorrect", "evidence": "What verifiable facts say", "correction": "Accurate correction if needed"}], "conclusion": "Final auditor evaluation and corrective advice"} ||CORRECTION_AUDIT||

5. Follow with a clear, concise prose explanation:
### Research Audit Analysis
- Breakdown of verified points vs disputed points.
- Why the research was right or wrong.
- Actionable conclusions.`;

  try {
    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction: "You are an objective adversarial research auditor and fact-checker. Always tell the hard truth if an AI answer is incorrect.",
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      }
    });

    const responseStream = await chat.sendMessageStream({
      message: [{ text: correctionPrompt }]
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      if (signal?.aborted) break;

      const candidate = chunk.candidates?.[0];
      for (const part of candidate?.content?.parts || []) {
        if ((part as any).thought) {
          const t = (part as any).text || (typeof (part as any).thought === 'string' ? (part as any).thought : '');
          if (t && onThoughtChunk) onThoughtChunk(t);
        }
      }

      if (chunk.text) {
        fullText += chunk.text;
        onChunk(chunk.text);
      }
    }

    return fullText;
  } catch (error) {
    if (signal?.aborted) return '';
    console.error('Correction audit stream failed:', error);
    throw error;
  }
};

/**
 * Generates an executive AI summary of a chat session out-of-context
 */
export const generateChatSummary = async (sessionOrMessages: ChatSession | Message[], modelName?: string): Promise<string> => {
  const messages = Array.isArray(sessionOrMessages) ? sessionOrMessages : (sessionOrMessages?.messages || []);
  const title = Array.isArray(sessionOrMessages) ? 'Conversation' : (sessionOrMessages?.title || 'Untitled');
  if (!messages || messages.length === 0) {
    return 'This conversation has no messages yet to summarize.';
  }

  const conversationTranscript = messages
    .filter(m => m.content && m.content.trim())
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const summaryPrompt = `Please analyze this conversation and generate a structured, executive AI summary:

CONVERSATION TITLE: "${title}"
CONVERSATION TRANSCRIPT:
${conversationTranscript}

Provide a well-formatted Markdown summary with the following sections:
### 📌 Executive Overview
(1-2 concise sentences summarizing the core topic and objective of this discussion)

### 💡 Key Takeaways & Core Ideas
- (Bulleted list of key findings, decisions, technical insights, or arguments)

### ⚡ Action Items & Next Steps
- (Bulleted actionable list or recommended follow-up if applicable, or "None required")

### 🏷️ Topic Tags
#(tag1) #(tag2) #(tag3)`;

  try {
    const response = await ai.models.generateContent({
      model: modelName ? normalizeModelName(modelName) : 'gemini-3.8-flash',
      contents: summaryPrompt,
      config: {
        systemInstruction: "You are an expert executive summarizer. Synthesize conversations accurately, highlighting decisions, technical details, and key conclusions without fluff."
      }
    });

    return response.text || 'Unable to generate summary.';
  } catch (err: any) {
    console.error('Failed to generate chat summary:', err);
    throw new Error(err?.message || 'Failed to generate AI summary');
  }
};