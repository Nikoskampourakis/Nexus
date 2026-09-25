import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Trash2, 
  RotateCcw, 
  Undo, 
  Upload, 
  Check, 
  ArrowRight, 
  Sliders, 
  Eye, 
  Maximize2,
  X,
  Layers,
  Info
} from 'lucide-react';
import { GeneratedImageItem } from '../types';
import { editImageWithAI } from '../services/geminiService';
import { saveStoredCreation, trackImageCreation } from '../services/storageService';

interface RemoveObjectToolProps {
  initialImage?: string | null;
  onSendToChat?: (imageBase64: string, promptText: string) => void;
  onSavedCreation?: (item: GeneratedImageItem) => void;
  onClose?: () => void;
}

type GestureMode = 'brush' | 'lasso' | 'box';

export const RemoveObjectTool: React.FC<RemoveObjectToolProps> = ({
  initialImage,
  onSendToChat,
  onSavedCreation,
  onClose
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);
  const [gestureMode, setGestureMode] = useState<GestureMode>('brush');
  const [brushSize, setBrushSize] = useState<number>(30);
  const [objectHint, setObjectHint] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [hasGestureMask, setHasGestureMask] = useState(false);

  // Canvas refs
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const strokesRef = useRef<Array<Array<{ x: number; y: number; r: number }>>>([]);
  const currentStrokeRef = useRef<Array<{ x: number; y: number; r: number }>>([]);
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize canvas overlay when image loads
  const handleImageLoad = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    canvas.width = img.clientWidth || img.naturalWidth || 600;
    canvas.height = img.clientHeight || img.naturalHeight || 600;
    clearCanvas();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    currentStrokeRef.current = [];
    boxStartRef.current = null;
    setHasGestureMask(false);
  };

  const redrawAllStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue;
      drawStrokePath(ctx, stroke);
    }
    setHasGestureMask(strokesRef.current.length > 0);
  };

  const drawStrokePath = (ctx: CanvasRenderingContext2D, stroke: Array<{ x: number; y: number; r: number }>) => {
    if (stroke.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)'; // Glowing Neon Red / Orange mask
    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.lineWidth = stroke[0].r * 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();

    if (gestureMode === 'lasso' && stroke.length > 2) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isProcessing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (gestureMode === 'box') {
      boxStartRef.current = { x, y };
      return;
    }

    currentStrokeRef.current = [{ x, y, r: brushSize / 2 }];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gestureMode === 'box' && boxStartRef.current) {
      redrawAllStrokes();
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      const bx = Math.min(boxStartRef.current.x, x);
      const by = Math.min(boxStartRef.current.y, y);
      const bw = Math.abs(x - boxStartRef.current.x);
      const bh = Math.abs(y - boxStartRef.current.y);
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
      return;
    }

    // Freehand gesture or lasso
    const stroke = currentStrokeRef.current;
    stroke.push({ x, y, r: brushSize / 2 });

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
    ctx.lineWidth = brushSize;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;

    if (stroke.length > 1) {
      ctx.beginPath();
      ctx.moveTo(stroke[stroke.length - 2].x, stroke[stroke.length - 2].y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (gestureMode === 'box' && boxStartRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Convert box to path stroke for undo support
        const pts = [
          { x: boxStartRef.current.x, y: boxStartRef.current.y, r: 2 },
          { x: boxStartRef.current.x, y: boxStartRef.current.y, r: 2 }
        ];
        strokesRef.current.push(pts);
      }
      boxStartRef.current = null;
      setHasGestureMask(true);
      return;
    }

    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current]);
      currentStrokeRef.current = [];
      setHasGestureMask(true);
      if (gestureMode === 'lasso') {
        redrawAllStrokes();
      }
    }
  };

  const handleUndo = () => {
    strokesRef.current.pop();
    redrawAllStrokes();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
        setResultImage(null);
        clearCanvas();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteRemove = async () => {
    if (!imageUrl) return;
    setIsProcessing(true);
    setError(null);

    try {
      // Export gesture mask as base64
      let maskBase64: string | undefined = undefined;
      if (canvasRef.current && hasGestureMask) {
        maskBase64 = canvasRef.current.toDataURL('image/png');
      }

      const promptText = objectHint.trim() || 'the object selected by gesture mask';

      const editedDataUrl = await editImageWithAI({
        imageUrl,
        mode: 'remove_object',
        instruction: `Surgically remove ${promptText}. Seamlessly inpaint, fill, and reconstruct the surrounding texture, lighting, and background with zero trace of the removed subject.`,
        targetObject: objectHint.trim() || 'marked object',
        gestureMaskBase64: maskBase64,
        quality: 'Ultra Pro'
      });

      setResultImage(editedDataUrl);
      setShowComparison(true);

      const newItem: GeneratedImageItem = {
        id: `rm_obj_${Date.now()}`,
        url: editedDataUrl,
        originalUrl: imageUrl,
        prompt: `Removed: ${promptText}`,
        aspectRatio: '1:1',
        createdAt: Date.now(),
        editType: 'remove_object',
        editNote: `Erased ${promptText} via gesture selection`
      };

      const saved = await saveStoredCreation(newItem);
      trackImageCreation();
      if (onSavedCreation) onSavedCreation(newItem);
    } catch (err: any) {
      console.error('Object removal failed:', err);
      setError(err?.message || 'Failed to remove selected object. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Remove Objects (Magic Eraser)</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                Gesture Inpainting
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Draw or gesture over unwanted objects, people, or flaws to erase them with AI</p>
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
        {/* Left / Center Canvas Area */}
        <div className="flex-1 p-4 flex flex-col items-center justify-center bg-zinc-950/80 relative overflow-hidden">
          {imageUrl ? (
            <div className="relative max-w-full max-h-[75vh] flex items-center justify-center rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
              {/* Display Result or Source */}
              <img
                ref={imageRef}
                src={showComparison && resultImage ? resultImage : imageUrl}
                alt="Source canvas"
                onLoad={handleImageLoad}
                className="max-h-[70vh] max-w-full object-contain select-none pointer-events-none"
                draggable={false}
              />

              {/* Gesture Drawing Canvas Overlay */}
              {!resultImage && (
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
                />
              )}

              {/* Status Indicator */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin"></div>
                    <Trash2 className="w-6 h-6 text-red-400 absolute inset-0 m-auto" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">Surgically Erasing Object...</h4>
                    <p className="text-xs text-zinc-400 max-w-xs">Analyzing gesture boundaries, inpainting background texture, and blending ambient shadows...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg p-12 border-2 border-dashed border-zinc-700 hover:border-red-500/50 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Select an Image to Edit</h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-4">Upload any photograph from your device to gesture and remove unwanted elements.</p>
              <span className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg">
                Browse Photo
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
              {/* Tool Mode Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Gesture Selection Tool</span>
                  <span className="text-[10px] text-zinc-400">Touch or Mouse</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setGestureMode('brush')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      gestureMode === 'brush' 
                        ? 'bg-red-500/20 border-red-500/50 text-red-300 ring-1 ring-red-500/30' 
                        : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>🖌️ Brush</span>
                    <span className="text-[9px] font-normal opacity-70">Freehand swipe</span>
                  </button>
                  <button
                    onClick={() => setGestureMode('lasso')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      gestureMode === 'lasso' 
                        ? 'bg-red-500/20 border-red-500/50 text-red-300 ring-1 ring-red-500/30' 
                        : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>➰ Lasso</span>
                    <span className="text-[9px] font-normal opacity-70">Loop boundary</span>
                  </button>
                  <button
                    onClick={() => setGestureMode('box')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      gestureMode === 'box' 
                        ? 'bg-red-500/20 border-red-500/50 text-red-300 ring-1 ring-red-500/30' 
                        : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>🔲 Box</span>
                    <span className="text-[9px] font-normal opacity-70">Drag region</span>
                  </button>
                </div>
              </div>

              {/* Brush Size Slider */}
              {gestureMode === 'brush' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-300">Brush Size: {brushSize}px</span>
                    <div 
                      className="rounded-full bg-red-500" 
                      style={{ width: Math.min(24, Math.max(8, brushSize / 2)), height: Math.min(24, Math.max(8, brushSize / 2)) }} 
                    />
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Fine (10px)</span>
                    <span>Medium (50px)</span>
                    <span>Broad (100px)</span>
                  </div>
                </div>
              )}

              {/* Gesture Actions (Undo, Clear) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={strokesRef.current.length === 0}
                  className="flex-1 py-2 px-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Undo className="w-3.5 h-3.5" />
                  <span>Undo Stroke</span>
                </button>
                <button
                  onClick={clearCanvas}
                  className="py-2 px-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                  title="Clear all strokes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Optional Text Hint */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                  <span>Object Description / Hint</span>
                  <span className="text-[10px] text-zinc-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={objectHint}
                  onChange={(e) => setObjectHint(e.target.value)}
                  placeholder="e.g. Red trash can, tourist in yellow shirt, power pole..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-zinc-400">
                  Providing a name helps the AI understand what to erase and what to reconstruct behind it.
                </p>
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
                  onClick={handleExecuteRemove}
                  disabled={isProcessing || (!hasGestureMask && !objectHint.trim())}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Erase Object with AI</span>
                </button>

                {resultImage && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => setShowComparison(!showComparison)}
                      className="w-full py-2.5 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{showComparison ? 'Viewing Erased Result' : 'Hold to View Original'}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (onSendToChat && resultImage) {
                            onSendToChat(resultImage, `Erased object from photo: ${objectHint || 'selected target'}`);
                            if (onClose) onClose();
                          }
                        }}
                        className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all text-center"
                      >
                        Send to Chat →
                      </button>
                      <a
                        href={resultImage}
                        download={`erased_image_${Date.now()}.png`}
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
