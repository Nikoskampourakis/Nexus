import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize, 
  Sparkles, 
  Upload, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Maximize2, 
  RefreshCw, 
  Eye, 
  Download, 
  X,
  Layers,
  Sliders,
  Check
} from 'lucide-react';
import { GeneratedImageItem } from '../types';
import { editImageWithAI } from '../services/geminiService';
import { saveStoredCreation, trackImageCreation } from '../services/storageService';

interface ExtendImageToolProps {
  initialImage?: string | null;
  onSendToChat?: (imageBase64: string, promptText: string) => void;
  onSavedCreation?: (item: GeneratedImageItem) => void;
  onClose?: () => void;
}

type DirectionPreset = 'horizontal' | 'vertical' | 'all' | 'left' | 'right' | 'top' | 'bottom';

export const ExtendImageTool: React.FC<ExtendImageToolProps> = ({
  initialImage,
  onSendToChat,
  onSavedCreation,
  onClose
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);
  const [direction, setDirection] = useState<DirectionPreset>('horizontal');
  const [extensionAmount, setExtensionAmount] = useState<number>(40); // 40% margin
  const [customFillPrompt, setCustomFillPrompt] = useState<string>('');
  const [isExtending, setIsExtending] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceImageRef = useRef<HTMLImageElement>(null);

  const presets = [
    {
      id: 'horizontal' as DirectionPreset,
      name: 'Horizontal (↔)',
      desc: 'Extend Left & Right into widescreen',
      icon: '↔️'
    },
    {
      id: 'vertical' as DirectionPreset,
      name: 'Vertical (↕)',
      desc: 'Extend Top & Bottom into portrait/story',
      icon: '↕️'
    },
    {
      id: 'all' as DirectionPreset,
      name: 'All Sides (🔄)',
      desc: 'Expand 360° panoramic canvas',
      icon: '🔄'
    },
    {
      id: 'left' as DirectionPreset,
      name: 'Extend Left (⬅)',
      desc: 'Expand scene to the left',
      icon: '⬅️'
    },
    {
      id: 'right' as DirectionPreset,
      name: 'Extend Right (➡)',
      desc: 'Expand scene to the right',
      icon: '➡️'
    },
    {
      id: 'top' as DirectionPreset,
      name: 'Extend Sky (⬆)',
      desc: 'Expand upwards / ceiling',
      icon: '⬆️'
    },
    {
      id: 'bottom' as DirectionPreset,
      name: 'Extend Ground (⬇)',
      desc: 'Expand downwards / foreground',
      icon: '⬇️'
    }
  ];

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

  /**
   * Generates an expanded canvas with the original image positioned inside,
   * leaving transparent/blank margins in the chosen direction for AI outpainting.
   */
  const createExpandedCanvasPayload = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!imageUrl) return reject(new Error('No image loaded'));

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const origW = img.naturalWidth || 1024;
        const origH = img.naturalHeight || 1024;

        const factor = extensionAmount / 100;
        let padLeft = 0;
        let padRight = 0;
        let padTop = 0;
        let padBottom = 0;

        if (direction === 'horizontal') {
          padLeft = Math.round(origW * (factor / 2));
          padRight = Math.round(origW * (factor / 2));
        } else if (direction === 'vertical') {
          padTop = Math.round(origH * (factor / 2));
          padBottom = Math.round(origH * (factor / 2));
        } else if (direction === 'all') {
          padLeft = Math.round(origW * (factor / 2));
          padRight = Math.round(origW * (factor / 2));
          padTop = Math.round(origH * (factor / 2));
          padBottom = Math.round(origH * (factor / 2));
        } else if (direction === 'left') {
          padLeft = Math.round(origW * factor);
        } else if (direction === 'right') {
          padRight = Math.round(origW * factor);
        } else if (direction === 'top') {
          padTop = Math.round(origH * factor);
        } else if (direction === 'bottom') {
          padBottom = Math.round(origH * factor);
        }

        const newW = origW + padLeft + padRight;
        const newH = origH + padTop + padBottom;

        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));

        // Soft gradient/blurred ambient fill behind blanks so AI has cohesive color context
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, newW, newH);

        // Draw original image into calculated offset
        ctx.drawImage(img, padLeft, padTop, origW, origH);

        // Return exported base64 image
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image for canvas padding'));
      img.src = imageUrl;
    });
  };

  const handleExecuteExtend = async () => {
    if (!imageUrl) return;
    setIsExtending(true);
    setError(null);

    try {
      const paddedCanvasDataUrl = await createExpandedCanvasPayload();

      const instruction = customFillPrompt.trim()
        ? `Outpaint and extend the scene image: ${customFillPrompt.trim()}`
        : 'Generatively outpaint and extend this scene, completing the surrounding blank canvas with seamless background details, matching perspective, lighting, and textures without any visible seams.';

      const outpaintedResult = await editImageWithAI({
        imageUrl: paddedCanvasDataUrl,
        mode: 'extend_image',
        instruction,
        extendDirection: direction,
        extendRatio: direction === 'horizontal' ? '16:9' : direction === 'vertical' ? '9:16' : 'Expanded',
        quality: 'Cinema 8K'
      });

      setResultImage(outpaintedResult);

      const newItem: GeneratedImageItem = {
        id: `ext_${Date.now()}`,
        url: outpaintedResult,
        originalUrl: imageUrl,
        prompt: `Extended Image (${direction} +${extensionAmount}%) ${customFillPrompt ? '— ' + customFillPrompt : ''}`,
        aspectRatio: direction === 'horizontal' ? '16:9' : direction === 'vertical' ? '9:16' : 'Panoramic',
        createdAt: Date.now(),
        editType: 'extend_image',
        editNote: `Generative extension (${direction}, +${extensionAmount}%)`
      };

      await saveStoredCreation(newItem);
      trackImageCreation();
      if (onSavedCreation) onSavedCreation(newItem);
    } catch (err: any) {
      console.error('Image extension failed:', err);
      setError(err?.message || 'Failed to extend image. Please try again.');
    } finally {
      setIsExtending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Maximize className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Extend Image (Generative Outpainting)</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                AI Fills the Blanks
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Expand image canvas beyond original borders; AI generates and fills the blanks seamlessly</p>
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
        {/* Visual Preview Canvas */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-zinc-950/80 relative overflow-hidden">
          {imageUrl ? (
            <div className="relative max-w-full max-h-[75vh] flex items-center justify-center p-4">
              {/* Active Image (Result or Original) */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900 flex items-center justify-center">
                <img
                  ref={sourceImageRef}
                  src={showOriginal || !resultImage ? imageUrl : resultImage}
                  alt="Extend Preview"
                  className="max-h-[65vh] max-w-full object-contain"
                />

                {/* Visual Outpaint Expansion Boundary Indicator (when not yet rendered) */}
                {!resultImage && (
                  <div 
                    className="absolute inset-0 pointer-events-none border-2 border-dashed border-blue-500/60 transition-all duration-300"
                    style={{
                      transform: direction === 'horizontal' ? 'scaleX(0.85)' :
                                 direction === 'vertical' ? 'scaleY(0.85)' :
                                 direction === 'all' ? 'scale(0.85)' : 'none'
                    }}
                  >
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                      Original Frame
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-zinc-900/90 text-blue-300 text-[10px] border border-blue-500/30">
                      AI fills extended blanks (+{extensionAmount}%)
                    </div>
                  </div>
                )}

                {/* Loading Outpainting State */}
                {isExtending && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                      <Maximize className="w-7 h-7 text-blue-400 absolute inset-0 m-auto" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">Generatively Outpainting Image...</h4>
                      <p className="text-xs text-zinc-400 max-w-sm">
                        Synthesizing panoramic environment, matching perspective vanishing points, and seamlessly inpainting extended boundaries...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg p-12 border-2 border-dashed border-zinc-700 hover:border-blue-500/50 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Select Photo to Extend</h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-4">
                Choose any square, portrait, or landscape image to outpaint and let AI fill in the missing surroundings.
              </p>
              <span className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg">
                Upload Image
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
              {/* Outpainting Direction Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Extension Direction</span>
                  <span className="text-[10px] text-zinc-400">Where AI fills</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presets.slice(0, 4).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setDirection(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        direction === p.id 
                          ? 'bg-blue-500/20 border-blue-500/60 text-blue-300 ring-1 ring-blue-500/30' 
                          : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Additional Single-Side Extenders */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {presets.slice(4).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setDirection(p.id)}
                      className={`py-1.5 px-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        direction === p.id 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expansion Amount Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-zinc-300">Canvas Expansion: +{extensionAmount}%</span>
                  <span className="text-[10px] text-blue-400 font-semibold">
                    {extensionAmount < 30 ? 'Subtle Outpaint' : extensionAmount < 60 ? 'Wide Panorama' : 'Extreme Outpaint'}
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={extensionAmount}
                  onChange={(e) => setExtensionAmount(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>+20%</span>
                  <span>+50% (Standard)</span>
                  <span>+100% (2x Area)</span>
                </div>
              </div>

              {/* Optional Fill Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>What should appear in extended blanks?</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Optional</span>
                </label>
                <textarea
                  rows={2}
                  value={customFillPrompt}
                  onChange={(e) => setCustomFillPrompt(e.target.value)}
                  placeholder="e.g. Continue the cyberpunk skyscrapers, add lush pine trees and mountain ridge, open starry night sky..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                />
                <p className="text-[10px] text-zinc-400">
                  Leave empty to let the AI automatically deduce and generate the surroundings based on the scene context.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-200">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleExecuteExtend}
                  disabled={isExtending}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Extend Image & Fill Blanks</span>
                </button>

                {resultImage && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="w-full py-2.5 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{showOriginal ? 'Viewing Extended Result' : 'Hold to View Original Crop'}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (onSendToChat && resultImage) {
                            onSendToChat(resultImage, `Extended image (${direction} outpaint)`);
                            if (onClose) onClose();
                          }
                        }}
                        className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all text-center"
                      >
                        Send to Chat →
                      </button>
                      <a
                        href={resultImage}
                        download={`extended_image_${Date.now()}.png`}
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
