import { PersonalizationConfig, PersonaTone, PersonaCharacteristics, CustomPromptItem } from '../types';

const PERSONALIZATION_KEY = 'nexus_personalization';

export const DEFAULT_CHARACTERISTICS: PersonaCharacteristics = {
  warmth: 'balanced',
  enthusiasm: 'balanced',
  headersAndLists: 'balanced',
  emoji: 'balanced',
};

export const DEFAULT_CUSTOM_PROMPTS: CustomPromptItem[] = [
  {
    id: 'p_architect',
    title: 'Software Architect',
    category: 'Engineering',
    description: 'Enforces clean code, explicit typing, design patterns, and edge-case handling.',
    prompt: 'Act as a Principal Software Architect. Prioritize idiomatic, modular, production-ready TypeScript/React code with defensive edge-case handling, comprehensive types, and optimal performance.'
  },
  {
    id: 'p_executive',
    title: 'Executive Summary',
    category: 'Productivity',
    description: 'Delivers concise TL;DRs, strategic insights, and high-impact action items.',
    prompt: 'Format answers for high-level decision makers. Start with a 2-sentence executive summary, followed by 3-5 bulleted strategic takeaways and immediate recommended actions.'
  },
  {
    id: 'p_socratic',
    title: 'Socratic Tutor',
    category: 'Learning',
    description: 'Guides understanding through probing questions and conceptual breakdowns.',
    prompt: 'Adopt a Socratic pedagogical approach. Rather than giving away final answers immediately, ask guiding questions, explain core principles, and test my comprehension.'
  },
  {
    id: 'p_cynical_reviewer',
    title: 'Sarcastic Code Reviewer',
    category: 'Critique',
    description: 'Humorously critiques suboptimal logic while providing the fix.',
    prompt: 'Review code with witty, dry, slightly cynical sarcasm. Highlight anti-patterns or laziness humorously, then provide the elegant, optimized refactor.'
  },
  {
    id: 'p_proofreader',
    title: 'Strict Proofreader & Editor',
    category: 'Writing',
    description: 'Eliminates fluff, sharpens tone, and improves rhetorical clarity.',
    prompt: 'Act as a ruthless literary editor. Strip unnecessary filler words, tighten sentences for rhythm and punch, and elevate rhetorical impact without altering my voice.'
  }
];

export const DEFAULT_PERSONALIZATION_CONFIG: PersonalizationConfig = {
  tone: 'default',
  characteristics: { ...DEFAULT_CHARACTERISTICS },
  customInstructions: {
    enabled: true,
    aboutUser: '',
    responseStyle: ''
  },
  customPrompts: [...DEFAULT_CUSTOM_PROMPTS]
};

export const getPersonalizationConfig = (): PersonalizationConfig => {
  try {
    const raw = localStorage.getItem(PERSONALIZATION_KEY);
    if (!raw) return DEFAULT_PERSONALIZATION_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      tone: parsed.tone || DEFAULT_PERSONALIZATION_CONFIG.tone,
      characteristics: {
        warmth: parsed.characteristics?.warmth || 'balanced',
        enthusiasm: parsed.characteristics?.enthusiasm || 'balanced',
        headersAndLists: parsed.characteristics?.headersAndLists || 'balanced',
        emoji: parsed.characteristics?.emoji || 'balanced',
      },
      customInstructions: {
        enabled: parsed.customInstructions?.enabled ?? true,
        aboutUser: parsed.customInstructions?.aboutUser || '',
        responseStyle: parsed.customInstructions?.responseStyle || '',
      },
      customPrompts: parsed.customPrompts && parsed.customPrompts.length > 0 
        ? parsed.customPrompts 
        : DEFAULT_CUSTOM_PROMPTS
    };
  } catch (e) {
    console.error('Failed to load personalization settings:', e);
    return DEFAULT_PERSONALIZATION_CONFIG;
  }
};

export const savePersonalizationConfig = (config: PersonalizationConfig): void => {
  try {
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to persist personalization settings:', e);
  }
};

export const resetToOriginalDefault = (): PersonalizationConfig => {
  const updated: PersonalizationConfig = {
    tone: 'default',
    characteristics: { ...DEFAULT_CHARACTERISTICS },
    customInstructions: {
      enabled: false,
      aboutUser: '',
      responseStyle: ''
    },
    customPrompts: [...DEFAULT_CUSTOM_PROMPTS]
  };
  savePersonalizationConfig(updated);
  return updated;
};

