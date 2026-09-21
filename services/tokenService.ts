import { Message, VirtualModel } from '../types';

/**
 * Gemini Token Counter Service
 * Provides accurate token estimation based on Google Gemini tokenization rules:
 * - Average English text: ~3.8 to 4 characters per token
 * - Code & Markdown syntax: ~3 to 3.5 characters per token
 * - Special control tokens & whitespace
 */

export interface TokenStats {
  promptTokens: number;
  userPromptTokens: number;
  responseTokens: number;
  modelResponseTokens: number;
  knowledgeTokens: number;
  systemKnowledgeTokens: number;
  draftTokens: number;
  totalTokens: number;
  maxContextTokens: number;
  contextUsagePercent: number;
  percentageUsed: number;
  estimatedCostUsd: string;
  rawCostUsd: number;
}

/**
 * Returns the maximum context window token limit for a given Gemini model
 */
export function getModelContextLimit(modelIdOrBase?: string): number {
  const model = (modelIdOrBase || '').toLowerCase();
  
  if (model.includes('pro') || model.includes('gemini-3')) {
    return 2097152; // 2.0M tokens
  }
  if (model.includes('flash') || model.includes('2.5') || model.includes('2.0') || model.includes('1.5')) {
    return 1048576; // 1.0M tokens
  }
  return 1048576; // Default 1M
}

/**
 * Estimates token count for a text string based on content type heuristics
 */
export function estimateTokensForText(text: string): number {
  if (!text || text.length === 0) return 0;

  // Code blocks tend to have higher token density (~3.2 chars/token)
  const codeBlockMatches = text.match(/```[\s\S]*?```/g);
  let codeChars = 0;
  if (codeBlockMatches) {
    for (const block of codeBlockMatches) {
      codeChars += block.length;
    }
  }

  const proseChars = Math.max(0, text.length - codeChars);

  const proseTokens = Math.ceil(proseChars / 3.9);
  const codeTokens = Math.ceil(codeChars / 3.2);

  // Add baseline message framing tokens (role tags, separators)
  return Math.max(1, proseTokens + codeTokens + 3);
}

/**
 * Estimates token stats for an entire conversation session
 */
export function calculateSessionTokens(
  messages: Message[],
  activeModel?: VirtualModel,
  currentDraft: string = ''
): TokenStats {
  let promptTokens = 0;
  let responseTokens = 0;

  for (const msg of messages) {
    const tokens = estimateTokensForText(msg.content);
    if (msg.role === 'user') {
      promptTokens += tokens;
      // If there's an image attachment, Gemini counts it as ~258 tokens for standard images
      if (msg.attachment) {
        promptTokens += 258;
      }
    } else if (msg.role === 'model') {
      responseTokens += tokens;
    }
  }

  // System instruction and Model Knowledge Base tokens
  let knowledgeTokens = 0;
  if (activeModel) {
    if (activeModel.systemInstruction) {
      knowledgeTokens += estimateTokensForText(activeModel.systemInstruction);
    }
    if (activeModel.knowledgeBase) {
      knowledgeTokens += estimateTokensForText(activeModel.knowledgeBase);
    }
  }

  const draftTokens = currentDraft.trim() ? estimateTokensForText(currentDraft) : 0;
  const totalTokens = promptTokens + responseTokens + knowledgeTokens + draftTokens;
  const maxContextTokens = getModelContextLimit(activeModel?.baseModel);
  const contextUsagePercent = Math.min(100, (totalTokens / maxContextTokens) * 100);

  // Gemini 2.5/2.0 Flash Pricing estimate ($0.075 / 1M prompt, $0.30 / 1M response)
  const isPro = activeModel?.baseModel?.toLowerCase().includes('pro');
  const promptRate = isPro ? 1.25 : 0.075; // per million
  const responseRate = isPro ? 5.00 : 0.30; // per million

  const rawCostUsd = 
    ((promptTokens + knowledgeTokens + draftTokens) / 1000000) * promptRate +
    (responseTokens / 1000000) * responseRate;

  const estimatedCostUsd = rawCostUsd < 0.0001 
    ? (rawCostUsd === 0 ? '$0.00' : '<$0.0001')
    : `$${rawCostUsd.toFixed(4)}`;

  const roundedPercent = Number(contextUsagePercent.toFixed(2));

  return {
    promptTokens,
    userPromptTokens: promptTokens,
    responseTokens,
    modelResponseTokens: responseTokens,
    knowledgeTokens,
    systemKnowledgeTokens: knowledgeTokens,
    draftTokens,
    totalTokens,
    maxContextTokens,
    contextUsagePercent: roundedPercent,
    percentageUsed: roundedPercent,
    estimatedCostUsd,
    rawCostUsd
  };
}

/**
 * Formats a raw number into human-readable compact notation (e.g. 1,420 or 1.05M)
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(2)}M`;
  }
  if (count >= 10000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toLocaleString();
}
