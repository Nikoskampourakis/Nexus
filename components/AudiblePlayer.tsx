import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserSettings } from '../services/storageService';
import { generateSpeechWithGemini, decodePCM16AudioData } from '../services/geminiService';

export interface KeywordItem {
  word: string;
  charIndex: number;
  length: number;
  isSpoken: boolean;
  isSpeaking: boolean;
}

export interface AudibleState {
  messageId: string;
  isPlaying: boolean;
  isPaused: boolean;
  progress: number; // 0 to 100
  currentTime: number; // seconds
  totalTime: number; // seconds
  currentCharIndex: number;
  speed: number;
  cleanText: string;
  keywords: KeywordItem[];
}

interface AudiblePlayerProps {
  messageId: string;
  rawText: string;
  modelName: string;
  onClose: () => void;
  onStateUpdate?: (state: AudibleState) => void;
}

const VOICES_LIST = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede', 'Calliope', 'Leda'] as const;

// Strip markdown formatting for natural TTS reading
export const cleanMarkdownForSpeech = (md: string): string => {
  return md
    .replace(/\[CORRECTION_AUDIT\].*?\|\|CORRECTION_AUDIT\|\|/gs, '')
    .replace(/\|\|.*?\|\|/gs, '')
    .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/>\s+/g, '')
    .replace(/[-*+]\s+/g, '')
    .replace(/\d+\.\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const extractKeywords = (text: string): { word: string; charIndex: number; length: number }[] => {
  const regex = /\b[A-Za-z0-9_-]{4,}\b/g;
  const matches: { word: string; charIndex: number; length: number }[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawWord = match[0];
    const lower = rawWord.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      matches.push({
        word: rawWord,
        charIndex: match.index,
        length: rawWord.length
      });
    }
  }

  return matches.slice(0, 30);
};

