import React, { useState, useRef, useEffect } from 'react';

interface CameraModalProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Initialize and switch camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isMounted = true;

    const startCamera = async () => {
      setCameraError(null);
      try {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          newStream.getTracks().forEach(t => t.stop());
          return;
        }

        activeStream = newStream;
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        // Check if torch is supported
        const track = newStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (isMounted) {
          setCameraError(
            err.name === 'NotAllowedError' 
              ? "Camera permission was denied. Please allow camera access in your browser settings."
              : "Could not access camera. Please make sure no other application is using it."
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  // Handle Torch Toggle
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn("Torch not supported on this device", e);
      }
    }
  };

  // Capture Snapshot
  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // If user facing mode, flip horizontally for mirror effect
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base64 = dataUrl.split(',')[1];
      setCapturedPreview(base64);
    }
    setIsCapturing(false);
  };

  const confirmAttachment = () => {
    if (capturedPreview) {
      onCapture(capturedPreview);
      onClose();
    }
  };

  const retakePhoto = () => {
    setCapturedPreview(null);
  };

  // --- Render Mini Floating Window ---
  if (isMiniMode) {
    return (
      <div 
        className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 rounded-2xl bg-neutral-900 border border-white/20 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{ backdropFilter: 'blur(16px)' }}
      >
        {/* Mini Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-950/90 border-b border-white/10 text-white">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-neutral-200">Mini Camera</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMiniMode(false)}
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
              title="Expand to Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
              title="Close Camera"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video or Snapshot in Mini Mode */}
        <div className="relative w-full h-52 bg-black flex items-center justify-center overflow-hidden">
          {capturedPreview ? (
            <img 
              src={`data:image/jpeg;base64,${capturedPreview}`} 
              alt="Snapshot preview"
              className="w-full h-full object-cover" 
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {cameraError && (
            <div className="absolute inset-0 p-4 bg-black/90 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-rose-400">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Mini Controls */}
        <div className="p-2.5 bg-neutral-950 flex items-center justify-between">
          {capturedPreview ? (
            <div className="w-full flex items-center justify-between gap-2">
              <button
                onClick={retakePhoto}
                className="flex-1 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-semibold transition-colors"
              >
                Retake
              </button>
              <button
                onClick={confirmAttachment}
                className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-colors shadow"
              >
                Use Photo
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 transition-colors"
                title="Switch Camera"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              <button
                onClick={capturePhoto}
                disabled={!!cameraError || isCapturing}
                className="w-11 h-11 rounded-full bg-white border-2 border-neutral-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
                title="Snap Photo"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-300" />
              </button>

              <button
                onClick={() => setIsMiniMode(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 transition-colors"
                title="Fullscreen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Render Fullscreen Viewfinder Mode ---
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none animate-in fade-in duration-200">
      
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center space-x-2">
          {/* Mini Window Toggle Button */}
          <button
            onClick={() => setIsMiniMode(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-neutral-900/80 backdrop-blur-md border border-white/20 text-xs font-medium text-white hover:bg-white/20 transition-colors"
            title="Minimize to Picture-in-Picture Mini View"
          >
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Mini Window</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-full backdrop-blur-md border transition-colors ${
              showGrid 
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300' 
                : 'bg-neutral-900/80 border-white/20 text-neutral-300 hover:text-white'
            }`}
            title="Toggle Rule-of-Thirds Grid"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16M8 4v16M16 4v16" />
            </svg>
          </button>

          {/* Torch / Flash Toggle (If device supports) */}
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-md border transition-colors ${
                torchOn 
                  ? 'bg-amber-500/30 border-amber-400 text-amber-300' 
                  : 'bg-neutral-900/80 border-white/20 text-neutral-300 hover:text-white'
              }`}
              title="Toggle Flash / Torch"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-neutral-900/80 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors"
          title="Exit Camera"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Viewfinder Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {capturedPreview ? (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img 
              src={`data:image/jpeg;base64,${capturedPreview}`} 
              alt="Snapshot"
              className="max-h-full max-w-full object-contain rounded-2xl border border-white/20 shadow-2xl" 
            />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover sm:object-contain ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* 3x3 Rule of Thirds Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-white/20"></div>
                <div className="border-r border-white/20"></div>
                <div></div>
              </div>
            )}
          </>
        )}

        {/* Camera Error Banner */}
        {cameraError && (
          <div className="absolute inset-x-4 max-w-md p-4 bg-neutral-900/90 border border-rose-500/50 rounded-2xl text-center backdrop-blur-xl">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white mb-1">Camera Permission Required</p>
            <p className="text-xs text-neutral-300 mb-3">{cameraError}</p>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold text-white transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Action Bar */}
      <div className="h-28 bg-neutral-950/95 border-t border-white/10 flex items-center justify-around px-6 z-20">
        {capturedPreview ? (
          <div className="w-full max-w-md flex items-center justify-between gap-4">
            <button
              onClick={retakePhoto}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retake Photo</span>
            </button>

            <button
              onClick={confirmAttachment}
              className="flex-1 py-3 px-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-500/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Attach to Chat</span>
            </button>
          </div>
        ) : (
          <>
            {/* Flip Camera */}
            <button
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Flip Front / Rear Camera"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Shutter Button */}
            <button
              onClick={capturePhoto}
              disabled={!!cameraError || isCapturing}
              className="w-20 h-20 rounded-full bg-white border-4 border-neutral-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl disabled:opacity-50"
              title="Capture Photo"
            >
              <div className="w-14 h-14 rounded-full bg-neutral-900 border-2 border-neutral-300" />
            </button>

            {/* Mode Indicator / Mini Mode Quick Switch */}
            <button
              onClick={() => setIsMiniMode(true)}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Switch to Mini View"
            >
              <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </button>
          </>
        )}
      </div>

    </div>
  );
};
