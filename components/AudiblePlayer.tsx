import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserSettings } from '../services/storageService';

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

const VOICES_LIST = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede', 'Calliope', 'Leda'];

// Strip markdown formatting for natural TTS reading
export const cleanMarkdownForSpeech = (md: string): string => {
  return md
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
    .replace(/\|\|.*?\|\|/g, '')
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

  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(userSettings.speechRate || 1);
  const [selectedVoice, setSelectedVoice] = useState<string>(userSettings.defaultVoice || 'Kore');
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const startOffsetRef = useRef<number>(0);
  const currentCharIndexRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const progressTrackRef = useRef<HTMLDivElement>(null);

  // Estimate total speech duration based on word count & character length
  const totalSeconds = Math.max(3, Math.round(cleanText.length / (14 * speed)));
  const currentSeconds = Math.min(totalSeconds, Math.round(currentCharIndex / (14 * speed)));
  const progressPercent = cleanText.length > 0 
    ? Math.min(100, Math.max(0, (currentCharIndex / cleanText.length) * 100)) 
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

  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        messageId,
        isPlaying,
        isPaused,
        progress: progressPercent,
        currentTime: currentSeconds,
        totalTime: totalSeconds,
        currentCharIndex,
        speed,
        cleanText,
        keywords
      });
    }
  }, [messageId, isPlaying, isPaused, progressPercent, currentSeconds, totalSeconds, currentCharIndex, speed, cleanText]);

  // Match system synthesis voice to requested voice name or gender
  const getMatchingVoice = useCallback((voiceName: string): SpeechSynthesisVoice | null => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Direct name match or substring
    const exact = voices.find(v => v.name.toLowerCase().includes(voiceName.toLowerCase()));
    if (exact) return exact;

    // Prefer high quality English voices
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (['Aoede', 'Calliope', 'Kore', 'Leda'].includes(voiceName)) {
      // Female preference
      const female = enVoices.find(v => /female|zira|samantha|karen|victoria|moira|google uk english female/i.test(v.name));
      if (female) return female;
    } else {
      // Male preference
      const male = enVoices.find(v => /male|david|alex|george|daniel|google uk english male/i.test(v.name));
      if (male) return male;
    }

    return enVoices[0] || voices[0] || null;
  }, []);

  const speakFromIndex = useCallback((fromIndex: number, currentSpeed: number = speed, voiceToUse: string = selectedVoice) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (timerRef.current) clearInterval(timerRef.current);

    const clampedIndex = Math.max(0, Math.min(cleanText.length - 1, fromIndex));
    const textSlice = cleanText.slice(clampedIndex);

    if (!textSlice.trim()) {
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    startOffsetRef.current = clampedIndex;
    currentCharIndexRef.current = clampedIndex;
    setCurrentCharIndex(clampedIndex);
    startTimeRef.current = Date.now();

    const u = new SpeechSynthesisUtterance(textSlice);
    u.rate = Math.max(0.5, Math.min(2.0, currentSpeed));
    u.pitch = 1.0 + (userSettings.pitch ? userSettings.pitch / 20 : 0);
    u.volume = typeof userSettings.voiceVolume === 'number' ? userSettings.voiceVolume / 100 : 1.0;

    const matchedVoice = getMatchingVoice(voiceToUse);
    if (matchedVoice) {
      u.voice = matchedVoice;
    }

    u.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word' || event.charIndex !== undefined) {
        const absoluteIndex = startOffsetRef.current + (event.charIndex || 0);
        currentCharIndexRef.current = absoluteIndex;
        setCurrentCharIndex(absoluteIndex);
      }
    };

    // Smooth ticker fallback so visual progress bar NEVER freezes on browsers that throttle onboundary
    const charsPerSecond = 14 * currentSpeed;
    timerRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
        const estimatedAdvance = Math.min(cleanText.length, startOffsetRef.current + Math.round(elapsedSec * charsPerSecond));
        if (estimatedAdvance > currentCharIndexRef.current) {
          currentCharIndexRef.current = estimatedAdvance;
          setCurrentCharIndex(estimatedAdvance);
        }
      }
    }, 150);

    u.onend = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentCharIndex(cleanText.length);
    };

    u.onerror = (e) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (e.error !== 'interrupted') {
        console.error("TTS error:", e);
      }
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = u;
    setIsPlaying(true);
    setIsPaused(false);
    window.speechSynthesis.speak(u);
  }, [cleanText, speed, selectedVoice, userSettings, getMatchingVoice]);

  useEffect(() => {
    speakFromIndex(0, speed, selectedVoice);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleTogglePlayPause = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying && !isPaused) {
      window.speechSynthesis.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
    } else if (isPaused) {
      speakFromIndex(currentCharIndexRef.current, speed, selectedVoice);
    } else {
      speakFromIndex(0, speed, selectedVoice);
    }
  };

  const availableSpeeds = [0.75, 1, 1.25, 1.5, 2];
  const cycleSpeed = () => {
    const nextIdx = (availableSpeeds.indexOf(speed) + 1) % availableSpeeds.length;
    const newSpeed = availableSpeeds[nextIdx];
    setSpeed(newSpeed);
    if (isPlaying && !isPaused) {
      speakFromIndex(currentCharIndexRef.current, newSpeed, selectedVoice);
    }
  };

  const handleSelectVoice = (v: string) => {
    setSelectedVoice(v);
    setShowVoicePicker(false);
    if (isPlaying && !isPaused) {
      speakFromIndex(currentCharIndexRef.current, speed, v);
    }
  };

  const handleProgressScrub = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetCharIdx = Math.floor(clickRatio * cleanText.length);
    
    speakFromIndex(targetCharIdx, speed, selectedVoice);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex justify-center py-2 px-3 sticky top-0 z-30 select-none pointer-events-none">
      <div className="pointer-events-auto bg-[#18181b]/95 border border-white/15 text-white rounded-2xl sm:rounded-full shadow-2xl px-3.5 sm:px-5 py-2.5 flex flex-col sm:flex-row items-center gap-2 sm:gap-3.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-lg w-full ring-1 ring-white/10">
        
        {/* Top Controls on Mobile / Inline on Desktop */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5">
          {/* Play/Pause Button */}
          <button
            onClick={handleTogglePlayPause}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md flex-shrink-0"
            title={isPlaying && !isPaused ? 'Pause' : 'Play'}
          >
            {isPlaying && !isPaused ? (
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

          {/* Voice Selector Badge */}
          <div className="relative">
            <button
              onClick={() => setShowVoicePicker(!showVoicePicker)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors"
              title="Select Voice"
            >
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <span>{selectedVoice}</span>
              <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Voice Dropdown Popover */}
            {showVoicePicker && (
              <div className="absolute left-0 top-full mt-2 w-44 bg-[#1e1e24] border border-white/20 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">Select Persona Voice</div>
                <div className="grid grid-cols-2 gap-1">
                  {VOICES_LIST.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleSelectVoice(v)}
                      className={`px-2 py-1.5 text-xs text-left rounded-lg transition-colors font-medium ${
                        selectedVoice === v ? 'bg-cyan-600 text-white font-bold' : 'text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Speed Selector Button */}
          <button
            onClick={cycleSpeed}
            className="px-2 py-1 text-xs font-mono font-bold text-cyan-300 hover:text-white rounded-lg bg-cyan-950/50 border border-cyan-500/30 hover:bg-cyan-900/50 transition-colors flex-shrink-0"
            title="Cycle Playback Speed"
          >
            {speed}x
          </button>
        </div>

        {/* Center: Visual Audio Waveform & Interactive Sound Progress Bar */}
        <div className="flex-1 w-full space-y-1.5 px-1 min-w-[140px]">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-300 px-0.5">
            <span>{formatTime(currentSeconds)}</span>
            <div className="flex items-center gap-1">
              {[35, 65, 25, 90, 45, 80, 30, 95, 55, 40, 75, 30, 85, 50, 90, 60, 35, 80].map((h, i) => (
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
              ))}
            </div>
            <span>{formatTime(totalSeconds)}</span>
          </div>

          {/* Interactive Visual Sound Progress Bar */}
          <div
            ref={progressTrackRef}
            onClick={handleProgressScrub}
            className="relative w-full h-2 bg-white/15 hover:bg-white/25 rounded-full cursor-pointer overflow-hidden transition-all group"
            title="Click to seek speech playback"
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-100"
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
            if (timerRef.current) clearInterval(timerRef.current);
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            onClose();
          }}
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          title="Close player"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

      </div>
    </div>
  );
};
