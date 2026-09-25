import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Move, 
  X, 
  RotateCw, 
  Download, 
  Copy, 
  Check, 
  ZoomIn, 
  ZoomOut,
  Sliders
} from 'lucide-react';

interface MovableResizableImageProps {
  src: string;
  alt?: string;
  className?: string;
  initialWidth?: number;
  initialHeight?: number;
  caption?: string;
  onClose?: () => void;
  isFloating?: boolean;
}

export const MovableResizableImage: React.FC<MovableResizableImageProps> = ({
  src,
  alt = 'Image',
  className = '',
  initialWidth = 480,
  caption,
  onClose,
  isFloating: defaultFloating = false
}) => {
  const [isFloating, setIsFloating] = useState(defaultFloating);
  const [width, setWidth] = useState(initialWidth);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Drag state for floating mode
  const [position, setPosition] = useState({ x: 40, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0 });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ startX: 0, initialWidth: 480 });

  // Floating window bounds checking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.startX;
        const deltaY = e.clientY - dragStartRef.current.startY;
        setPosition({
          x: Math.max(10, Math.min(window.innerWidth - width - 20, dragStartRef.current.initialPosX + deltaX)),
          y: Math.max(10, Math.min(window.innerHeight - 200, dragStartRef.current.initialPosY + deltaY))
        });
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.startX;
        const newWidth = Math.max(200, Math.min(window.innerWidth - 60, resizeStartRef.current.initialWidth + deltaX));
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, width]);

  const handleStartDrag = (e: React.MouseEvent) => {
    if (!isFloating) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y
    };
  };

  const handleStartResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      initialWidth: width
    };
  };

  const handleCopy = async () => {
    try {
      if (src.startsWith('data:image')) {
        const res = await fetch(src);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(src);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `nexus-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Inline container styling
  const containerStyle: React.CSSProperties = isFloating
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        zIndex: 9999,
        maxWidth: '90vw'
      }
    : {
        width: `${width}px`,
        maxWidth: '100%'
      };

  return (
    <div 
      style={containerStyle}
      className={`group/img rounded-2xl overflow-hidden border border-white/10 bg-[#121622]/95 backdrop-blur-md transition-shadow duration-200 relative select-none ${
        isFloating 
          ? 'shadow-2xl shadow-black/80 ring-2 ring-cyan-500/50' 
          : 'shadow-lg my-2'
      } ${className}`}
    >
      {/* Top Header Controls Bar */}
      <div 
        onMouseDown={handleStartDrag}
        className={`px-3 py-2 bg-[#181d2a]/90 border-b border-white/10 flex items-center justify-between text-xs text-gray-300 ${
          isFloating ? 'cursor-move' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isFloating && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
              <Move className="w-3 h-3" />
              Movable
            </span>
          )}
          <span className="truncate font-medium text-xs text-gray-200">
            {caption || alt}
          </span>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          {/* Zoom controls */}
          <button
            onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
            className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
            className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {/* Rotate */}
          <button
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
            title="Copy Image"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
            title="Download Image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {/* Float / Dock Toggle */}
          <button
            onClick={() => {
              setIsFloating(!isFloating);
              if (!isFloating) {
                setPosition({ x: Math.max(20, window.innerWidth / 2 - width / 2), y: 100 });
              }
            }}
            className={`p-1 rounded transition-colors ${
              isFloating 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
            title={isFloating ? 'Dock in chat' : 'Float & Move around screen'}
          >
            {isFloating ? <Minimize2 className="w-3.5 h-3.5" /> : <Move className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-500/20 hover:text-red-300 rounded text-gray-400 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Image Stage */}
      <div 
        className="relative overflow-hidden flex items-center justify-center bg-black/40 min-h-[140px] p-2"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <img
          src={src}
          alt={alt}
          style={{
            transform: `rotate(${rotation}deg) scale(${zoom})`,
            transition: isDragging || isResizing ? 'none' : 'transform 0.2s ease',
            maxHeight: isFloating ? '70vh' : '500px'
          }}
          className="w-full h-auto object-contain rounded-lg pointer-events-none"
        />

        {/* Quick Size Presets Bar */}
        {showControls && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-[11px] text-gray-300 z-10 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-mono">
              <span>{Math.round(width)}px</span>
              {zoom !== 1 && <span>• {Math.round(zoom * 100)}%</span>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWidth(320)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${width === 320 ? 'bg-cyan-500 text-black font-bold' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Small
              </button>
              <button
                onClick={() => setWidth(480)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${width === 480 ? 'bg-cyan-500 text-black font-bold' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Medium
              </button>
              <button
                onClick={() => setWidth(680)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${width === 680 ? 'bg-cyan-500 text-black font-bold' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Large
              </button>
              <button
                onClick={() => { setZoom(1); setRotation(0); }}
                className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 hover:bg-white/20 text-gray-300"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle (Bottom-Right Corner) */}
      <div
        onMouseDown={handleStartResize}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 text-gray-400 hover:text-cyan-400 group-hover/img:opacity-100 opacity-60 transition-opacity z-20"
        title="Drag to resize width"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15l-6 6M21 8l-13 13M21 3l-18 18" />
        </svg>
      </div>
    </div>
  );
};
