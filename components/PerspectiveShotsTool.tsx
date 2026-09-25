import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Sparkles, 
  Upload, 
  Rotate3d, 
  RotateCcw, 
  Eye, 
  Sliders, 
  Download, 
  X, 
  Check, 
  Compass, 
  Grid3X3,
  Layers,
  ArrowRight
} from 'lucide-react';
import { GeneratedImageItem } from '../types';
import { editImageWithAI } from '../services/geminiService';
import { saveStoredCreation, trackImageCreation } from '../services/storageService';

interface PerspectiveShotsToolProps {
  initialImage?: string | null;
  onSendToChat?: (imageBase64: string, promptText: string) => void;
  onSavedCreation?: (item: GeneratedImageItem) => void;
  onClose?: () => void;
}

type PerspectivePreset = 
  | 'drone_overhead'
  | 'worms_eye'
  | 'right_to_center'
  | 'left_to_center'
  | 'wide_angle'
  | 'three_quarter'
  | 'dutch_angle'
  | 'extreme_wide'
  | 'custom_3d_drag';

export const PerspectiveShotsTool: React.FC<PerspectiveShotsToolProps> = ({
  initialImage,
  onSendToChat,
  onSavedCreation,
  onClose
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);
  const [selectedPreset, setSelectedPreset] = useState<PerspectivePreset>('drone_overhead');
  const [pitch, setPitch] = useState<number>(0); // -35 to 35
  const [yaw, setYaw] = useState<number>(0);     // -45 to 45
  const [roll, setRoll] = useState<number>(0);   // -25 to 25
  const [zoom, setZoom] = useState<number>(1.0);  // 0.8 to 1.5
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDraggingGizmo = useRef<boolean>(false);
  const gizmoStartRef = useRef<{ x: number; y: number; startPitch: number; startYaw: number }>({ x: 0, y: 0, startPitch: 0, startYaw: 0 });

  const presets = [
    {
      id: 'drone_overhead' as PerspectivePreset,
      name: 'Drone Overhead',
      desc: "Bird's eye view from above",
      icon: '🛸',
      defaults: { pitch: -28, yaw: 0, roll: 0, zoom: 0.9 }
    },
    {
      id: 'worms_eye' as PerspectivePreset,
      name: "Worm's Eye",
      desc: 'Heroic low-angle looking up',
      icon: '🐜',
      defaults: { pitch: 24, yaw: 0, roll: 0, zoom: 1.1 }
    },
    {
      id: 'three_quarter' as PerspectivePreset,
      name: 'Three-Quarter',
      desc: 'Cinematic 45° angle profile',
      icon: '📐',
      defaults: { pitch: -5, yaw: 28, roll: 0, zoom: 1.0 }
    },
    {
      id: 'right_to_center' as PerspectivePreset,
      name: 'Center Stage',
      desc: 'Balance off-center subject into center',
      icon: '🎯',
      defaults: { pitch: 0, yaw: -18, roll: 0, zoom: 1.05 }
    },
    {
      id: 'dutch_angle' as PerspectivePreset,
      name: 'Dutch Angle',
      desc: 'Dynamic cinematic canted tilt',
      icon: '📸',
      defaults: { pitch: -8, yaw: 12, roll: 16, zoom: 1.0 }
    },
    {
      id: 'extreme_wide' as PerspectivePreset,
      name: 'Ultra-Wide 21:9',
      desc: 'Expanded panoramic field of view',
      icon: '🔭',
      defaults: { pitch: 0, yaw: 0, roll: 0, zoom: 0.85 }
    }
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.id);
    setPitch(preset.defaults.pitch);
    setYaw(preset.defaults.yaw);
    setRoll(preset.defaults.roll);
    setZoom(preset.defaults.zoom);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
        setResultImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Interactive 3D Gimbal Pointer Handlers
  const handleGizmoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingGizmo.current = true;
    gizmoStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPitch: pitch,
      startYaw: yaw
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedPreset('custom_3d_drag');
  };

  const handleGizmoPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingGizmo.current) return;
    const dx = e.clientX - gizmoStartRef.current.x;
    const dy = e.clientY - gizmoStartRef.current.y;

    const newYaw = Math.max(-45, Math.min(45, gizmoStartRef.current.startYaw + dx * 0.4));
    const newPitch = Math.max(-35, Math.min(35, gizmoStartRef.current.startPitch - dy * 0.4));

    setYaw(Math.round(newYaw));
    setPitch(Math.round(newPitch));
  };

  const handleGizmoPointerUp = () => {
    isDraggingGizmo.current = false;
  };

  const handleResetAngles = () => {
    setPitch(0);
    setYaw(0);
    setRoll(0);
    setZoom(1.0);
    setSelectedPreset('custom_3d_drag');
  };

  const handleExecutePerspective = async () => {
    if (!imageUrl) return;
    setIsProcessing(true);
    setError(null);

    try {
      const editedDataUrl = await editImageWithAI({
        imageUrl,
        mode: 'perspective_shift',
        instruction: customPrompt.trim() || `Render this scene with the specified 3D camera perspective shot`,
        perspectiveType: selectedPreset,
        perspectiveAngles: {
          rotateX: pitch,
          rotateY: yaw,
          scale: zoom,
          skewX: roll
        },
        quality: 'Cinema 8K'
      });

      setResultImage(editedDataUrl);

      const newItem: GeneratedImageItem = {
        id: `persp_${Date.now()}`,
        url: editedDataUrl,
        originalUrl: imageUrl,
        prompt: `Perspective Shot: ${selectedPreset} (Pitch: ${pitch}°, Yaw: ${yaw}°)`,
        aspectRatio: '1:1',
        createdAt: Date.now(),
        editType: 'perspective_shift',
        editNote: `Adjusted camera perspective (${selectedPreset})`
      };

      await saveStoredCreation(newItem);
      trackImageCreation();
      if (onSavedCreation) onSavedCreation(newItem);
    } catch (err: any) {
      console.error('Perspective shift failed:', err);
      setError(err?.message || 'Failed to change perspective. Please try another shot.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Perspective Shots (3D Camera Shift)</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Virtual Camera Gimbal
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Change the camera angle, vantage point, and 3D perspective of any photo with AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--card-bg)] text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Visual 3D Viewport Area */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-zinc-950/80 relative overflow-hidden">
          {imageUrl ? (
            <div className="relative max-w-full max-h-[75vh] flex items-center justify-center p-6">
              {/* 3D Perspective Stage Container */}
              <div 
                className="relative rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-800 transition-transform duration-100 ease-out cursor-grab active:cursor-grabbing select-none"
                style={{
                  perspective: '1000px'
                }}
                onPointerDown={handleGizmoPointerDown}
                onPointerMove={handleGizmoPointerMove}
                onPointerUp={handleGizmoPointerUp}
              >
                <div
                  style={{
                    transform: `perspective(800px) rotateX(${resultImage ? 0 : pitch}deg) rotateY(${resultImage ? 0 : yaw}deg) rotateZ(${resultImage ? 0 : roll}deg) scale(${resultImage ? 1 : zoom})`,
                    transformOrigin: 'center center',
                    transition: isDraggingGizmo.current ? 'none' : 'transform 0.2s ease-out'
                  }}
                  className="relative flex items-center justify-center"
                >
                  <img
                    src={showOriginal || !resultImage ? imageUrl : resultImage}
                    alt="Perspective Viewport"
                    className="max-h-[60vh] max-w-full object-contain pointer-events-none"
                    draggable={false}
                  />

                  {/* Perspective Guidelines & Vanishing Lines Overlay */}
                  {showGrid && !resultImage && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Rule of Thirds */}
                      <div className="absolute inset-0 border border-amber-500/20 grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-amber-500/20"></div>
                        <div className="border-r border-b border-amber-500/20"></div>
                        <div className="border-b border-amber-500/20"></div>
                        <div className="border-r border-b border-amber-500/20"></div>
                        <div className="border-r border-b border-amber-500/20"></div>
                        <div className="border-b border-amber-500/20"></div>
                        <div className="border-r border-amber-500/20"></div>
                        <div className="border-r border-amber-500/20"></div>
                        <div></div>
                      </div>

                      {/* Vanishing Point Crosshair */}
                      <div 
                        className="absolute w-4 h-4 border-2 border-amber-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"
                        style={{
                          left: `${50 + (yaw * 0.4)}%`,
                          top: `${50 - (pitch * 0.4)}%`
                        }}
                      >
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full absolute inset-0 m-auto"></div>
                      </div>

                      {/* Horizon Line */}
                      <div 
                        className="absolute left-0 right-0 border-t border-amber-400/40 pointer-events-none"
                        style={{
                          top: `${50 - (pitch * 0.4)}%`,
                          transform: `rotate(${roll}deg)`
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Drag Hint Tag */}
                {!resultImage && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-[10px] text-amber-300 border border-amber-500/30 flex items-center gap-1.5 pointer-events-none">
                    <Rotate3d className="w-3.5 h-3.5" />
                    <span>Drag photo to rotate 3D camera gimbal</span>
                  </div>
                )}

                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                      <Camera className="w-7 h-7 text-amber-400 absolute inset-0 m-auto" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">Re-rendering Perspective Shot...</h4>
                      <p className="text-xs text-zinc-400 max-w-sm">
                        Calculating 3D vanishing points, recalculating ground plane shadows, line convergence, and re-framing camera...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg p-12 border-2 border-dashed border-zinc-700 hover:border-amber-500/50 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Select Photo for Perspective Shift</h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-4">
                Choose any photo to adjust its camera angle, convert to drone overhead, heroic low-angle, or cinematic 3/4 view.
              </p>
              <span className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-lg">
                Upload Photo
              </span>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Right Controls Panel */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border-color)] bg-[var(--card-bg)] p-5 overflow-y-auto space-y-6">
          {imageUrl && (
            <>
              {/* Presets Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Cinematic Perspective Shots</span>
                  <span className="text-[10px] text-zinc-400">Presets</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map(p => {
                    const isSelected = selectedPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30' 
                            : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{p.icon}</span>
                          <span>{p.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Angle & Gimbal Sliders */}
              <div className="space-y-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gimbal Orientation</span>
                  </span>
                  <button
                    onClick={handleResetAngles}
                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Pitch (Tilt Up / Down) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-zinc-300">Pitch (Tilt Up/Down): {pitch}°</span>
                    <span className="text-amber-400 text-[10px]">
                      {pitch < -10 ? 'High Overhead' : pitch > 10 ? 'Low Angle' : 'Level'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-35"
                    max="35"
                    value={pitch}
                    onChange={(e) => {
                      setPitch(Number(e.target.value));
                      setSelectedPreset('custom_3d_drag');
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-400">
                    <span>Overhead (-35°)</span>
                    <span>Horizon (0°)</span>
                    <span>Upward (+35°)</span>
                  </div>
                </div>

                {/* Yaw (Rotate Left / Right) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-zinc-300">Yaw (Pan Left/Right): {yaw}°</span>
                    <span className="text-amber-400 text-[10px]">
                      {yaw < -10 ? 'View from Left' : yaw > 10 ? 'View from Right' : 'Frontal'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={yaw}
                    onChange={(e) => {
                      setYaw(Number(e.target.value));
                      setSelectedPreset('custom_3d_drag');
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-400">
                    <span>Left (-45°)</span>
                    <span>Center (0°)</span>
                    <span>Right (+45°)</span>
                  </div>
                </div>

                {/* Dutch Tilt (Roll) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-zinc-300">Dutch Roll: {roll}°</span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    value={roll}
                    onChange={(e) => {
                      setRoll(Number(e.target.value));
                      setSelectedPreset('custom_3d_drag');
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Overlay Toggle */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-zinc-300">Perspective Grid & Horizon</span>
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      showGrid 
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {showGrid ? 'Grid On' : 'Grid Off'}
                  </button>
                </div>
              </div>

              {/* Optional Custom Directive */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Additional Camera Directives</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Keep facial expression identical, widen depth of field..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Error Notice */}
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-200">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleExecutePerspective}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Perspective Shot with AI</span>
                </button>

                {resultImage && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="w-full py-2.5 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{showOriginal ? 'Viewing New Perspective' : 'Hold to View Original Angle'}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (onSendToChat && resultImage) {
                            onSendToChat(resultImage, `Changed perspective shot: ${selectedPreset}`);
                            if (onClose) onClose();
                          }
                        }}
                        className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all text-center"
                      >
                        Send to Chat →
                      </button>
                      <a
                        href={resultImage}
                        download={`perspective_shot_${Date.now()}.png`}
                        className="py-2 px-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition-all text-center block"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 text-xs text-zinc-400 hover:text-white transition-all text-center"
                >
                  Choose Different Photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
