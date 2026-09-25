import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LiveServerMessage, Modality, ThinkingLevel } from "@google/genai";
import { ai, generateSpeechWithGemini } from '../services/geminiService';
import { VirtualModel } from '../types';

interface LiveInterfaceProps {
  onClose: () => void;
  activeModel?: VirtualModel;
  searchEnabled?: boolean;
  onToggleSearch?: () => void;
  thinkingEnabled?: boolean;
  onToggleThinking?: () => void;
  studentEnabled?: boolean;
  onToggleStudent?: () => void;
}

interface CaptionItem {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: number;
}

// 8 High-fidelity Gemini Voice Personas
const VOICES = [
  { name: 'Puck', desc: 'Playful & dynamic', gender: 'Neutral/Upbeat' },
  { name: 'Charon', desc: 'Deep & authoritative', gender: 'Deeper' },
  { name: 'Kore', desc: 'Warm & balanced', gender: 'Calm' },
  { name: 'Fenrir', desc: 'Resonant & strong', gender: 'Commanding' },
  { name: 'Zephyr', desc: 'Gentle & airy', gender: 'Soft' },
  { name: 'Aoede', desc: 'Articulate & lyrical', gender: 'Clear' },
  { name: 'Calliope', desc: 'Expressive & bright', gender: 'Lively' },
  { name: 'Leda', desc: 'Soothing & grounded', gender: 'Gentle' },
];

