import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LiveServerMessage, Modality, ThinkingLevel } from "@google/genai";
import { ai } from '../services/geminiService';
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

// Expanded voice list with distinct sonic personas
const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede', 'Calliope', 'Leda'];

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
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Control Bar States
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Keyboard Mode State
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [typedInput, setTypedInput] = useState('');
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

  // Session & Sources
  const sessionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const speedRef = useRef(1.0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Speech Recognition for live user captions
  const recognitionRef = useRef<any>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

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
        ...prev.slice(-40), // keep last 40 captions
        { id: Math.random().toString(36).substring(7), sender, text, timestamp: Date.now() }
      ];
    });
  }, []);

  // Web Speech Recognition for User Captions
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
            addCaption('user', transcript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.debug('Speech recognition notice:', event.error);
          }
        };

        recognition.onend = () => {
          // Restart if still in live mode and unmuted
          if (isConnectedRef.current && !isMutedRef.current) {
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

  // Connect to Live API on mount or configuration changes
  useEffect(() => {
    connectToLiveApi();
    return () => {
      cleanup();
    };
  }, [selectedVoice, thinkingEnabled, studentEnabled, searchEnabled, expressivityLevel]);

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
      // Clean up previous tracks first
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

      // Stream frames at 1 FPS
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = setInterval(() => {
        captureAndSendVideoFrame();
      }, 1000);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      // If environment camera fails, fallback to user camera
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
        sessionRef.current.sendRealtimeInput([
          {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        ]);
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
      const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
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

  // Core Connection Handler
  const connectToLiveApi = async () => {
    cleanup();
    setStatus('connecting');
    setErrorMessage(null);

    try {
      // 1. Initialize Output Audio Context (24kHz standard for Gemini Live)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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

      // 2. Initialize Input Audio Context (16kHz standard for Gemini input)
      const inCtx = new AudioCtx({ sampleRate: 16000 });
      inputAudioContextRef.current = inCtx;

      const inAnalyser = inCtx.createAnalyser();
      inAnalyser.fftSize = 256;
      inputAnalyserRef.current = inAnalyser;
      inputDataArrayRef.current = new Uint8Array(inAnalyser.frequencyBinCount);

      // 3. Microphone Capture
      const stream = await navigator.mediaDevices.getUserMedia({
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
        if (!isConnectedRef.current || isMutedRef.current || !sessionRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const base64Pcm = encodePCM16Base64(pcm16);
        try {
          sessionRef.current.sendRealtimeInput([
            {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Pcm
            }
          ]);
        } catch (sendErr) {
          console.warn('PCM streaming error:', sendErr);
        }
      };

      source.connect(processor);
      processor.connect(inCtx.destination);

      // 4. Model & Persona Setup
      const liveModel = thinkingEnabled ? 'gemini-3.8-live-extended-thinking' : 'gemini-3.8-live';

      let systemInstruction = activeModel?.systemInstruction || "You are an intelligent, natural conversational AI companion.";

      // Expressivity Prompt Modulation
      if (expressivityLevel > 80) {
        systemInstruction += "\nSpeak with high enthusiasm, animated cadence, and warm emotional inflection.";
      } else if (expressivityLevel < 40) {
        systemInstruction += "\nSpeak in a calm, grounded, deliberate, and concise tone.";
      }

      if (studentEnabled) {
        systemInstruction += "\nAdopt the Feynman technique: clarify complex concepts into intuitive, relatable analogies.";
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

      if (thinkingEnabled) {
        sessionConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      // 5. Connect via ai.live.connect
      let session: any;
      try {
        session = await ai.live.connect({
          model: liveModel,
          config: sessionConfig,
          callbacks: {
            onopen: () => {
              setIsConnected(true);
              isConnectedRef.current = true;
              setStatus('listening');
            },
            onmessage: async (message: LiveServerMessage) => {
              // Check for model transcriptions
              const textParts = message.serverContent?.modelTurn?.parts;
              if (textParts) {
                for (const part of textParts) {
                  if (part.text) {
                    addCaption('model', part.text);
                  }
                }
              }

              // Check for alternative transcription fields
              const outTranscript = (message.serverContent as any)?.outputAudioTranscription?.text;
              if (outTranscript) {
                addCaption('model', outTranscript);
              }

              const inTranscript = (message.serverContent as any)?.inputAudioTranscription?.text;
              if (inTranscript) {
                addCaption('user', inTranscript);
              }

              // Handle Model Audio Output safely
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                setStatus('speaking');
                const ctx = outputAudioContextRef.current;
                const node = outputGainNodeRef.current;
                if (!ctx || !node || ctx.state === 'closed') return;

                const decodedBytes = decodeBase64Safe(base64Audio);
                if (!decodedBytes) return;

                const audioBuffer = decodeAudioDataSafe(decodedBytes, ctx, 24000, 1);
                if (!audioBuffer) return;

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
              }

              // Handle User Interruption
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(source => {
                  try { source.stop(); } catch (e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setStatus('listening');
              }
            },
            onclose: (closeEvent) => {
              setIsConnected(false);
              isConnectedRef.current = false;
              setStatus('disconnected');
              if (closeEvent && closeEvent.code !== 1000) {
                setErrorMessage(`Connection closed (code ${closeEvent.code}). Click Retry to reconnect.`);
              }
            },
            onerror: (err: any) => {
              console.error('Live Connection Error:', err);
              setIsConnected(false);
              isConnectedRef.current = false;
              setStatus('disconnected');
              setErrorMessage('Connection error. Please check your network and API key.');
            }
          }
        });
      } catch (connErr: any) {
        // Fallback for thinking model if not supported
        if (thinkingEnabled && liveModel === 'gemini-3.8-live-extended-thinking') {
          sessionConfig.thinkingConfig = undefined;
          session = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: sessionConfig,
            callbacks: {
              onopen: () => {
                setIsConnected(true);
                isConnectedRef.current = true;
                setStatus('listening');
              },
              onmessage: async (message: LiveServerMessage) => {
                const textParts = message.serverContent?.modelTurn?.parts;
                if (textParts) {
                  for (const part of textParts) {
                    if (part.text) addCaption('model', part.text);
                  }
                }
              },
              onclose: () => {
                setIsConnected(false);
                isConnectedRef.current = false;
                setStatus('disconnected');
              },
              onerror: () => {
                setIsConnected(false);
                isConnectedRef.current = false;
                setStatus('disconnected');
              }
            }
          });
        } else {
          throw connErr;
        }
      }

      sessionRef.current = session;
    } catch (err: any) {
      console.error("Failed to connect to Live API:", err);
      setStatus('disconnected');
      setIsConnected(false);
      isConnectedRef.current = false;
      setErrorMessage(err.message || "Failed to initialize Live audio session.");
    }
  };

  // Cleanup handler
  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }

    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      mediaStreamRef.current = null;
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close().catch(() => {});
      inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(() => {});
      outputAudioContextRef.current = null;
    }

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }

    stopCamera();
  };

  // Keyboard Mode: Send text message to Live session
  const handleSendKeyboardMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = typedInput.trim();
    if (!textToSend) return;

    // Append user caption immediately
    addCaption('user', textToSend);
    setTypedInput('');

    // Re-focus keyboard input for continuous typing
    setTimeout(() => {
      keyboardInputRef.current?.focus();
    }, 10);

    // Interrupt any currently playing assistant speech
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (err) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    // Send text turn to the Live session
    try {
      if (sessionRef.current) {
        sessionRef.current.send({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text: textToSend }]
              }
            ],
            turnComplete: true
          }
        });
      }
    } catch (err: any) {
      console.warn("Keyboard text message dispatch error:", err);
    }
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
    } else {
      if (isMuted) setIsMuted(false);
      // Wake up audio contexts if suspended
      if (inputAudioContextRef.current?.state === 'suspended') {
        inputAudioContextRef.current.resume();
      }
      if (outputAudioContextRef.current?.state === 'suspended') {
        outputAudioContextRef.current.resume();
      }
    }
  };

  // Global Keyboard Shortcuts for Live Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const activeEl = document.activeElement as HTMLElement;
      const isInput = (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) ||
                      (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable));

      // Escape always closes Live Mode or active modal
      if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
          return;
        }
        if (isInput) {
          if (activeEl && typeof activeEl.blur === 'function') activeEl.blur();
          return;
        }
        onClose();
        return;
      }

      // If user is actively typing in the keyboard input, allow standard typing
      if (isInput) {
        return;
      }

      // Live Mode Global Shortcuts
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handleInterruptOrSpeak();
          break;
        case 't':
        case 'k':
          e.preventDefault();
          setIsKeyboardMode(true);
          setTimeout(() => keyboardInputRef.current?.focus(), 50);
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
        case 'c':
          e.preventDefault();
          setShowCaptions(prev => !prev);
          break;
        case 'v':
          e.preventDefault();
          setIsCameraOn(prev => !prev);
          break;
        case 's':
          e.preventDefault();
          setShowSettings(prev => !prev);
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, showShortcutsHelp, status, isMuted, onClose]);

  // Audio Visualizer Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      let outputLevel = 0;
      if (outputAnalyserRef.current && outputDataArrayRef.current && status === 'speaking') {
        outputAnalyserRef.current.getByteFrequencyData(outputDataArrayRef.current);
        const sum = outputDataArrayRef.current.reduce((a, b) => a + b, 0);
        outputLevel = sum / outputDataArrayRef.current.length / 255;
        setLiveExpressivityScore(Math.min(100, Math.round(outputLevel * 140)));
      } else {
        setLiveExpressivityScore(0);
      }

      let inputLevel = 0;
      if (inputAnalyserRef.current && inputDataArrayRef.current && !isMutedRef.current && status === 'listening') {
        inputAnalyserRef.current.getByteFrequencyData(inputDataArrayRef.current);
        const sum = inputDataArrayRef.current.reduce((a, b) => a + b, 0);
        inputLevel = sum / inputDataArrayRef.current.length / 255;
      }

      const activeLevel = status === 'speaking' ? outputLevel : inputLevel;
      const baseRadius = 60 + activeLevel * 50;

      // Outer Pulsing Glow
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, baseRadius * 2);
      if (status === 'speaking') {
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
        gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (status === 'listening') {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core Dynamic Wave Rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        ctx.beginPath();
        const numPoints = 64;
        for (let i = 0; i <= numPoints; i++) {
          const theta = (i / numPoints) * Math.PI * 2;
          const wave = Math.sin(theta * 6 + angle + r) * (activeLevel * 20 + 4);
          const rad = baseRadius + r * 15 + wave;
          const x = centerX + Math.cos(theta) * rad;
          const y = centerY + Math.sin(theta) * rad;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.strokeStyle = status === 'speaking'
          ? `rgba(6, 182, 212, ${0.8 - r * 0.2})`
          : status === 'listening'
          ? `rgba(16, 185, 129, ${0.7 - r * 0.2})`
          : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2.5;
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
    <div className="fixed inset-0 z-50 bg-[#08090d] text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-300">
      
      {/* 1. Header with Mode Badges & Shortcuts Help */}
      <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <span className={`w-2.5 h-2.5 rounded-full ${
              status === 'speaking' 
                ? 'bg-cyan-400 animate-ping' 
                : status === 'listening' 
                ? 'bg-emerald-400 animate-pulse' 
                : isConnected 
                ? 'bg-blue-400' 
                : 'bg-amber-400'
            }`} />
            <span className="text-xs font-mono font-medium tracking-wide uppercase">
              {status === 'speaking' ? 'AI Responding' : status === 'listening' ? 'Listening' : status}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-neutral-400 font-mono">
            <span>Voice: <strong className="text-cyan-300">{selectedVoice}</strong></span>
            <span>•</span>
            <span>Rate: <strong className="text-white">{playbackSpeed}x</strong></span>
          </div>
        </div>

        {/* Action Pills & Modality Toggles */}
        <div className="flex items-center space-x-2">
          {/* Keyboard / Voice Mode Switch */}
          <button
            onClick={() => {
              setIsKeyboardMode(!isKeyboardMode);
              if (!isKeyboardMode) {
                setTimeout(() => keyboardInputRef.current?.focus(), 100);
              }
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              isKeyboardMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
            }`}
            title="Toggle Keyboard Input Mode (Shortcut: T or K)"
          >
            <span>⌨</span>
            <span>{isKeyboardMode ? 'Keyboard Mode Active' : 'Keyboard Mode [T]'}</span>
          </button>

          {/* Search Grounding Toggle */}
          {onToggleSearch && (
            <button
              onClick={onToggleSearch}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 border transition-all ${
                searchEnabled 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' 
                  : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'
              }`}
              title="Google Search Grounding"
            >
              <span>🔍</span>
              <span className="hidden md:inline">Search</span>
            </button>
          )}

          {/* Shortcuts Help Toggle */}
          <button
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Keyboard Shortcuts [?]"
          >
            <span className="text-xs font-bold font-mono">?</span>
          </button>
        </div>
      </header>

      {/* 2. Center Stage (Visualizer + Camera Feed + Subtitles + Keyboard Dock) */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center min-h-0">
        
        {/* Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          width={700}
          height={500}
          className="w-full max-w-2xl h-auto aspect-square max-h-[45vh] object-contain cursor-pointer"
          onClick={handleInterruptOrSpeak}
          title="Click to interrupt or speak [Space]"
        />

        {/* Floating Webcam PIP Feed */}
        {isCameraOn && (
          <div className="absolute top-2 right-4 sm:right-8 z-30 w-36 sm:w-48 aspect-[4/3] bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/60 shadow-2xl animate-in zoom-in-95 duration-200">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            {/* Flip / Switch Camera Button on PIP */}
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/70 hover:bg-cyan-600 text-white transition-all shadow-md border border-white/20"
              title={`Switch to ${facingMode === 'user' ? 'Rear / Environment' : 'Front / Selfie'} Camera`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <div className="absolute bottom-1 left-2 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono text-white/90 uppercase font-bold tracking-wider">
                {facingMode === 'user' ? 'Front Cam' : 'Rear Cam'}
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Expressivity Bar Widget */}
        <div className="w-full max-w-sm px-6 flex flex-col items-center space-y-1 mb-2 z-20">
          <div className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <div className="flex items-center space-x-1.5">
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>Vocal Expressivity</span>
            </div>
            <span className="text-cyan-300 font-bold">{expressivityLevel}%</span>
          </div>

          <div className="relative w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-white/10">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 transition-all duration-75 ease-out rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{
                width: status === 'speaking' 
                  ? `${Math.max(15, liveExpressivityScore)}%` 
                  : `${expressivityLevel}%`,
                opacity: status === 'speaking' ? 0.95 : 0.6
              }}
            />
          </div>
        </div>

        {/* FIX: High-Visibility Live Subtitles & Captions Overlay */}
        {showCaptions && (
          <div className={`w-full max-w-2xl px-4 z-30 transition-all duration-200 ${
            isExpandedTranscript ? 'fixed inset-x-4 top-20 bottom-32 max-w-3xl mx-auto z-40' : 'mb-2'
          }`}>
            <div className={`bg-[#0d0e14]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col ${
              isExpandedTranscript ? 'h-full overflow-hidden' : 'max-h-36 sm:max-h-40 overflow-y-auto'
            }`}>
              
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                    Live Subtitles & Captions
                  </span>
                </div>

                <button
                  onClick={() => setIsExpandedTranscript(!isExpandedTranscript)}
                  className="text-[11px] text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 font-mono transition-colors"
                >
                  {isExpandedTranscript ? 'Collapse Strip' : 'Expand Transcript'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {captions.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic text-center font-mono py-2">
                    Listening for voice input or typed messages... Subtitles will appear here in real-time.
                  </p>
                ) : (
                  (isExpandedTranscript ? captions : captions.slice(-4)).map(cap => (
                    <div key={cap.id} className="text-xs leading-relaxed flex items-start space-x-2.5 animate-in fade-in">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold flex-shrink-0 ${
                        cap.sender === 'user' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}>
                        {cap.sender === 'user' ? 'You' : activeModel?.name || 'AI'}
                      </span>
                      <span className="text-neutral-100 font-medium">{cap.text}</span>
                    </div>
                  ))
                )}
                <div ref={captionsEndRef} />
              </div>

            </div>
          </div>
        )}

        {/* KEYBOARD MODE DOCK: Live Text Input Field */}
        {isKeyboardMode && (
          <div className="w-full max-w-xl px-4 z-30 mb-2 animate-in slide-in-from-bottom-3 duration-200">
            <form
              onSubmit={handleSendKeyboardMessage}
              className="bg-[#12131ad0] border border-cyan-500/50 rounded-2xl p-1.5 pl-3 shadow-2xl backdrop-blur-xl flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 3h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h12" />
              </svg>
              <input
                ref={keyboardInputRef}
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="Type a message to Live AI in real-time... (Press Enter to send)"
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-neutral-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!typedInput.trim()}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center space-x-1"
              >
                <span>Send</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="absolute top-4 mx-4 z-40 max-w-md bg-rose-950/90 border border-rose-500 text-rose-100 p-3 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-lg animate-in fade-in">
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 text-xs">
              <p className="font-semibold">{errorMessage}</p>
            </div>
            <button
              onClick={() => connectToLiveApi()}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow"
            >
              Retry
            </button>
          </div>
        )}

      </div>

      {/* 3. Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12131a] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="font-bold text-white text-sm">Live Audio Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs text-neutral-400 font-medium mb-1.5">Voice Persona</label>
                <div className="grid grid-cols-4 gap-2">
                  {VOICES.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVoice(v)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center ${
                        selectedVoice === v
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm'
                          : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-neutral-400 font-medium">Expressivity Level</span>
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
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-neutral-400 font-medium">Speech Rate</span>
                  <span className="text-cyan-400 font-mono font-bold">{playbackSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.8"
                  step="0.1"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-colors"
              >
                Apply & Return
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12131a] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 3h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h12" />
                </svg>
                <span>Live Mode Keyboard Shortcuts</span>
              </h3>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Interrupt / Speak</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">Space</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-400">Keyboard Input Mode</span>
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
                <span className="text-neutral-400">Live Settings</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">S</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Exit Live Mode</span>
                <span className="text-cyan-300 font-bold bg-white/10 px-2 py-0.5 rounded">Esc</span>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="w-full py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* 5. Floating Bottom Live Mode Control Bar */}
      <footer className="w-full max-w-2xl px-4 pb-6 pt-2 z-30 flex justify-center">
        <div className="bg-[#12131ad0] border border-white/15 rounded-3xl p-2 px-3 shadow-2xl backdrop-blur-xl flex items-center justify-between space-x-1.5 sm:space-x-3 w-full">
          
          {/* 1. Speak / Status Button */}
          <button
            type="button"
            onClick={handleInterruptOrSpeak}
            className={`flex items-center space-x-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              status === 'speaking'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                : 'bg-white/10 text-neutral-200 hover:bg-white/15'
            }`}
            title="Click to interrupt or speak (Shortcut: Space)"
          >
            <div className="flex items-center space-x-0.5 h-3">
              <span className={`w-0.5 rounded-full ${status === 'speaking' ? 'bg-cyan-400 h-3 animate-pulse' : 'bg-neutral-400 h-2'}`} />
              <span className={`w-0.5 rounded-full ${status === 'speaking' ? 'bg-cyan-400 h-4 animate-pulse' : 'bg-neutral-400 h-2.5'}`} />
              <span className={`w-0.5 rounded-full ${status === 'speaking' ? 'bg-cyan-400 h-2.5 animate-pulse' : 'bg-neutral-400 h-1.5'}`} />
            </div>
            <span className="hidden sm:inline">
              {status === 'speaking' ? 'Interrupt [Space]' : 'Speak [Space]'}
            </span>
          </button>

          {/* 2. Keyboard Mode Quick Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsKeyboardMode(!isKeyboardMode);
              if (!isKeyboardMode) {
                setTimeout(() => keyboardInputRef.current?.focus(), 50);
              }
            }}
            className={`p-2 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isKeyboardMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Keyboard Input Mode [T]"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 3h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h12" />
            </svg>
            <span className="hidden md:inline">{isKeyboardMode ? 'Text Input' : 'Type [T]'}</span>
          </button>

          {/* 3. Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
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
              <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
            <span className="hidden md:inline">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* 4. Captions Toggle */}
          <button
            type="button"
            onClick={() => setShowCaptions(!showCaptions)}
            className={`p-2 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              showCaptions
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Live Subtitles / Captions [C]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="hidden md:inline">Captions</span>
          </button>

          {/* 5. Camera Toggle */}
          <button
            type="button"
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`p-2 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isCameraOn
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
            title={isCameraOn ? 'Turn camera off [V]' : 'Turn camera on (1 FPS Stream) [V]'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="hidden md:inline">Camera</span>
          </button>

          {/* 5b. Camera Switch / Flip Button */}
          {isCameraOn && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-2 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-neutral-700 transition-all flex items-center space-x-1.5"
              title={`Switch camera (current: ${facingMode === 'user' ? 'Front' : 'Rear'})`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden lg:inline">{facingMode === 'user' ? 'Flip to Rear' : 'Flip to Front'}</span>
            </button>
          )}

          {/* 6. Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-1.5"
            title="Configure Voice, Speed & Expressivity [S]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden md:inline">Settings</span>
          </button>

          {/* 7. Close / Terminate Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition-all flex items-center space-x-1.5"
            title="Terminate Live Mode [Esc]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Close</span>
          </button>

        </div>
      </footer>

    </div>
  );
};