export const AudiblePlayer: React.FC<AudiblePlayerProps> = ({
  messageId,
  rawText,
  modelName,
  onClose,
  onStateUpdate
}) => {
  const userSettings = getUserSettings();
  const cleanText = useRef(cleanMarkdownForSpeech(rawText)).current;
  const rawKeywords = useRef(extractKeywords(cleanText)).current;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [speed, setSpeed] = useState<number>(userSettings.speechRate || 1);
  const [selectedVoice, setSelectedVoice] = useState<string>(userSettings.defaultVoice || 'Kore');
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);

  // Audio Context & Buffer Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startContextTimeRef = useRef<number>(0);
  const pausedOffsetRef = useRef<number>(0);
  const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<any>(null);

  // Browser SpeechSynthesis fallback ref
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Dynamic progress & current character index
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentPlayTime / duration) * 100)) : 0;
  const currentCharIndex = cleanText.length > 0 
    ? Math.min(cleanText.length, Math.floor((progressPercent / 100) * cleanText.length))
    : 0;

  const keywords: KeywordItem[] = rawKeywords.map(k => {
    const isSpoken = currentCharIndex >= k.charIndex + k.length;
    const isSpeaking = currentCharIndex >= Math.max(0, k.charIndex - 12) && currentCharIndex < k.charIndex + k.length + 12;
    return {
      ...k,
      isSpoken,
      isSpeaking
    };
  });

  // State update callback
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        messageId,
        isPlaying: isPlaying && !isPaused,
        isPaused,
        progress: progressPercent,
        currentTime: Math.round(currentPlayTime),
        totalTime: Math.round(duration),
        currentCharIndex,
        speed,
        cleanText,
        keywords
      });
    }
  }, [messageId, isPlaying, isPaused, progressPercent, currentPlayTime, duration, currentCharIndex, speed, cleanText]);

  // Clean stop of active audio source
  const stopAudio = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }, []);

  // Web Audio Context initialization
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  // Play audio buffer from an offset (seconds)
  const playFromOffset = useCallback((offsetSec: number, currentSpeed: number = speed) => {
    stopAudio();
    const ctx = getAudioContext();
    const buffer = audioBufferRef.current;
    if (!buffer) return;

    const clampedOffset = Math.max(0, Math.min(buffer.duration - 0.05, offsetSec));
    pausedOffsetRef.current = clampedOffset;
    startContextTimeRef.current = ctx.currentTime;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = currentSpeed;
    source.connect(ctx.destination);
    sourceNodeRef.current = source;

    source.onended = () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentPlayTime(buffer.duration);
      pausedOffsetRef.current = 0;
    };

    try {
      source.start(0, clampedOffset);
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      console.warn("AudioBufferSource start error:", err);
      return;
    }

    // High frequency ticker for buttery smooth progress bar
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = setInterval(() => {
      if (!sourceNodeRef.current || ctx.state !== 'running') return;
      const elapsed = (ctx.currentTime - startContextTimeRef.current) * currentSpeed;
      const totalElapsed = Math.min(buffer.duration, pausedOffsetRef.current + elapsed);
      setCurrentPlayTime(totalElapsed);
    }, 100);
  }, [getAudioContext, speed, stopAudio]);

  // Fallback to browser synthesis if neural model fails
  const playBrowserFallback = useCallback((fromCharIdx: number = 0, currentSpeed: number = speed) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    stopAudio();
    setIsFallbackMode(true);

    const slice = cleanText.slice(fromCharIdx);
    const u = new SpeechSynthesisUtterance(slice);
    u.rate = Math.max(0.5, Math.min(2.0, currentSpeed));

    // Approximate total duration
    const approxDuration = Math.max(2, Math.round(cleanText.length / (14 * currentSpeed)));
    setDuration(approxDuration);

    const startTime = Date.now();
    u.onend = () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentPlayTime(approxDuration);
    };
    u.onerror = () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setIsPlaying(true);
    setIsPaused(false);

    tickerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000 * currentSpeed;
      setCurrentPlayTime(Math.min(approxDuration, elapsed));
    }, 120);
  }, [cleanText, speed, stopAudio]);

  // Load and synthesize audio with Gemini Voice Models
  const loadAndPlayVoice = useCallback(async (voice: string) => {
    stopAudio();
    setIsGenerating(true);
    setIsPlaying(false);
    setIsPaused(false);
    pausedOffsetRef.current = 0;
    setCurrentPlayTime(0);

    // Check memory cache
    if (audioCacheRef.current.has(voice)) {
      const cached = audioCacheRef.current.get(voice)!;
      audioBufferRef.current = cached;
      setDuration(cached.duration);
      setIsGenerating(false);
      playFromOffset(0, speed);
      return;
    }

    try {
      const base64Audio = await generateSpeechWithGemini(cleanText, voice);
      if (!base64Audio) {
        throw new Error("Empty audio received from voice model");
      }

      const ctx = getAudioContext();
      const decodedBuffer = decodePCM16AudioData(base64Audio, ctx, 24000);
      if (!decodedBuffer) {
        throw new Error("PCM decoding failed");
      }

      audioCacheRef.current.set(voice, decodedBuffer);
      audioBufferRef.current = decodedBuffer;
      setDuration(decodedBuffer.duration);
      setIsGenerating(false);
      setIsFallbackMode(false);
      playFromOffset(0, speed);
    } catch (err) {
      console.warn("Gemini voice model synthesis error, using fallback:", err);
      setIsGenerating(false);
      playBrowserFallback(0, speed);
    }
  }, [cleanText, getAudioContext, playBrowserFallback, playFromOffset, speed, stopAudio]);

  // Initial trigger on mount or voice change
  useEffect(() => {
    loadAndPlayVoice(selectedVoice);
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [selectedVoice]);

  // Toggle Play / Pause
  const handleTogglePlayPause = () => {
    if (isGenerating) return;

    if (isFallbackMode) {
      if (isPlaying && !isPaused) {
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.pause();
        setIsPaused(true);
      } else if (isPaused) {
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        playBrowserFallback(0, speed);
      }
      return;
    }

    if (isPlaying && !isPaused) {
      // Pause
      const ctx = audioContextRef.current;
      if (ctx) {
        const elapsed = (ctx.currentTime - startContextTimeRef.current) * speed;
        pausedOffsetRef.current += elapsed;
      }
      stopAudio();
      setIsPaused(true);
      setIsPlaying(false);
    } else if (isPaused) {
      // Resume
      playFromOffset(pausedOffsetRef.current, speed);
    } else {
      // Replay from start
      playFromOffset(0, speed);
    }
  };

  // Cycle playback speed
  const availableSpeeds = [0.75, 1, 1.25, 1.5, 2];
  const cycleSpeed = () => {
    const nextIdx = (availableSpeeds.indexOf(speed) + 1) % availableSpeeds.length;
    const newSpeed = availableSpeeds[nextIdx];
    setSpeed(newSpeed);

    if (isPlaying && !isPaused && !isFallbackMode) {
      const ctx = audioContextRef.current;
      if (ctx) {
        const elapsed = (ctx.currentTime - startContextTimeRef.current) * speed;
        pausedOffsetRef.current += elapsed;
      }
      playFromOffset(pausedOffsetRef.current, newSpeed);
    }
  };

  // Select voice persona
  const handleSelectVoice = (v: string) => {
    setSelectedVoice(v);
    setShowVoicePicker(false);
  };

  // Scrub progress
  const handleProgressScrub = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || duration <= 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = clickRatio * duration;

    setCurrentPlayTime(targetTime);
    pausedOffsetRef.current = targetTime;

    if (!isFallbackMode) {
      playFromOffset(targetTime, speed);
    } else {
      const targetCharIdx = Math.floor(clickRatio * cleanText.length);
      playBrowserFallback(targetCharIdx, speed);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex justify-center py-2 px-3 sticky top-0 z-30 select-none pointer-events-none">
      <div className="pointer-events-auto bg-[#14151f]/95 border border-cyan-500/30 text-white rounded-2xl shadow-2xl p-2.5 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row items-center gap-2 sm:gap-3.5 backdrop-blur-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-xl w-full ring-1 ring-cyan-500/20">
        
        {/* Controls Row on Mobile / Left Section on Desktop */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 flex-shrink-0">
          
          {/* Play/Pause / Loading Spinner Button */}
          <button
            onClick={handleTogglePlayPause}
            disabled={isGenerating}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md flex-shrink-0 ${
              isGenerating
                ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 cursor-wait'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black active:scale-95'
            }`}
            title={isGenerating ? 'Synthesizing neural voice...' : isPlaying && !isPaused ? 'Pause' : 'Play'}
          >
            {isGenerating ? (
              <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying && !isPaused ? (
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Gemini Neural Voice Persona Badge */}
          <div className="relative">
            <button
              onClick={() => setShowVoicePicker(!showVoicePicker)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-xs font-semibold text-cyan-200 transition-colors shadow-sm"
              title="Select Gemini Voice Model"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono">{selectedVoice}</span>
              <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono hidden xs:inline">
                Voice Model
              </span>
              <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Voice Dropdown Popover */}
            {showVoicePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowVoicePicker(false)} />
                <div className="absolute left-0 top-full mt-2 w-52 bg-[#181926] border border-cyan-500/30 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-2xl">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                    <span>Gemini Voice Models</span>
                    <span className="text-[9px] text-neutral-400 font-mono">24kHz Neural</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {VOICES_LIST.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleSelectVoice(v)}
                        className={`px-2 py-1.5 text-xs text-left rounded-xl transition-all font-medium flex items-center justify-between ${
                          selectedVoice === v 
                            ? 'bg-cyan-500 text-black font-bold shadow-sm' 
                            : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{v}</span>
                        {selectedVoice === v && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Speed Selector Button */}
          <button
            onClick={cycleSpeed}
            className="px-2 py-1 text-xs font-mono font-bold text-cyan-300 hover:text-white rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex-shrink-0"
            title="Cycle Playback Speed"
          >
            {speed}x
          </button>
        </div>

        {/* Center: Realtime Sound Waveform & Seekable Progress Bar */}
        <div className="flex-1 w-full space-y-1 px-1 min-w-[140px]">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-200/80 px-0.5">
            <span>{formatTime(Math.round(currentPlayTime))}</span>
            
            {/* Waveform graphic */}
            <div className="flex items-center gap-1 h-3">
              {isGenerating ? (
                <span className="text-[10px] text-cyan-300 animate-pulse font-sans">
                  Synthesizing Voice...
                </span>
              ) : (
                [30, 70, 25, 95, 45, 80, 30, 100, 55, 40, 75, 30, 85, 50, 90, 60, 35, 80].map((h, i) => (
                  <span
                    key={i}
                    className={`w-0.5 rounded-full transition-all duration-150 ${
                      isPlaying && !isPaused ? 'bg-cyan-400' : 'bg-white/20'
                    }`}
                    style={{
                      height: isPlaying && !isPaused ? `${Math.max(3, (h * ((i % 3) + 1)) % 14 + 3)}px` : '3px',
                      animation: isPlaying && !isPaused ? `pulse 0.7s infinite ease-in-out ${i * 40}ms` : 'none'
                    }}
                  />
                ))
              )}
            </div>

            <span>{formatTime(Math.round(duration))}</span>
          </div>

          {/* Interactive Seek Bar */}
          <div
            ref={progressTrackRef}
            onClick={handleProgressScrub}
            className="relative w-full h-2 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer overflow-hidden transition-all group"
            title="Click or drag to seek voice playback"
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-100 opacity-0 group-hover:opacity-100"
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            stopAudio();
            onClose();
          }}
          className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0 self-end sm:self-center"
          title="Close voice player"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

      </div>
    </div>
  );
};