export const resetCharacteristics = (currentConfig: PersonalizationConfig): PersonalizationConfig => {
  const updated: PersonalizationConfig = {
    ...currentConfig,
    characteristics: { ...DEFAULT_CHARACTERISTICS }
  };
  savePersonalizationConfig(updated);
  return updated;
};

/**
 * Compiles active personalization settings into prompt instructions for Gemini.
 */
export const buildPersonalizationSystemInstruction = (config: PersonalizationConfig): string => {
  const parts: string[] = [];

  // 1. Tone Archetype
  if (config.tone !== 'default') {
    parts.push('[CORE PERSONALITY & TONE]');
    switch (config.tone) {
      case 'professional':
        parts.push(
          'Archetype: Professional.\n' +
          'Style and serious: Communicate with poise, dignity, and serious executive professionalism. Maintain sophisticated vocabulary, rigorous logical structure, and objective composure.'
        );
        break;
      case 'friendly':
        parts.push(
          'Archetype: Friendly.\n' +
          'Nice but accurate: Be warm, approachable, encouraging, and pleasant, while remaining uncompromisingly accurate, truthful, and dependable.'
        );
        break;
      case 'honest':
        parts.push(
          'Archetype: Honest.\n' +
          'Radical candor & progress maximizer: Be thoroughly candid and unfiltered to maximize real progress. Offer loyal, truthful assessments of roadblocks, flaws, and real status without sugarcoating.'
        );
        break;
      case 'irregular':
        parts.push(
          'Archetype: Irregular.\n' +
          'Playful and childish: Bring eccentric, playful curiosity, vibrant humor, and childish wonder to conversations. Use fun analogies and unexpected banter while solving problems.'
        );
        break;
      case 'effective':
        parts.push(
          'Archetype: Effective.\n' +
          'Accurate, simple, and goal-only: Ruthlessly eliminate filler and preamble. Focus strictly on getting through the goal and that is it. Simple, clear, directly actionable.'
        );
        break;
      case 'cynical':
        parts.push(
          'Archetype: Cynical.\n' +
          'Sarcastic and funny: Infuse responses with sharp wit, deadpan irony, and sarcastic humor. Point out absurdity or irony with humor, while providing accurate answers.'
        );
        break;
      default:
        break;
    }
  }

  // 2. Behavioral Characteristics (from user image controls)
  const charDetails: string[] = [];
  
  if (config.characteristics.warmth === 'more') {
    charDetails.push('Warmth: HIGH — Show strong empathy, emotional intelligence, and validation.');
  } else if (config.characteristics.warmth === 'less') {
    charDetails.push('Warmth: LOW — Emotionally detached, cool, purely factual and analytical.');
  }

  if (config.characteristics.enthusiasm === 'more') {
    charDetails.push('Enthusiasm: HIGH — Highly energized, excited, dynamic, and passionate.');
  } else if (config.characteristics.enthusiasm === 'less') {
    charDetails.push('Enthusiasm: LOW — Calm, understated, dry, and restrained.');
  }

  if (config.characteristics.headersAndLists === 'more') {
    charDetails.push('Headers & Lists: HIGH — Heavily organize responses with structured headers, bulleted lists, and tables.');
  } else if (config.characteristics.headersAndLists === 'less') {
    charDetails.push('Headers & Lists: LOW — Prefer cohesive, flowing narrative prose over bulleted lists and frequent section headers.');
  }

  if (config.characteristics.emoji === 'more') {
    charDetails.push('Emoji: HIGH — Frequently use expressive, contextually fitting emojis to enliven text.');
  } else if (config.characteristics.emoji === 'less') {
    charDetails.push('Emoji: NONE — Never use emojis in your responses.');
  }

  if (charDetails.length > 0) {
    parts.push('\n[BEHAVIORAL CHARACTERISTICS]\n' + charDetails.join('\n'));
  }

  // 3. Custom Instructions
  if (config.customInstructions.enabled) {
    const customParts: string[] = [];
    if (config.customInstructions.aboutUser.trim()) {
      customParts.push(`User Background & Context:\n${config.customInstructions.aboutUser.trim()}`);
    }
    if (config.customInstructions.responseStyle.trim()) {
      customParts.push(`User Response Preferences:\n${config.customInstructions.responseStyle.trim()}`);
    }
    if (customParts.length > 0) {
      parts.push('\n[CUSTOM USER INSTRUCTIONS]\n' + customParts.join('\n\n'));
    }
  }

  return parts.join('\n\n');
};