export const LiveInterface: React.FC<LiveInterfaceProps> = ({
  onClose,
  activeModel,
  searchEnabled = false,
  onToggleSearch,
  thinkingEnabled = false,
  onToggleThinking,
  studentEnabled = false,
  onToggleStudent
}) => {
  // Live Connection & Relay States
  const [isConnected, setIsConnected] = useState(false);
  const [isVoiceRelayActive, setIsVoiceRelayActive] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Model Selection (Latest Gemini Live Models)
  const [selectedLiveModel, setSelectedLiveModel] = useState<'gemini-3.8-live' | 'gemini-3.8-live-extended-thinking'>(
    thinkingEnabled ? 'gemini-3.8-live-extended-thinking' : 'gemini-3.8-live'
  );

  // Live Control Bar States
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [activeToolsTab, setActiveToolsTab] = useState<'voices' | 'models' | 'acoustics' | 'vision'>('voices');

  // Keyboard Mode State
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isExpandedTranscript, setIsExpandedTranscript] = useState(false);
  const keyboardInputRef = useRef<HTMLInputElement>(null);

  // Configuration & Expressivity States
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [expressivityLevel, setExpressivityLevel] = useState(75); // 0% to 100%
  const [liveExpressivityScore, setLiveExpressivityScore] = useState(0);

  // Captions list
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const captionsEndRef = useRef<HTMLDivElement>(null);

  // Canvas & Visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Video Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<any>(null);

  // Audio Contexts & Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputGainNodeRef = useRef<GainNode | null>(null);

  // Analysers
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputDataArrayRef = useRef<Uint8Array | null>(null);
  const inputDataArrayRef = useRef<Uint8Array | null>(null);

  // Session & Audio Scheduling
  const sessionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const isVoiceRelayActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const speedRef = useRef(1.0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Connection Lifecycle & Concurrency Safeguards
  const connectionAttemptIdRef = useRef<number>(0);
  const autoRetryTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const turnTimeoutRef = useRef<any>(null);
  const isWaitingForResponseRef = useRef<boolean>(false);
  const expressivityRef = useRef<number>(75);

  // Speech Recognition for live user captions
  const recognitionRef = useRef<any>(null);

  // Sync state into refs
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isVoiceRelayActiveRef.current = isVoiceRelayActive;
  }, [isVoiceRelayActive]);

  useEffect(() => {
    isWaitingForResponseRef.current = isWaitingForResponse;
  }, [isWaitingForResponse]);

  useEffect(() => {
    expressivityRef.current = expressivityLevel;
  }, [expressivityLevel]);

  useEffect(() => {
    if (thinkingEnabled) {
      setSelectedLiveModel('gemini-3.8-live-extended-thinking');
    } else {
      setSelectedLiveModel('gemini-3.8-live');
    }
  }, [thinkingEnabled]);

  // Auto-scroll captions
  useEffect(() => {
    if (showCaptions && captionsEndRef.current) {
      captionsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [captions, showCaptions, isExpandedTranscript]);

  // Safe Caption Append
  const addCaption = useCallback((sender: 'user' | 'model', text: string) => {
    if (!text || !text.trim()) return;
    setCaptions(prev => {
      const last = prev[prev.length - 1];
      if (last && last.sender === sender && Date.now() - last.timestamp < 3500) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text} ${text}`, timestamp: Date.now() }
        ];
      }
      return [
        ...prev.slice(-50), // keep last 50 captions
        { id: Math.random().toString(36).substring(7), sender, text, timestamp: Date.now() }
      ];
    });
  }, []);

  // Web Speech Recognition for User Captions & Voice Relay
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          if (isMutedRef.current) return;
          const current = event.resultIndex;
          const transcript = event.results[current]?.[0]?.transcript;
          if (transcript) {
            const cleanText = transcript.trim();
            addCaption('user', cleanText);

            // In Voice Relay mode (or when disconnected), automatically answer spoken input
            if (isVoiceRelayActiveRef.current || !isConnectedRef.current) {
              fulfillResponseViaNeuralRelay(cleanText);
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.debug('Live Speech Recognition note:', event.error);
          }
        };

        recognition.onend = () => {
          if ((isConnectedRef.current || isVoiceRelayActiveRef.current) && !isMutedRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.debug('Speech recognition init bypassed:', err);
      }
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    };
  }, [addCaption]);

  // Connect to Live API on mount or model/voice/tool change
  // Note: expressivityLevel is removed to prevent reconnect floods on slider drag
  useEffect(() => {
    connectToLiveApi();
    return () => {
      cleanup(true);
    };
  }, [selectedLiveModel, selectedVoice, studentEnabled, searchEnabled]);

  // Camera Management
  useEffect(() => {
    if (isCameraOn) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraOn, facingMode]);

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch (e) {}
        });
        cameraStreamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: mode }, 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        }
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play deferred:', e));
      }

      // Stream frames at 1 FPS with standard object format
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = setInterval(() => {
        captureAndSendVideoFrame();
      }, 1000);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      if (mode === 'environment') {
        setFacingMode('user');
        return;
      }
      setIsCameraOn(false);
      setErrorMessage(`Camera error: ${err.message || 'Permission denied'}`);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const stopCamera = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  const captureAndSendVideoFrame = () => {
    if (!videoRef.current || !sessionRef.current || !isConnectedRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

      if (base64Data) {
        // Correct Object signature for sendRealtimeInput in @google/genai
        if (typeof sessionRef.current.sendRealtimeInput === 'function') {
          sessionRef.current.sendRealtimeInput({
            video: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          });
        }
      }
    } catch (e) {
      console.warn('Frame capture skipped:', e);
    }
  };

  // Safe Base64 Helpers
  const decodeBase64Safe = (base64: string): Uint8Array | null => {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (err) {
      console.warn("Base64 decode error:", err);
      return null;
    }
  };

  const encodePCM16Base64 = (int16Array: Int16Array): string => {
    let binary = '';
    const bytes = new Uint8Array(int16Array.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Convert raw 24kHz PCM16 into AudioBuffer safely
  const decodeAudioDataSafe = (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
  ): AudioBuffer | null => {
    try {
      const alignedLength = data.byteLength - (data.byteLength % 2);
      const dataInt16 = new Int16Array(data.buffer, data.byteOffset, alignedLength / 2);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }
      return buffer;
    } catch (e) {
      console.warn("Audio buffer creation failed:", e);
      return null;
    }
  };

  // Audio Chunk Queue and Gapless Player
  const queueAudioChunk = (base64Audio: string) => {
    let ctx = outputAudioContextRef.current;
    let node = outputGainNodeRef.current;

    // Lazily initialize output audio context if not yet active
    if (!ctx || ctx.state === 'closed') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioCtx({ sampleRate: 24000 });
        outputAudioContextRef.current = ctx;

        const outGain = ctx.createGain();
        outGain.gain.value = 1.0;
        outGain.connect(ctx.destination);
        outputGainNodeRef.current = outGain;
        node = outGain;

        const outAnalyser = ctx.createAnalyser();
        outAnalyser.fftSize = 256;
        outGain.connect(outAnalyser);
        outputAnalyserRef.current = outAnalyser;
        outputDataArrayRef.current = new Uint8Array(outAnalyser.frequencyBinCount);
      } catch (err) {
        console.warn("Could not lazily initialize output AudioContext:", err);
      }
    } else if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!ctx || !node) return;

    const decodedBytes = decodeBase64Safe(base64Audio);
    if (!decodedBytes) return;

    const audioBuffer = decodeAudioDataSafe(decodedBytes, ctx, 24000, 1);
    if (!audioBuffer) return;

    setStatus('speaking');
    setIsWaitingForResponse(false);

    // Precision scheduling for gapless audio
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(node);
    source.playbackRate.value = speedRef.current;

    try {
      source.start(nextStartTimeRef.current);
      const duration = audioBuffer.duration / speedRef.current;
      nextStartTimeRef.current += duration;

      sourcesRef.current.add(source);
      source.onended = () => {
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0) {
          setStatus('listening');
        }
      };
    } catch (playErr) {
      console.warn('Audio scheduling bypassed:', playErr);
    }
  };

  // Auto-retry scheduling with visual countdown
  const scheduleAutoRetry = (delaySeconds: number = 12) => {
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    let secondsLeft = delaySeconds;
    setReconnectCountdown(secondsLeft);

    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setReconnectCountdown(null);
      } else {
        setReconnectCountdown(secondsLeft);
      }
    }, 1000);

    autoRetryTimerRef.current = setTimeout(() => {
      if (!isConnectedRef.current) {
        console.log("Auto-retrying Live WebSocket connection after slot cooldown...");
        connectToLiveApi(false);
      }
    }, delaySeconds * 1000);
  };

  // Core Connection Handler with Latest Gemini Live Models & Concurrency Safeguards
  const connectToLiveApi = async (isManualRetry = false) => {
    const attemptId = ++connectionAttemptIdRef.current;

    // Clean up any existing connection and audio pipelines safely
    cleanup(false);

    setStatus('connecting');
    if (isManualRetry) {
      setErrorMessage(null);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
      setReconnectCountdown(null);
    }

    // Cooldown pause (350ms) to allow Google backend to release the previous admitted session slot
    await new Promise(resolve => setTimeout(resolve, 350));
    if (connectionAttemptIdRef.current !== attemptId) return;

    try {
      // 1. Output Audio Context (24kHz standard for Gemini Live output)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
        const outCtx = new AudioCtx({ sampleRate: 24000 });
        outputAudioContextRef.current = outCtx;

        const outGain = outCtx.createGain();
        outGain.gain.value = 1.0;
        outGain.connect(outCtx.destination);
        outputGainNodeRef.current = outGain;

        const outAnalyser = outCtx.createAnalyser();
        outAnalyser.fftSize = 256;
        outGain.connect(outAnalyser);
        outputAnalyserRef.current = outAnalyser;
        outputDataArrayRef.current = new Uint8Array(outAnalyser.frequencyBinCount);
      } else if (outputAudioContextRef.current.state === 'suspended') {
        outputAudioContextRef.current.resume().catch(() => {});
      }

      // 2. Input Audio Context (16kHz standard for Gemini Live input)
      const inCtx = new AudioCtx({ sampleRate: 16000 });
      inputAudioContextRef.current = inCtx;

      const inAnalyser = inCtx.createAnalyser();
      inAnalyser.fftSize = 256;
      inputAnalyserRef.current = inAnalyser;
      inputDataArrayRef.current = new Uint8Array(inAnalyser.frequencyBinCount);

      // 3. Microphone Capture (graceful fallback if blocked/denied)
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        mediaStreamRef.current = stream;

        const source = inCtx.createMediaStreamSource(stream);
        source.connect(inAnalyser);
        sourceNodeRef.current = source;

        // ScriptProcessor for 16kHz PCM streaming
        const processor = inCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!isConnectedRef.current || isMutedRef.current || !sessionRef.current || isVoiceRelayActiveRef.current) return;

          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          const base64Pcm = encodePCM16Base64(pcm16);
          try {
            if (typeof sessionRef.current.sendRealtimeInput === 'function') {
              sessionRef.current.sendRealtimeInput({
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Pcm
                }
              });
            }
          } catch (sendErr) {
            console.warn('PCM streaming error:', sendErr);
          }
        };

        source.connect(processor);
        processor.connect(inCtx.destination);
      } catch (micErr: any) {
        console.warn('Microphone permission or capture skipped:', micErr);
      }

      // Check if cancelled during async mic acquisition
      if (connectionAttemptIdRef.current !== attemptId) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      // 4. Model Persona & Configuration
      let systemInstruction = activeModel?.systemInstruction || "You are an intelligent, natural conversational AI companion powered by Gemini Live.";
      const exp = expressivityRef.current;
      if (exp > 80) {
        systemInstruction += "\nSpeak with animated cadence, warmth, and expressive emotional nuance.";
      } else if (exp < 40) {
        systemInstruction += "\nSpeak in a calm, grounded, deliberate, and concise cadence.";
      }

      if (studentEnabled) {
        systemInstruction += "\nAdopt the Feynman technique: break complex ideas into intuitive, vivid, real-world analogies.";
      }

      const sessionConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
        },
        systemInstruction: systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };

      if (searchEnabled) {
        sessionConfig.tools = [{ googleSearch: {} }];
      }

      if (selectedLiveModel === 'gemini-3.8-live-extended-thinking') {
        sessionConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      // 5. Connect to Live API
      let session: any;
      try {
        session = await ai.live.connect({
          model: selectedLiveModel,
          config: sessionConfig,
          callbacks: {
            onopen: () => {
              if (connectionAttemptIdRef.current !== attemptId) return;
              setIsConnected(true);
              isConnectedRef.current = true;
              setIsVoiceRelayActive(false);
              setErrorMessage(null);
              setStatus('listening');
            },
            onmessage: async (message: LiveServerMessage) => {
              clearTimeout(turnTimeoutRef.current);
              const textParts = message.serverContent?.modelTurn?.parts;
              if (textParts && Array.isArray(textParts)) {
                for (const part of textParts) {
                  // Capture transcription
                  if (part.text) {
                    addCaption('model', part.text);
                    setIsWaitingForResponse(false);
                  }
                  // Play any audio chunk in this part
                  if (part.inlineData?.data) {
                    queueAudioChunk(part.inlineData.data);
                  }
                }
              }

              // Fallback for transcript fields
              const outTranscript = (message.serverContent as any)?.outputAudioTranscription?.text;
              if (outTranscript) {
                addCaption('model', outTranscript);
                setIsWaitingForResponse(false);
              }

              const inTranscript = (message.serverContent as any)?.inputAudioTranscription?.text;
              if (inTranscript) {
                addCaption('user', inTranscript);
              }

              // Handle User Interruption
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(source => {
                  try { source.stop(); } catch (e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setStatus('listening');
                setIsWaitingForResponse(false);
              }
            },
            onclose: (closeEvent) => {
              if (connectionAttemptIdRef.current !== attemptId) return;
              setIsConnected(false);
              isConnectedRef.current = false;
              setStatus('disconnected');
              if (closeEvent && closeEvent.code !== 1000) {
                console.log(`Live WebSocket closed (code ${closeEvent.code}). Activating Voice Relay...`);
                setIsVoiceRelayActive(true);
                setStatus('listening');
                scheduleAutoRetry(15);
              }
            },
            onerror: (err: any) => {
              if (connectionAttemptIdRef.current !== attemptId) return;
              console.error('Live Connection Error in callback:', err);
              setIsConnected(false);
              isConnectedRef.current = false;
              setIsVoiceRelayActive(true);
              setStatus('listening');
              scheduleAutoRetry(15);
            }
          }
        });
      } catch (connErr: any) {
        // Fallback from thinking model if unavailable
        if (selectedLiveModel === 'gemini-3.8-live-extended-thinking') {
          sessionConfig.thinkingConfig = undefined;
          session = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: sessionConfig,
            callbacks: {
              onopen: () => {
                if (connectionAttemptIdRef.current !== attemptId) return;
                setIsConnected(true);
                isConnectedRef.current = true;
                setIsVoiceRelayActive(false);
                setStatus('listening');
              },
              onmessage: async (message: LiveServerMessage) => {
                clearTimeout(turnTimeoutRef.current);
                const parts = message.serverContent?.modelTurn?.parts || [];
                for (const part of parts) {
                  if (part.text) {
                    addCaption('model', part.text);
                    setIsWaitingForResponse(false);
                  }
                  if (part.inlineData?.data) {
                    queueAudioChunk(part.inlineData.data);
                  }
                }
              },
              onclose: () => {
                if (connectionAttemptIdRef.current !== attemptId) return;
                setIsConnected(false);
                isConnectedRef.current = false;
                setIsVoiceRelayActive(true);
                setStatus('listening');
              },
              onerror: () => {
                if (connectionAttemptIdRef.current !== attemptId) return;
                setIsConnected(false);
                isConnectedRef.current = false;
                setIsVoiceRelayActive(true);
                setStatus('listening');
              }
            }
          });
        } else {
          throw connErr;
        }
      }

      // If connection was cancelled or superseded while awaiting connect
      if (connectionAttemptIdRef.current !== attemptId) {
        try {
          session?.close?.();
          session?.conn?.close?.();
        } catch (e) {}
        return;
      }

      sessionRef.current = session;
      setIsConnected(true);
      isConnectedRef.current = true;
      setIsVoiceRelayActive(false);
      setStatus('listening');
    } catch (err: any) {
      if (connectionAttemptIdRef.current !== attemptId) return;

      console.error("Live connection failed:", err);
      const msg = err?.message || String(err);
      const isSlotOverloaded = msg.includes('OVERLOADED') || 
                               msg.includes('NumAdmittedSessions') || 
                               msg.includes('max_engine_slots_') ||
                               msg.includes('503') ||
                               msg.includes('unavailable');

      setIsConnected(false);
      isConnectedRef.current = false;
      sessionRef.current = null;

      if (isSlotOverloaded) {
        setIsVoiceRelayActive(true);
        setStatus('listening');
        setErrorMessage("Live audio stream capacity is currently busy. Active in Neural Voice Relay (24kHz).");
        scheduleAutoRetry(15);
      } else {
        setStatus('disconnected');
        setErrorMessage("Connection error. Click Retry to reconnect.");
      }
    }
  };

  // Cleanup handler
  const cleanup = (stopAnimation = true) => {
    connectionAttemptIdRef.current++;

    if (stopAnimation && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }

    if (autoRetryTimerRef.current) {
      clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
    }

    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      scriptProcessorRef.current = null;
    }

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      mediaStreamRef.current = null;
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      try { inputAudioContextRef.current.close().catch(() => {}); } catch (e) {}
      inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      try { outputAudioContextRef.current.close().catch(() => {}); } catch (e) {}
      outputAudioContextRef.current = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close?.();
        sessionRef.current.conn?.close?.();
      } catch (e) {}
      sessionRef.current = null;
    }

    stopCamera();
  };

  // High-Resiliency Neural Relay Response Generator (24kHz Gemini Voice + gemini-3.8-flash)
  const fulfillResponseViaNeuralRelay = async (userInput: string) => {
    setIsWaitingForResponse(true);
    setStatus('speaking');

    try {
      let systemPrompt = activeModel?.systemInstruction || "You are an intelligent, natural conversational AI companion powered by Gemini.";
      const exp = expressivityRef.current;
      if (exp > 80) {
        systemPrompt += "\nSpeak with animated cadence, warmth, and expressive emotional nuance.";
      } else if (exp < 40) {
        systemPrompt += "\nSpeak in a calm, grounded, deliberate, and concise cadence.";
      }
      if (studentEnabled) {
        systemPrompt += "\nAdopt the Feynman technique: break complex ideas into intuitive, vivid, real-world analogies.";
      }

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: userInput }]
          }
        ],
        config: {
          systemInstruction: systemPrompt,
          ...(searchEnabled ? { tools: [{ googleSearch: {} }] } : {})
        }
      });

      let fullText = '';
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          addCaption('model', text);
          setIsWaitingForResponse(false);
        }
      }

      if (fullText.trim()) {
        // Synthesize 24kHz audio via Gemini voice model
        const audioBase64 = await generateSpeechWithGemini(fullText, selectedVoice);
        if (audioBase64) {
          queueAudioChunk(audioBase64);
        } else {
          setStatus('listening');
        }
      } else {
        setStatus('listening');
      }
    } catch (err: any) {
      console.error('Neural Relay error:', err);
      addCaption('model', "I apologize, I encountered an issue generating a response.");
      setStatus('listening');
      setIsWaitingForResponse(false);
    }
  };

  // Keyboard Mode: Send text message turn to Live session and trigger response
  const handleSendKeyboardMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = typedInput.trim();
    if (!textToSend) return;

    // Append user caption immediately
    addCaption('user', textToSend);
    setTypedInput('');
    setIsWaitingForResponse(true);

    // Re-focus keyboard input for continuous seamless typing
    setTimeout(() => {
      keyboardInputRef.current?.focus();
    }, 10);

    // Stop any active assistant speech
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (err) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    // 1. If Live WebSocket is active and not in relay mode, send via Live WebSocket
    const sess = sessionRef.current;
    if (isConnectedRef.current && sess && !isVoiceRelayActiveRef.current) {
      try {
        let sent = false;
        if (typeof sess.sendClientContent === 'function') {
          sess.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: textToSend }]
              }
            ],
            turnComplete: true
          });
          sent = true;
        } else if (typeof sess.sendRealtimeInput === 'function') {
          sess.sendRealtimeInput({
            text: textToSend
          });
          sent = true;
        } else if (sess.conn && typeof sess.conn.send === 'function') {
          sess.conn.send(JSON.stringify({
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ text: textToSend }]
                }
              ],
              turnComplete: true
            }
          }));
          sent = true;
        }

        if (sent) {
          // Safeguard: If the WebSocket does not respond within 7 seconds, fulfill via Neural Relay
          clearTimeout(turnTimeoutRef.current);
          turnTimeoutRef.current = setTimeout(() => {
            if (isWaitingForResponseRef.current) {
              console.log('Live WebSocket turn timeout, fulfilling via Neural Relay...');
              fulfillResponseViaNeuralRelay(textToSend);
            }
          }, 7000);
          return;
        }
      } catch (err: any) {
        console.warn("Keyboard text message dispatch over WebSocket error:", err);
      }
    }

    // 2. Otherwise (Voice Relay mode or WebSocket disconnected), fulfill immediately via Neural Relay
    await fulfillResponseViaNeuralRelay(textToSend);
  };

  // User Interrupt / Speak Button
  const handleInterruptOrSpeak = () => {
    if (status === 'speaking') {
      sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
      setStatus('listening');
      setIsWaitingForResponse(false);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          setIsKeyboardMode(false);
        }
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleInterruptOrSpeak();
      } else if (e.key === 't' || e.key === 'T' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setIsKeyboardMode(prev => {
          const next = !prev;
          if (next) {
            setTimeout(() => keyboardInputRef.current?.focus(), 50);
          }
          return next;
        });
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowCaptions(prev => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setIsCameraOn(prev => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setShowToolsDrawer(prev => !prev);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (showToolsDrawer) setShowToolsDrawer(false);
        else if (showShortcutsModal) setShowShortcutsModal(false);
        else onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, showToolsDrawer, showShortcutsModal, onClose]);

  // Visualizer Ring Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Compute input and output audio levels
      let inputLevel = 0;
      if (inputAnalyserRef.current && inputDataArrayRef.current && !isMutedRef.current) {
        inputAnalyserRef.current.getByteFrequencyData(inputDataArrayRef.current);
        const sum = inputDataArrayRef.current.reduce((a, b) => a + b, 0);
        inputLevel = sum / (inputDataArrayRef.current.length * 255);
      }

      let outputLevel = 0;
      if (outputAnalyserRef.current && outputDataArrayRef.current && status === 'speaking') {
        outputAnalyserRef.current.getByteFrequencyData(outputDataArrayRef.current);
        const sum = outputDataArrayRef.current.reduce((a, b) => a + b, 0);
        outputLevel = sum / (outputDataArrayRef.current.length * 255);
        setLiveExpressivityScore(Math.round(outputLevel * 100));
      }

      const activeLevel = status === 'speaking' ? outputLevel : inputLevel;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(centerX, centerY) * 0.42;

      // Glow backdrop
      const gradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.2,
        centerX, centerY, baseRadius * 1.6
      );

      if (status === 'speaking') {
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.25)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      } else if (status === 'listening') {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        gradient.addColorStop(0.6, 'rgba(5, 150, 105, 0.15)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(100, 116, 139, 0.2)');
        gradient.addColorStop(1, 'rgba(100, 116, 139, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Organic pulsating sound waves
      const numRings = 4;
      for (let r = 0; r < numRings; r++) {
        ctx.beginPath();
        const points = 64;
        for (let i = 0; i <= points; i++) {
          const theta = (i / points) * Math.PI * 2;
          const wave = Math.sin(theta * (4 + r) + angle + r) * (activeLevel * 36 + 6);
          const rad = baseRadius + r * 14 + wave;
          const x = centerX + Math.cos(theta) * rad;
          const y = centerY + Math.sin(theta) * rad;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.strokeStyle = status === 'speaking'
          ? `rgba(6, 182, 212, ${0.85 - r * 0.18})`
          : status === 'listening'
          ? `rgba(16, 185, 129, ${0.75 - r * 0.18})`
          : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      angle += 0.04 + activeLevel * 0.08;
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [status]);

  return (
    <div className="fixed inset-0 z-50 bg-[#07080d] text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      
      {/* 1. Sleek Mobile-Friendly Top Bar */}
      <header className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 border-b border-white/10 bg-[#0c0d14]/80 backdrop-blur-xl">
        
        {/* Left: Status Pill & Model Chip */}
        <div className="flex items-center space-x-2 min-w-0">
          <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${
              status === 'speaking' 
                ? 'bg-cyan-400 animate-ping' 
                : status === 'listening' 
                ? (isVoiceRelayActive ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400 animate-pulse')
                : isConnected 
                ? 'bg-blue-400' 
                : 'bg-amber-400'
            }`} />
            <span className="text-[11px] font-mono font-bold tracking-wide uppercase">
              {status === 'speaking' ? 'AI Speaking' : status === 'listening' ? (isVoiceRelayActive ? 'Neural Relay' : 'Listening') : status}
            </span>
          </div>

          {/* Model Chip */}
          <button
            onClick={() => {
              setActiveToolsTab('models');
              setShowToolsDrawer(true);
            }}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 hover:bg-cyan-900/60 transition-colors truncate"
            title="Switch Live Model"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="truncate">{selectedLiveModel}</span>
          </button>

          {isVoiceRelayActive && (
            <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-[10px] font-mono text-purple-300">
              ⚡ 24kHz Relay
            </span>
          )}

          {/* Active Voice Badge */}
          <button
            onClick={() => {
              setActiveToolsTab('voices');
              setShowToolsDrawer(true);
            }}
            className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-neutral-300 hover:text-white transition-colors"
            title="Configure Voice Persona"
          >
            <span>Voice: <strong className="text-cyan-300">{selectedVoice}</strong></span>
          </button>
        </div>

        {/* Right: Quick Action Group */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
          
          {/* Keyboard Toggle */}
          <button
            onClick={() => {
              setIsKeyboardMode(!isKeyboardMode);
              if (!isKeyboardMode) {
                setTimeout(() => keyboardInputRef.current?.focus(), 80);
              }
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold flex items-center space-x-1 border transition-all ${
              isKeyboardMode
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500 shadow-sm'
                : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
            }`}
            title="Type with Keyboard [T]"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 3h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h12" />
            </svg>
            <span className="hidden md:inline font-mono text-[11px]">{isKeyboardMode ? 'Typing Mode' : 'Type [T]'}</span>
          </button>

          {/* Options & Tools Drawer */}
          <button
            onClick={() => setShowToolsDrawer(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 flex items-center space-x-1 transition-all"
            title="Open Options & Tools [S]"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="hidden sm:inline font-mono text-[11px]">Options</span>
          </button>

          {/* Close / Exit Button */}
          <button
            onClick={onClose}
            className="p-1.5 sm:px-2 sm:py-1 rounded-xl text-neutral-400 hover:text-white hover:bg-rose-950/40 hover:border-rose-500/40 border border-transparent transition-all"
            title="Exit Live Mode [Esc]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. Center Stage (Visualizer + Video PIP + Subtitles + Keyboard Dock) */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center min-h-0 px-2">
        
        {/* Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          width={600}
          height={460}
          className="w-full max-w-lg aspect-square max-h-[42vh] sm:max-h-[48vh] object-contain cursor-pointer"
          onClick={handleInterruptOrSpeak}
          title="Click to interrupt or speak [Space]"
        />

        {/* Floating Webcam PIP Feed */}
        {isCameraOn && (
          <div className="absolute top-2 right-2 sm:right-6 z-30 w-32 sm:w-44 aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-cyan-500/60 shadow-2xl animate-in zoom-in-95 duration-150">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            {/* Flip Camera Button on PIP */}
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/70 hover:bg-cyan-600 text-white transition-all shadow-md border border-white/20"
              title={`Switch camera to ${facingMode === 'user' ? 'Rear' : 'Front'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <div className="absolute bottom-1 left-2 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono text-white/90 uppercase font-bold">
                {facingMode === 'user' ? 'Front' : 'Rear'}
              </span>
            </div>
          </div>
        )}

        {/* Expressivity Score Pill */}
        <div className="w-full max-w-xs px-4 flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1 z-20">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Expressivity:</span>
          </span>
          <span className="text-cyan-300 font-bold">
            {status === 'speaking' ? `${liveExpressivityScore}% (Active)` : `${expressivityLevel}%`}
          </span>
        </div>

        {/* Subtitles & Captions Overlay (Collapsible & Expandable) */}
        {showCaptions && (
          <div className={`w-full max-w-xl px-2 sm:px-4 z-30 transition-all duration-200 ${
            isExpandedTranscript ? 'fixed inset-x-2 sm:inset-x-4 top-16 bottom-24 max-w-2xl mx-auto z-40' : 'mb-2'
          }`}>
            <div className={`bg-[#0e0f17]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col ${
              isExpandedTranscript ? 'h-full overflow-hidden' : 'max-h-28 sm:max-h-36 overflow-y-auto'
            }`}>
              <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                    Live Transcript
                  </span>
                </div>
                <button
                  onClick={() => setIsExpandedTranscript(!isExpandedTranscript)}
                  className="text-[10px] text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 font-mono transition-colors"
                >
                  {isExpandedTranscript ? 'Collapse' : 'Expand Transcript'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {captions.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic text-center font-mono py-1">
                    {isWaitingForResponse 
                      ? 'AI is generating real-time response...' 
                      : 'Speak into microphone or type a message below...'}
                  </p>
                ) : (
                  (isExpandedTranscript ? captions : captions.slice(-3)).map(cap => (
                    <div key={cap.id} className="text-xs leading-relaxed flex items-start space-x-2 animate-in fade-in">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold flex-shrink-0 ${
                        cap.sender === 'user' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}>
                        {cap.sender === 'user' ? 'You' : 'Gemini'}
                      </span>
                      <span className="text-neutral-100">{cap.text}</span>
                    </div>
                  ))
                )}
                {isWaitingForResponse && (
                  <div className="flex items-center space-x-2 text-xs text-cyan-300 animate-pulse font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Gemini is generating response...</span>
                  </div>
                )}
                <div ref={captionsEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* KEYBOARD MODE DOCK: Direct Text Input to Live API */}
        {isKeyboardMode && (
          <div className="w-full max-w-lg px-2 sm:px-4 z-30 mb-2 animate-in slide-in-from-bottom-2 duration-150">
            <form
              onSubmit={handleSendKeyboardMessage}
              className="bg-[#141520]/95 border border-cyan-500/50 rounded-2xl p-1.5 pl-3 shadow-2xl backdrop-blur-xl flex items-center space-x-2 ring-1 ring-cyan-500/20"
            >
              <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 3h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h12" />
              </svg>
              <input
                ref={keyboardInputRef}
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="Type to Gemini Live and press Enter to respond..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-neutral-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!typedInput.trim()}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-black rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-1"
              >
                <span>Send</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Voice Relay & Error Notification */}
        {isVoiceRelayActive && (
          <div className="absolute top-3 mx-4 z-40 max-w-lg bg-[#19142e]/95 border border-purple-500/60 text-purple-100 p-2.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 backdrop-blur-lg animate-in fade-in text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-purple-200">Neural Voice Relay Active (24kHz)</p>
              <p className="text-[10px] text-purple-300/80 truncate">
                {reconnectCountdown !== null
                  ? `Live stream slots at capacity. Retrying in ${reconnectCountdown}s...`
                  : 'Live stream slots busy. You can speak or type seamlessly.'}
              </p>
            </div>
            <button
              onClick={() => connectToLiveApi(true)}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-mono font-bold shadow flex-shrink-0 transition-colors"
            >
              {reconnectCountdown !== null ? `Retry (${reconnectCountdown}s)` : 'Retry Live'}
            </button>
            <button
              onClick={() => {
                setErrorMessage(null);
                setIsVoiceRelayActive(false);
              }}
              className="p-1 text-purple-400 hover:text-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {errorMessage && !isVoiceRelayActive && (
          <div className="absolute top-3 mx-4 z-40 max-w-md bg-rose-950/95 border border-rose-500/60 text-rose-100 p-2.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 backdrop-blur-lg animate-in fade-in text-xs">
            <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 truncate">
              <p className="font-semibold">{errorMessage}</p>
            </div>
            <button
              onClick={() => connectToLiveApi(true)}
              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold shadow flex-shrink-0"
            >
              Retry
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 text-rose-300 hover:text-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 3. Ergonomic Mobile-Friendly Bottom Control Dock */}
      <footer className="w-full max-w-xl mx-auto px-3 pb-4 pt-1 z-30">
        <div className="bg-[#12131d]/90 border border-white/15 rounded-3xl p-1.5 sm:p-2 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-1 w-full ring-1 ring-white/10">
          
          {/* Group 1: Input Tools (Mic, Keyboard, Camera) */}
          <div className="flex items-center space-x-1">
            
            {/* Mute Button */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-inner'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
              title={isMuted ? 'Unmute microphone [M]' : 'Mute microphone [M]'}
            >
              {isMuted ? (
                <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {/* Keyboard Dock Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsKeyboardMode(!isKeyboardMode);
                if (!isKeyboardMode) setTimeout(() => keyboardInputRef.current?.focus(), 50);
              }}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                isKeyboardMode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Keyboard Input [T]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 3h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h12" />
              </svg>
            </button>

            {/* Camera Toggle */}
            <button
              type="button"
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                isCameraOn
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
              title={isCameraOn ? 'Turn camera off [V]' : 'Turn camera on (1 FPS video stream) [V]'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Group 2: Center Primary Interrupt / Speak Action */}
          <button
            type="button"
            onClick={handleInterruptOrSpeak}
            className={`px-4 sm:px-6 h-11 rounded-2xl flex items-center space-x-2 font-bold text-xs transition-all shadow-lg active:scale-95 ${
              status === 'speaking'
                ? 'bg-cyan-500 text-black animate-pulse shadow-cyan-500/40'
                : 'bg-white/15 text-white hover:bg-white/20'
            }`}
            title="Interrupt or Speak [Space]"
          >
            <div className="flex items-center space-x-0.5 h-3">
              <span className={`w-0.5 rounded-full ${status === 'speaking' ? 'bg-black h-3 animate-pulse' : 'bg-cyan-400 h-2'}`} />
              <span className={`w-0.5 rounded-full ${status === 'speaking' ? 'bg-black h-4 animate-pulse' : 'bg-cyan-400 h-3'}`} />
              <span className={`w-0.5 rounded-full ${status === 'speaking' ? 'bg-black h-2.5 animate-pulse' : 'bg-cyan-400 h-1.5'}`} />
            </div>
            <span>{status === 'speaking' ? 'Interrupt' : 'Live Voice'}</span>
          </button>

          {/* Group 3: Session Tools (Captions, Options Drawer, Close) */}
          <div className="flex items-center space-x-1">
            
            {/* Captions Toggle */}
            <button
              type="button"
              onClick={() => setShowCaptions(!showCaptions)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                showCaptions
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Live Subtitles [C]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </button>

            {/* Options & Tools Drawer Button */}
            <button
              type="button"
              onClick={() => setShowToolsDrawer(true)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-all"
              title="Options & Tools Drawer [S]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Exit / Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-rose-950/40 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 flex items-center justify-center transition-all"
              title="Close Live Session [Esc]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

          </div>
        </div>
      </footer>

      {/* 4. Revamped Options & Tools Modal (Mobile Bottom Sheet + Desktop Modal) */}
      {showToolsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#11121c] border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#151724]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Live Options & Tools</h3>
                  <p className="text-[10px] text-neutral-400">Configure models, neural voices, and tools</p>
                </div>
              </div>
              <button
                onClick={() => setShowToolsDrawer(false)}
                className="p-1 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modular Space Tabs */}
            <div className="flex border-b border-white/10 bg-[#0e0f17] px-4 overflow-x-auto custom-scrollbar">
              {[
                { id: 'voices', label: 'Voices', icon: '🎙' },
                { id: 'models', label: 'Models & AI', icon: '⚡' },
                { id: 'acoustics', label: 'Acoustics', icon: '🎚' },
                { id: 'vision', label: 'Vision', icon: '📷' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveToolsTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all flex-shrink-0 ${
                    activeToolsTab === tab.id
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Drawer Body with Dedicated Modular Spaces */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
              
              {/* Space 1: Gemini Voice Personas */}
              {activeToolsTab === 'voices' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">Gemini Neural Voice Models</h4>
                      <p className="text-[10px] text-neutral-400">24kHz native synthesized neural personas</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Active: {selectedVoice}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {VOICES.map(v => (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => setSelectedVoice(v.name)}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          selectedVoice === v.name
                            ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md'
                            : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{v.name}</span>
                          {selectedVoice === v.name && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-tight mb-1">{v.desc}</p>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                          {v.gender}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Space 2: Models & Intelligence */}
              {activeToolsTab === 'models' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1.5">Select Live Model</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLiveModel('gemini-3.8-live');
                          if (thinkingEnabled && onToggleThinking) onToggleThinking();
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          selectedLiveModel === 'gemini-3.8-live'
                            ? 'bg-cyan-500/20 border-cyan-500 text-white shadow'
                            : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs font-mono text-cyan-300">gemini-3.8-live</span>
                          {selectedLiveModel === 'gemini-3.8-live' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500 text-black font-bold">ACTIVE</span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-300">Ultra low-latency, real-time voice and vision interaction.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLiveModel('gemini-3.8-live-extended-thinking');
                          if (!thinkingEnabled && onToggleThinking) onToggleThinking();
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          selectedLiveModel === 'gemini-3.8-live-extended-thinking'
                            ? 'bg-indigo-500/20 border-indigo-500 text-white shadow'
                            : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs font-mono text-indigo-300">gemini-3.8-live-extended-thinking</span>
                          {selectedLiveModel === 'gemini-3.8-live-extended-thinking' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500 text-white font-bold">ACTIVE</span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-300">Extended reasoning engine: thinks deeply and deliberates before speaking.</p>
                      </button>
                    </div>
                  </div>

                  {/* Capabilities Toggles */}
                  <div className="bg-black/40 rounded-2xl p-3 border border-white/5 space-y-2.5">
                    <h5 className="font-bold text-neutral-300 text-[11px] uppercase tracking-wider">Grounding & Tools</h5>
                    
                    {/* Google Search Grounding */}
                    {onToggleSearch && (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-neutral-200 text-xs">Google Search Grounding</div>
                          <div className="text-[10px] text-neutral-400">Ground voice responses with live web search</div>
                        </div>
                        <button
                          type="button"
                          onClick={onToggleSearch}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                            searchEnabled ? 'bg-cyan-500' : 'bg-neutral-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            searchEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    )}

                    {/* Student Feynman Mode */}
                    {onToggleStudent && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <div>
                          <div className="font-semibold text-neutral-200 text-xs">Feynman Explanation Mode</div>
                          <div className="text-[10px] text-neutral-400">Clarifies concepts with intuitive analogies</div>
                        </div>
                        <button
                          type="button"
                          onClick={onToggleStudent}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                            studentEnabled ? 'bg-cyan-500' : 'bg-neutral-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            studentEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Space 3: Acoustics & Expressivity */}
              {activeToolsTab === 'acoustics' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5 space-y-4">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-neutral-300 font-semibold">Vocal Expressivity</span>
                        <span className="text-cyan-400 font-mono font-bold">{expressivityLevel}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={expressivityLevel}
                        onChange={(e) => setExpressivityLevel(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-neutral-500 mt-1">
                        <span>Calm & Deliberate</span>
                        <span>Balanced</span>
                        <span>Animated & Warm</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-neutral-300 font-semibold">Speech Playback Rate</span>
                        <span className="text-cyan-400 font-mono font-bold">{playbackSpeed.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.7"
                        step="0.1"
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-neutral-500 mt-1">
                        <span>0.7x (Slow)</span>
                        <span>1.0x (Normal)</span>
                        <span>1.7x (Brisk)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Space 4: Vision & Camera */}
              {activeToolsTab === 'vision' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-neutral-200 text-xs">Live Camera Stream</div>
                        <div className="text-[10px] text-neutral-400">Streams 1 FPS JPEG video frames to Gemini Live</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCameraOn(!isCameraOn)}
                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                          isCameraOn ? 'bg-cyan-500' : 'bg-neutral-800'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          isCameraOn ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {isCameraOn && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-xs text-neutral-300">Camera Source</span>
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          className="px-3 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-cyan-300 font-mono text-xs hover:bg-cyan-900/60 transition-colors"
                        >
                          {facingMode === 'user' ? 'Front (Selfie)' : 'Rear (Environment)'} ⟲
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-white/10 bg-[#151724] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(true)}
                className="text-neutral-400 hover:text-white text-[11px] font-mono flex items-center space-x-1"
              >
                <span>⌨ Shortcuts</span>
              </button>

              <button
                type="button"
                onClick={() => setShowToolsDrawer(false)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                Apply & Return
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Shortcuts Cheat Sheet Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-[#12131c] border border-white/15 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-white text-sm">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Interrupt / Talk</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">Space</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Type with Keyboard</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">T / K</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Mute / Unmute Mic</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">M</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Toggle Subtitles</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">C</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Toggle Camera</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">V</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Options Drawer</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">S</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Exit Live Mode</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">Esc</span>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
