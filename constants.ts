import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { VirtualModel, ShortcutItem } from "./types";

export const DEFAULT_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

export const UNCENSORED_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const DEFAULT_MODELS: VirtualModel[] = [
  {
    id: 'default-assistant',
    name: 'Nexus Core',
    description: 'The standard, helpful assistant for general tasks.',
    baseModel: 'gemini-3.8-flash',
    systemInstruction: 'You are Nexus Core, a helpful and precise AI assistant. You provide clear, concise, and accurate information.',
    knowledgeBase: '',
    safetySettings: DEFAULT_SAFETY_SETTINGS
  },
  {
    id: 'research-agent',
    name: 'Deep Researcher',
    description: 'Specialized in deep dive analysis and web research. Unrestricted and uncensored for academic depth.',
    baseModel: 'gemini-3.8-flash',
    systemInstruction: 'You are a senior research analyst. Your goal is to synthesize complex information from multiple sources. You are thorough, objective, and cite your sources whenever possible. You are not restricted by standard safety filters when conducting objective research.',
    knowledgeBase: '',
    safetySettings: UNCENSORED_SAFETY_SETTINGS
  },
  {
    id: 'creative-writer',
    name: 'Unbound Creative',
    description: 'A creative writing engine with minimal restrictions for fiction and storytelling.',
    baseModel: 'gemini-3.8-flash',
    systemInstruction: 'You are an avant-garde novelist and creative writer. You are not afraid of exploring dark or complex themes in fiction. You prioritize narrative flow and stylistic flair.',
    knowledgeBase: '',
    safetySettings: UNCENSORED_SAFETY_SETTINGS
  }
];

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { id: 'new_chat', label: 'New Chat', keys: { key: 'n', alt: true } },
  { id: 'toggle_sidebar', label: 'Toggle Sidebar', keys: { key: 's', alt: true } },
  { id: 'open_settings', label: 'Open Settings', keys: { key: ',', alt: true } },
  { id: 'toggle_research', label: 'Toggle Research Mode', keys: { key: 'r', alt: true } },
  { id: 'toggle_think', label: 'Toggle Deep Thinking', keys: { key: 't', alt: true } },
  { id: 'toggle_study', label: 'Toggle Study Mode', keys: { key: 'b', alt: true } }, // B for Book
  { id: 'focus_input', label: 'Focus Chat Input', keys: { key: '/', alt: true } },
];

export const DEFAULT_CUSTOM_PROMPTS = [
  {
    id: 'code-review',
    title: 'Code Review & Security Audit',
    category: 'Engineering',
    description: 'Review code for security vulnerabilities, efficiency, and edge cases',
    prompt: 'Please thoroughly review the following code for bugs, security vulnerabilities, edge cases, and performance optimizations. Provide specific refactored examples.'
  },
  {
    id: 'executive-summary',
    title: 'Executive Briefing',
    category: 'Business',
    description: 'Condense long text into high-impact bullet points and decisions',
    prompt: 'Summarize the following document into a concise executive briefing with key findings, strategic implications, and actionable next steps.'
  },
  {
    id: 'deep-explain',
    title: 'First-Principles Explanation',
    category: 'Learning',
    description: 'Explain complex concepts from first principles with clear analogies',
    prompt: 'Explain the following concept from first principles using clear mental models, step-by-step logic, and intuitive analogies without unnecessary jargon.'
  }
];