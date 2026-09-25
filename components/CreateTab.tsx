import React, { useState, useRef, useEffect } from 'react';
import { GeneratedImageItem } from '../types';
import { 
  generateBatchImages, 
  editImageWithAI, 
  GenerateImageOptions,
  EditImageParams
} from '../services/geminiService';
import { 
  getStoredCreations, 
  saveStoredCreation, 
  deleteStoredCreation,
  trackImageCreation
} from '../services/storageService';

interface CreateTabProps {
  onSendToChat?: (imageBase64: string, promptText: string) => void;
  onToggleSidebar?: () => void;
  onBackToChat?: () => void;
  initialImage?: { url: string; prompt: string } | null;
}

// Preset art styles with authentic visual artwork representations
export interface ArtStyle {
  id: string;
  name: string;
  greekName?: string;
  category: 'popular' | 'templates' | '3d' | 'vintage' | 'anime' | 'photo';
  tagline: string;
  promptPrefix: string;
  badge: string;
  imageUrl: string;
}

// Curated high-fidelity artwork data SVGs for realistic style previews
const createArtworkSvg = (svgContent: string, bgGradient: string) => 
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <defs>${bgGradient}</defs>
      <rect width="400" height="300" fill="url(#bg)" />
      ${svgContent}
    </svg>`
  )}`;

const ART_STYLES: ArtStyle[] = [
  {
    id: 'sketch',
    name: 'Sketch & Pencil',
    greekName: 'Σκίτσο',
    category: 'popular',
    tagline: 'Minimalist clean line art & graphite pencil portrait',
    promptPrefix: 'A clean, minimalist fine-line art pencil sketch illustration, crisp black and white line work with soft graphite shading',
    badge: 'Popular',
    imageUrl: '/src/assets/images/sketch_style_preview_1790002536265.jpg'
  },
  {
    id: '80s_flashback',
    name: "'80s Flashback",
    greekName: "'80s Flashback",
    category: 'vintage',
    tagline: 'Authentic 1980s retro film photo, neon & denim aesthetic',
    promptPrefix: 'Authentic 1980s color flash photography, retro film grain, vintage color palette, vibrant 80s fashion and warm nostalgic lighting',
    badge: 'Retro',
    imageUrl: '/src/assets/images/retro_80s_preview_1790002550255.jpg'
  },
  {
    id: 'stickers',
    name: 'Die-Cut Stickers',
    greekName: 'Αυτοκόλλητα',
    category: 'popular',
    tagline: 'Die-cut vibrant graphic stickers with white borders',
    promptPrefix: 'A die-cut vibrant sticker graphic with a clean white sticker contour border, cute modern vector style, isolated on clean background',
    badge: 'Graphic',
    imageUrl: '/src/assets/images/sticker_style_preview_1790002565579.jpg'
  },
  {
    id: 'caricature_3d',
    name: '3D Pixar & Disney',
    greekName: 'Δημιουργία καρικατούρας',
    category: '3d',
    tagline: 'High-fidelity Pixar & Disney 3D animated character render',
    promptPrefix: 'A high-detail 3D animated film character render, Pixar and Disney aesthetic, vibrant stylized features, expressive eyes, subsurface scattering and volumetric cinematic lighting',
    badge: '3D Render',
    imageUrl: '/src/assets/images/pixar_style_preview_1790002579058.jpg'
  },
  {
    id: 'anime',
    name: 'Anime & Manga',
    greekName: 'Anime',
    category: 'anime',
    tagline: 'Studio-quality modern Japanese anime & manga artwork',
    promptPrefix: 'High-budget modern anime illustration, Makoto Shinkai style, vibrant saturated colors, breathtaking atmospheric lighting, meticulous cel shading and dynamic composition',
    badge: 'Anime',
    imageUrl: '/src/assets/images/anime_style_preview_1790002593352.jpg'
  },
  {
    id: 'underwater',
    name: 'Underwater Caustics',
    greekName: 'Υποβρύχιο',
    category: 'photo',
    tagline: 'Ethereal underwater lighting & aquatic sunlight caustics',
    promptPrefix: 'Ethereal underwater photography, natural sunlight caustic reflections dancing across the scene, crystalline turquoise water, tiny bubbles and weightless serenity',
    badge: 'Atmosphere',
    imageUrl: '/src/assets/images/underwater_style_preview_1790002607322.jpg'
  },
  {
    id: 'cinematic_photo',
    name: 'Cinematic 85mm',
    greekName: 'Κινηματογραφικό',
    category: 'photo',
    tagline: 'High-end cinema portrait with shallow depth of field & bokeh',
    promptPrefix: 'Cinematic 85mm prime lens photograph, f/1.4 aperture, creamy bokeh, hyper-realistic skin texture and high-end studio rim lighting',
    badge: 'Photo',
    imageUrl: '/src/assets/images/cinematic_bokeh_preview_1790002622540.jpg'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    greekName: 'Cyberpunk',
    category: 'templates',
    tagline: 'Futuristic night rain, neon cyan & magenta street glow',
    promptPrefix: 'Cyberpunk futuristic city street, rain-slicked asphalt reflecting vibrant neon cyan and magenta lights, misty atmosphere and holographic billboards',
    badge: 'Futuristic',
    imageUrl: '/src/assets/images/cyberpunk_neon_preview_1790002636371.jpg'
  },
  {
    id: 'logo_designer',
    name: 'Logo Designer',
    greekName: 'Σχεδιαστής Logo',
    category: 'templates',
    tagline: 'Professional minimalist vector logo & corporate identity',
    promptPrefix: 'Professional minimalist vector logo, clean geometric lines, high contrast, corporate brand aesthetic, solid background',
    badge: 'Design',
    imageUrl: '/src/assets/images/logo_designer_style_1790004650259.jpg'
  },
  {
    id: 'avatar_3d',
    name: '3D Avatar',
    greekName: '3D Avatar',
    category: '3d',
    tagline: 'Expressive 3D animated character avatar render',
    promptPrefix: 'A cute 3D animated character avatar, stylized features, Pixar and Disney aesthetic, expressive eyes, subsurface scattering and soft cinematic lighting',
    badge: 'Avatar',
    imageUrl: '/src/assets/images/avatar_3d_style_1790004661607.jpg'
  },
  {
    id: 'blueprint',
    name: 'Technical Blueprint',
    greekName: 'Blueprint',
    category: 'templates',
    tagline: 'Detailed architectural & engineering blueprint',
    promptPrefix: 'A detailed technical architectural blueprint, white lines on deep blue grid background, annotations, precise engineering drawing aesthetic',
    badge: 'Technical',
    imageUrl: '/src/assets/images/blueprint_style_1790004674024.jpg'
  },
  {
    id: 'mini_me',
    name: 'Mini Me',
    greekName: 'Mini Me',
    category: 'photo',
    tagline: 'Hyper-realistic tilt-shift miniature figurine',
    promptPrefix: 'A tiny tilt-shift miniature figurine in a detailed diorama, hyper-realistic textures, shallow depth of field, macro photography aesthetic',
    badge: 'Miniature',
    imageUrl: '/src/assets/images/mini_me_style_1790004684866.jpg'
  },
  {
    id: 'chibi',
    name: 'Chibi Art',
    greekName: 'Chibi',
    category: 'anime',
    tagline: 'Adorable kawaii chibi character with oversized head',
    promptPrefix: 'Adorable chibi character illustration, oversized head, small body, vibrant pastel colors, clean vector lines, kawaii Japanese aesthetic',
    badge: 'Kawaii',
    imageUrl: '/src/assets/images/chibi_style_1790004695023.jpg'
  },
  {
    id: 'comic',
    name: 'Comic Book',
    greekName: 'Comic',
    category: 'vintage',
    tagline: 'Dynamic superhero comic panel with halftone dots',
    promptPrefix: 'Dynamic comic book panel illustration, bold ink lines, halftone dots, Ben-Day dots, vibrant primary colors, dramatic action aesthetic',
    badge: 'Comic',
    imageUrl: '/src/assets/images/comic_style_1790004704676.jpg'
  },
  {
    id: 'wanted_poster',
    name: 'Wanted Poster',
    greekName: 'Wanted Poster',
    category: 'vintage',
    tagline: 'Old west vintage weathered "Wanted" poster',
    promptPrefix: 'Old west style wanted poster, sepia tone, weathered vintage paper texture, charcoal sketch portrait, bold WANTED text',
    badge: 'Wild West',
    imageUrl: '/src/assets/images/wanted_poster_style_1790004715274.jpg'
  },
  {
    id: 'bit_8',
    name: '8-Bit Retro',
    greekName: '8-Bit',
    category: 'vintage',
    tagline: 'Classic 8-bit pixel art & retro game landscape',
    promptPrefix: 'Classic 8-bit pixel art, retro video game aesthetic, limited color palette, visible pixels, nostalgic console graphics',
    badge: 'Pixel Art',
    imageUrl: '/src/assets/images/bit_8_style_1790004725797.jpg'
  },
  {
    id: 'infographic',
    name: 'Infographic Style',
    greekName: 'Infographic',
    category: 'templates',
    tagline: 'Clean modern data visualization & analysis icons',
    promptPrefix: 'A clean modern data visualization infographic, balanced charts and icons, minimalist professional aesthetic, clear typography',
    badge: 'Analysis',
    imageUrl: '/src/assets/images/infographic_style_1790004739598.jpg'
  },
  {
    id: 'statue',
    name: 'Classical Statue',
    greekName: 'Άγαλμα',
    category: 'vintage',
    tagline: 'Timeless marble sculpture with detailed stone texture',
    promptPrefix: 'A classical marble statue portrait, museum lighting, soft shadows, detailed stone texture, elegant renaissance aesthetic',
    badge: 'Classical',
    imageUrl: '/src/assets/images/statue_style_1790004750303.jpg'
  }
];


export const CreateTab: React.FC<CreateTabProps> = ({ 
  onSendToChat, 
  onToggleSidebar, 
  onBackToChat,
  initialImage
}) => {
  // Main State
  const [prompt, setPrompt] = useState(initialImage?.prompt || '');
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '4:3' | '3:4'>('1:1');
  const [batchCount, setBatchCount] = useState<number>(1);
  const [quality, setQuality] = useState<'Standard' | 'HD' | 'Ultra Pro' | 'Cinema 8K'>('HD');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'styles' | 'gallery'>('styles');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Power Options State (Advanced Studio Tuning)
  const [showPowerOptions, setShowPowerOptions] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [guidanceScale, setGuidanceScale] = useState(8);
  const [lightingMode, setLightingMode] = useState<'Natural' | 'Cinematic Studio' | 'Golden Hour' | 'Cyberpunk Neon' | 'Dramatic Noir'>('Natural');
  const [cameraLens, setCameraLens] = useState<'Standard 50mm' | 'Portrait 85mm Bokeh' | 'Wide 24mm' | 'Macro Close-Up'>('Standard 50mm');

  // Editor Modal State
  const [editingItem, setEditingItem] = useState<GeneratedImageItem | null>(null);
  const [editorTool, setEditorTool] = useState<'edit_message' | 'remove_object' | 'move_object' | 'perspective_shift' | 'area_select_edit'>('edit_message');
  const [editInstruction, setEditInstruction] = useState('');
  const [targetObject, setTargetObject] = useState('');
  const [moveDirection, setMoveDirection] = useState<'left' | 'center' | 'right' | 'up' | 'down'>('center');
  const [perspectiveType, setPerspectiveType] = useState<'right_to_center' | 'left_to_center' | 'wide_angle' | 'low_angle' | 'high_angle' | 'three_quarter' | 'custom_3d_drag'>('custom_3d_drag');
  const [perspectiveMode, setPerspectiveMode] = useState<'3d_drag' | 'presets'>('3d_drag');
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Interactive Area Selection (Select objects/people to remove or link message to add/modify)
  const [selectedArea, setSelectedArea] = useState<{ x: number; y: number; width: number; height: number; action: 'remove' | 'modify_or_add' | 'add' | 'modify' } | null>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [areaDragStart, setAreaDragStart] = useState<{ x: number; y: number } | null>(null);
  const [areaActionChoice, setAreaActionChoice] = useState<'remove' | 'modify_or_add' | 'add' | 'modify'>('add');
  const [areaCustomPrompt, setAreaCustomPrompt] = useState('');

  // Interactive 3D Perspective Dragging State
  const [dragAngles, setDragAngles] = useState<{ rotateX: number; rotateY: number; scale: number }>({ rotateX: 0, rotateY: 0, scale: 1 });
  const [isDraggingPerspective, setIsDraggingPerspective] = useState(false);
  const [perspectiveDragStart, setPerspectiveDragStart] = useState<{ x: number; y: number; initialX: number; initialY: number } | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // VISUAL GRID OVERLAY STATE (for aligning perspective, moving objects, rule of thirds)
  const [gridOverlay, setGridOverlay] = useState<'none' | 'rule_of_thirds' | 'perspective' | 'grid_4x4' | 'golden_ratio' | 'crosshair'>('none');
  const [gridOpacity, setGridOpacity] = useState<number>(0.65);
  const [gridColor, setGridColor] = useState<'cyan' | 'amber' | 'emerald' | 'white' | 'purple'>('cyan');

  // Auto-select relevant grid based on tool selection to guide users
  useEffect(() => {
    if (editorTool === 'move_object') {
      setGridOverlay('grid_4x4');
    } else if (editorTool === 'perspective_shift') {
      setGridOverlay('perspective');
    } else if (editorTool === 'remove_object') {
      setGridOverlay('none');
    }
  }, [editorTool]);

  // Staged Upload for Direct Creation/Editing
  const [stagedImage, setStagedImage] = useState<{ url: string; mimeType: string } | null>(
    initialImage ? { url: initialImage.url, mimeType: 'image/png' } : null
  );

  // Library / Creations State
  const [creations, setCreations] = useState<GeneratedImageItem[]>([]);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing gallery on mount
  useEffect(() => {
    getStoredCreations().then(saved => {
      setCreations(saved);
    });
  }, []);

  // Voice Input Speech Recognition Setup
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            setPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Speech recognition setup error:', e);
      }
    }
  }, []);

  const handleToggleSpeech = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please type your prompt.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        setStagedImage({ url: base64Url, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate Image or Apply Edit
  const handleGenerate = async () => {
    if (!prompt.trim() && !stagedImage) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      if (stagedImage) {
        const editedUrl = await editImageWithAI({
          imageUrl: stagedImage.url,
          mode: 'edit_message',
          instruction: prompt.trim() || 'Enhance and stylize this image with artistic beauty'
        });

        const newCreation: GeneratedImageItem = {
          id: `img_${Date.now()}`,
          url: editedUrl,
          prompt: prompt.trim(),
          style: selectedStyle?.name,
          aspectRatio,
          createdAt: Date.now(),
          originalUrl: stagedImage.url,
          editType: 'edit_message',
          editNote: prompt.trim()
        };

        const updated = await saveStoredCreation(newCreation);
        trackImageCreation();
        setCreations(updated);
        setEditingItem(newCreation);
        setStagedImage(null);
        setPrompt('');
      } else {
        const options: GenerateImageOptions = {
          prompt: prompt.trim(),
          aspectRatio,
          styleName: selectedStyle?.name,
          stylePrompt: selectedStyle?.promptPrefix,
          quality,
          negativePrompt: negativePrompt.trim() || undefined,
          guidanceScale: guidanceScale,
          lightingMode: lightingMode !== 'Natural' ? lightingMode : undefined,
          cameraLens: cameraLens !== 'Standard 50mm' ? cameraLens : undefined,
        };

        const urls = await generateBatchImages(options, batchCount);

        const newItems: GeneratedImageItem[] = urls.map((url, idx) => ({
          id: `img_${Date.now()}_${idx}`,
          url,
          prompt: prompt.trim(),
          style: selectedStyle?.name,
          aspectRatio,
          createdAt: Date.now() + idx,
          editType: 'initial'
        }));

        let currentList = creations;
        for (const item of newItems) {
          currentList = await saveStoredCreation(item);
          trackImageCreation();
        }
        setCreations(currentList);
        
        if (newItems.length > 0) {
          setEditingItem(newItems[0]);
        }
        setPrompt('');
      }
    } catch (err: any) {
      console.error("Generation failed:", err);
      setErrorMessage(err.message || "Failed to generate image. Please try again with a different prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Editor Execution (Remove, Move, Perspective Shift, Edit Message, Area Select/Link)
  const handleExecuteEdit = async () => {
    if (!editingItem) return;
    setIsProcessingEdit(true);
    setErrorMessage(null);

    try {
      const isAreaAction = !!selectedArea || editorTool === 'area_select_edit';
      const effectiveMode: EditImageParams['mode'] = isAreaAction ? 'area_select_edit' : editorTool;
      const effectivePerspectiveType = editorTool === 'perspective_shift' && perspectiveMode === '3d_drag'
        ? 'custom_3d_drag'
        : perspectiveType;

      const editParams: EditImageParams = {
        imageUrl: editingItem.url,
        mode: effectiveMode,
        instruction: isAreaAction && selectedArea?.action !== 'remove'
          ? (areaCustomPrompt.trim() || editInstruction.trim() || 'Add and blend realistic element in this area')
          : editInstruction.trim(),
        targetObject: targetObject.trim(),
        movementDirection: moveDirection,
        perspectiveType: effectivePerspectiveType,
        perspectiveAngles: dragAngles,
        selectedArea: selectedArea || undefined,
        quality: quality
      };

      const resultUrl = await editImageWithAI(editParams);

      let note = editInstruction.trim();
      if (isAreaAction && selectedArea) {
        if (selectedArea.action === 'remove') {
          note = `Removed area: ${targetObject || 'selected object/person'}`;
        } else {
          note = `Area modified: ${areaCustomPrompt || editInstruction || 'custom addition'}`;
        }
      } else if (editorTool === 'remove_object') {
        note = `Removed: ${targetObject || 'object'}`;
      } else if (editorTool === 'move_object') {
        note = `Moved ${targetObject || 'subject'} to ${moveDirection}`;
      } else if (editorTool === 'perspective_shift') {
        note = perspectiveMode === '3d_drag'
          ? `3D Perspective: Pitch ${Math.round(dragAngles.rotateX)}°, Yaw ${Math.round(dragAngles.rotateY)}°`
          : `Perspective shifted: ${perspectiveType.replace(/_/g, ' ')}`;
      }

      const updatedItem: GeneratedImageItem = {
        ...editingItem,
        id: `img_edit_${Date.now()}`,
        url: resultUrl,
        originalUrl: editingItem.originalUrl || editingItem.url,
        createdAt: Date.now(),
        editType: editorTool,
        editNote: note
      };

      const updatedList = await saveStoredCreation(updatedItem);
      trackImageCreation();
      setCreations(updatedList);
      setEditingItem(updatedItem);
      setShowComparison(true);
      setEditInstruction('');
      setTargetObject('');
      setSelectedArea(null);
      setAreaCustomPrompt('');
    } catch (err: any) {
      console.error("Edit failed:", err);
      setErrorMessage(err.message || "Failed to process image edit. Please try again.");
    } finally {
      setIsProcessingEdit(false);
    }
  };

  // Canvas Mouse & Touch Drag Event Handlers for 3D Perspective & Area Select
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorTool === 'perspective_shift' && perspectiveMode === '3d_drag') {
      setIsDraggingPerspective(true);
      setPerspectiveDragStart({
        x: e.clientX,
        y: e.clientY,
        initialX: dragAngles.rotateX,
        initialY: dragAngles.rotateY
      });
      return;
    }

    if (editorTool === 'area_select_edit' || editorTool === 'remove_object') {
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const clickY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setIsSelectingArea(true);
      setAreaDragStart({ x: clickX, y: clickY });
      setSelectedArea({
        x: clickX,
        y: clickY,
        width: 0,
        height: 0,
        action: editorTool === 'remove_object' ? 'remove' : areaActionChoice
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingPerspective && perspectiveDragStart) {
      const deltaX = e.clientX - perspectiveDragStart.x;
      const deltaY = e.clientY - perspectiveDragStart.y;
      const newYaw = Math.max(-45, Math.min(45, perspectiveDragStart.initialY + deltaX * 0.35));
      const newPitch = Math.max(-35, Math.min(35, perspectiveDragStart.initialX - deltaY * 0.3));
      setDragAngles(prev => ({ ...prev, rotateX: newPitch, rotateY: newYaw }));
      return;
    }

    if (isSelectingArea && areaDragStart && canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      const left = Math.min(areaDragStart.x, currentX);
      const top = Math.min(areaDragStart.y, currentY);
      const width = Math.max(2, Math.abs(currentX - areaDragStart.x));
      const height = Math.max(2, Math.abs(currentY - areaDragStart.y));

      setSelectedArea({
        x: left,
        y: top,
        width,
        height,
        action: editorTool === 'remove_object' ? 'remove' : areaActionChoice
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingPerspective(false);
    setPerspectiveDragStart(null);
    if (isSelectingArea) {
      setIsSelectingArea(false);
      setSelectedArea(prev => {
        if (!prev) return null;
        if (prev.width < 5 || prev.height < 5) {
          const size = 25;
          return {
            x: Math.max(0, Math.min(100 - size, prev.x - size / 2)),
            y: Math.max(0, Math.min(100 - size, prev.y - size / 2)),
            width: size,
            height: size,
            action: prev.action
          };
        }
        return prev;
      });
    }
  };

  // Touch handlers for mobile devices
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (editorTool === 'perspective_shift' && perspectiveMode === '3d_drag') {
      setIsDraggingPerspective(true);
      setPerspectiveDragStart({
        x: touch.clientX,
        y: touch.clientY,
        initialX: dragAngles.rotateX,
        initialY: dragAngles.rotateY
      });
      return;
    }

    if (editorTool === 'area_select_edit' || editorTool === 'remove_object') {
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const clickY = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
      setIsSelectingArea(true);
      setAreaDragStart({ x: clickX, y: clickY });
      setSelectedArea({
        x: clickX,
        y: clickY,
        width: 0,
        height: 0,
        action: editorTool === 'remove_object' ? 'remove' : areaActionChoice
      });
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (isDraggingPerspective && perspectiveDragStart) {
      const deltaX = touch.clientX - perspectiveDragStart.x;
      const deltaY = touch.clientY - perspectiveDragStart.y;
      const newYaw = Math.max(-45, Math.min(45, perspectiveDragStart.initialY + deltaX * 0.35));
      const newPitch = Math.max(-35, Math.min(35, perspectiveDragStart.initialX - deltaY * 0.3));
      setDragAngles(prev => ({ ...prev, rotateX: newPitch, rotateY: newYaw }));
      return;
    }

    if (isSelectingArea && areaDragStart && canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const currentY = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));

      const left = Math.min(areaDragStart.x, currentX);
      const top = Math.min(areaDragStart.y, currentY);
      const width = Math.max(2, Math.abs(currentX - areaDragStart.x));
      const height = Math.max(2, Math.abs(currentY - areaDragStart.y));

      setSelectedArea({
        x: left,
        y: top,
        width,
        height,
        action: editorTool === 'remove_object' ? 'remove' : areaActionChoice
      });
    }
  };

  const handleCanvasTouchEnd = () => {
    setIsDraggingPerspective(false);
    setIsSelectingArea(false);
    setPerspectiveDragStart(null);
    setAreaDragStart(null);
  };

  const handleDownload = (item: GeneratedImageItem) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `nexus_creation_${item.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendToChat = (item: GeneratedImageItem) => {
    if (onSendToChat) {
      const base64Data = item.url.replace(/^data:image\/[a-z]+;base64,/, '');
      onSendToChat(base64Data, `Let's analyze this creation: "${item.prompt}"`);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = await deleteStoredCreation(id);
    setCreations(updated);
    if (editingItem?.id === id) {
      setEditingItem(null);
    }
  };

  const filteredStyles = activeCategory === 'all' 
    ? ART_STYLES 
    : ART_STYLES.filter(s => s.category === activeCategory);

  const getGridColorHex = () => {
    switch (gridColor) {
      case 'cyan': return '#06b6d4';
      case 'amber': return '#f59e0b';
      case 'emerald': return '#10b981';
      case 'purple': return '#a855f7';
      default: return '#ffffff';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] text-[var(--text-primary)] relative overflow-hidden">
      
      {/* Hidden File Input */}
      <input 
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header */}
      <header className="flex-none h-14 border-b border-[var(--border-color)] flex items-center justify-between px-3 sm:px-4 bg-[var(--sidebar-bg)]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center space-x-2.5 min-w-0">
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="lg:hidden text-[var(--text-secondary)] hover:text-white p-1.5 -ml-1 rounded-lg hover:bg-[var(--card-bg)] transition-colors"
              title="Open Navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow flex-shrink-0 bg-gradient-to-tr from-cyan-500 to-indigo-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Create & Image Studio
              </h2>
              <p className="text-[10px] text-[var(--text-secondary)] hidden xs:block">
                Gemini 3.1 Flash Image Engine
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="flex items-center bg-[var(--card-bg)] p-0.5 rounded-lg border border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab('styles')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium ${
                activeTab === 'styles'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Styles & Create
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium flex items-center space-x-1 ${
                activeTab === 'gallery'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <span>Library</span>
              {creations.length > 0 && (
                <span className="px-1.5 py-0.2 bg-black/40 rounded-full text-[10px]">
                  {creations.length}
                </span>
              )}
            </button>
          </div>

          {onBackToChat && (
            <button
              onClick={onBackToChat}
              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-white transition-all text-xs flex items-center space-x-1"
              title="Return to Chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="hidden sm:inline">Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 pb-36 max-w-5xl mx-auto w-full">
        
        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white text-xs ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Notice Banner */}
        <div className="mb-5 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-[var(--card-bg)] to-indigo-950/20 border border-[var(--border-color)] flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">
                The images you create are automatically saved in your Library
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                With the new <strong>Visual Composition Grid Overlay</strong>, easily align perspective shifts and repositioned subjects.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('gallery')} 
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium whitespace-nowrap px-2.5 py-1 rounded-lg hover:bg-cyan-500/10 transition-colors"
          >
            View Library →
          </button>
        </div>

        {activeTab === 'styles' ? (
          <>
            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none mb-4">
              {[
                { id: 'all', label: 'All Styles' },
                { id: 'popular', label: 'Popular' },
                { id: 'templates', label: 'Templates' },
                { id: 'photo', label: 'Photo & Cinematic' },
                { id: '3d', label: '3D & Pixar' },
                { id: 'vintage', label: 'Vintage & Retro' },
                { id: 'anime', label: 'Anime & Manga' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${
                    activeCategory === cat.id
                      ? 'bg-[var(--text-primary)] text-[var(--background)] font-semibold border-transparent shadow-sm'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-white hover:border-gray-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Art Styles Grid with Actual Visual Images */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {filteredStyles.map((style) => {
                const isSelected = selectedStyle?.id === style.id;
                return (
                  <div
                    key={style.id}
                    onClick={() => setSelectedStyle(isSelected ? null : style)}
                    className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 flex flex-col ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-500/50 shadow-lg scale-[1.02]'
                        : 'border-[var(--border-color)] hover:border-cyan-500/40 hover:scale-[1.01]'
                    } bg-[var(--card-bg)]`}
                  >
                    {/* Style Artwork Image Preview */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                      <img 
                        src={style.imageUrl} 
                        alt={style.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white border border-white/20">
                          {style.badge}
                        </span>
                      </div>
                    </div>

                    {/* Style Meta Footer */}
                    <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-[var(--card-bg)]/90">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-300 transition-colors">
                          {style.name}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-snug">
                          {style.tagline}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-secondary)]">Use Style</span>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-gray-500 text-transparent'
                        }`}>
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Gallery Tab */
          <div className="space-y-4">
            {creations.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-secondary)]">
                <p className="text-sm font-medium">No creations saved in your Library yet.</p>
                <p className="text-xs mt-1">Generate an image or upload one to start editing!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {creations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setEditingItem(item)}
                    className="group relative rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--card-bg)] cursor-pointer hover:border-cyan-500/50 transition-all shadow"
                  >
                    <div className="aspect-square w-full bg-black/40 overflow-hidden relative">
                      <img 
                        src={item.url} 
                        alt={item.prompt} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {item.editType && item.editType !== 'initial' && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                          {item.editType}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-[var(--text-primary)] truncate font-medium">{item.prompt || 'Generated Creation'}</p>
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-1">
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="hover:text-red-400 p-1"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating Bottom Input Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[var(--app-bg)] via-[var(--app-bg)]/95 to-transparent pt-6 pb-4 px-3 sm:px-6 z-20 pointer-events-none">
        <div className="max-w-3xl mx-auto w-full pointer-events-auto space-y-2">
          
          {/* Controls Bar: Aspect Ratio, Batch, Quality */}
          <div className="flex items-center justify-between px-1 flex-wrap gap-2 text-xs">
            {/* Aspect Ratio Selector */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-[var(--text-secondary)]">Aspect:</span>
              {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all ${
                    aspectRatio === ratio
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-white bg-[var(--card-bg)]'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            {/* Multiple Images Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-[var(--text-secondary)]">Count:</span>
              {[1, 2, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setBatchCount(num)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-all ${
                    batchCount === num
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-white bg-[var(--card-bg)]'
                  }`}
                  title={`Generate ${num} image${num > 1 ? 's' : ''} at once`}
                >
                  {num}x
                </button>
              ))}
            </div>

            {/* Quality Selector */}
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <span className="text-[11px] text-[var(--text-secondary)] hidden xs:inline">Quality:</span>
              {(['Standard', 'HD', 'Ultra Pro', 'Cinema 8K'] as const).map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    quality === q
                      ? 'bg-emerald-600 text-white shadow-sm scale-105 ring-1 ring-emerald-400'
                      : 'text-[var(--text-secondary)] hover:text-white bg-[var(--card-bg)] border border-white/5'
                  }`}
                  title={`${q} generation quality`}
                >
                  {q === 'Cinema 8K' ? '8K Cinema' : q === 'Ultra Pro' ? '4K Ultra' : q}
                </button>
              ))}
            </div>

            {/* Power Options Studio Button */}
            <button
              type="button"
              onClick={() => setShowPowerOptions(!showPowerOptions)}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center space-x-1 transition-all border ${
                showPowerOptions || negativePrompt || lightingMode !== 'Natural' || cameraLens !== 'Standard 50mm'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-400/30'
                  : 'bg-[var(--card-bg)] text-neutral-300 border-white/10 hover:text-white hover:border-amber-400/40'
              }`}
              title="Configure Power Options: Lighting, Lens, Negative Prompts, Guidance"
            >
              <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Power Options</span>
              {(negativePrompt || lightingMode !== 'Natural' || cameraLens !== 'Standard 50mm') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>

          {/* Power Options Studio Drawer / Modal */}
          {showPowerOptions && (
            <div className="mb-2 p-3 bg-[#151520] border border-amber-500/40 rounded-2xl shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-200 text-xs">Power Options & Quality Studio</h4>
                    <p className="text-[10px] text-neutral-400">Fine-tune optics, lighting, negative constraints, and output fidelity</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPowerOptions(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Lighting Simulation */}
                <div>
                  <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                    Dynamic Lighting
                  </label>
                  <select
                    value={lightingMode}
                    onChange={(e) => setLightingMode(e.target.value as any)}
                    className="w-full bg-[#20202c] border border-white/10 rounded-xl p-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="Natural">Natural Ambient Lighting</option>
                    <option value="Cinematic Studio">Cinematic Studio (3-Point Softbox)</option>
                    <option value="Golden Hour">Golden Hour Sunset Glow</option>
                    <option value="Cyberpunk Neon">Cyberpunk Neon & Volumetric Hue</option>
                    <option value="Dramatic Noir">Dramatic Film Noir Chiaroscuro</option>
                  </select>
                </div>

                {/* Camera Optics Simulation */}
                <div>
                  <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                    Camera Lens Simulation
                  </label>
                  <select
                    value={cameraLens}
                    onChange={(e) => setCameraLens(e.target.value as any)}
                    className="w-full bg-[#20202c] border border-white/10 rounded-xl p-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="Standard 50mm">Standard 50mm Prime (Natural Perspective)</option>
                    <option value="Portrait 85mm Bokeh">Portrait 85mm f/1.4 Bokeh Blur</option>
                    <option value="Wide 24mm">Wide-Angle 24mm (Landscape / Room Scale)</option>
                    <option value="Macro Close-Up">Macro Lens (Extreme Intricate Detail)</option>
                  </select>
                </div>

                {/* Guidance Scale Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      Prompt Adherence: {guidanceScale}
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      {guidanceScale < 6 ? 'Creative' : guidanceScale > 12 ? 'Strict' : 'Balanced'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Negative Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                    Negative Prompt (What to Avoid / Exclude)
                  </label>
                  <span className="text-[10px] text-neutral-400">Optional</span>
                </div>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="e.g. blurry, distorted anatomy, low contrast, text, bad hands, extra limbs..."
                  className="w-full bg-[#20202c] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-rose-400"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['no blur', 'no distortion', 'no watermarks', 'clean background', 'photorealistic only'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNegativePrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 border border-white/5 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setNegativePrompt('');
                    setLightingMode('Natural');
                    setCameraLens('Standard 50mm');
                    setGuidanceScale(8);
                  }}
                  className="px-3 py-1 rounded-lg text-xs text-neutral-400 hover:text-white"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setShowPowerOptions(false)}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow"
                >
                  Apply & Close
                </button>
              </div>
            </div>
          )}

          {/* Active Style / Staged Image Chips Bar */}
          {(selectedStyle || stagedImage) && (
            <div className="mb-1.5 flex items-center space-x-2 px-1">
              {selectedStyle && (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs shadow">
                  <span>Style: <strong>{selectedStyle.name}</strong></span>
                  <button 
                    onClick={() => setSelectedStyle(null)}
                    className="hover:text-white text-cyan-400 ml-1"
                  >
                    ✕
                  </button>
                </div>
              )}
              {stagedImage && (
                <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs shadow">
                  <span className="truncate max-w-[120px]">Image attached for edit</span>
                  <button 
                    onClick={() => setStagedImage(null)}
                    className="hover:text-white text-indigo-400 ml-1"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Main Floating Input Pill */}
          <div className="relative flex items-center rounded-2xl bg-[var(--card-bg)]/95 border border-[var(--border-color)] shadow-2xl backdrop-blur-xl p-1.5 sm:p-2 transition-all focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20">
            
            {/* Gallery Upload Icon Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-[var(--background)] transition-colors flex-shrink-0"
              title="Upload an image to edit or reference"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Text Input Area */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={stagedImage ? "Describe what to edit in the image..." : (selectedStyle ? `Describe image in ${selectedStyle.name} style...` : "Describe an image to create (e.g. cute cat in space)...")}
              className="w-full resize-none bg-transparent px-2.5 py-1 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none min-h-[38px] max-h-28"
            />

            {/* Right Icons: Mic & Send/Generate */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
              
              {/* Voice Input Button */}
              <button
                onClick={handleToggleSpeech}
                className={`p-2 rounded-xl transition-all flex items-center space-x-1.5 ${
                  isListening 
                    ? 'text-red-400 bg-red-500/20 animate-pulse ring-2 ring-red-500/30 shadow-lg shadow-red-500/20' 
                    : 'text-cyan-400 bg-cyan-500/10 hover:text-white hover:bg-cyan-500/30'
                }`}
                title="Voice input (dictate prompt)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-[10px] font-bold hidden sm:inline">STT</span>
              </button>

              {/* Generate / Send Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && !stagedImage)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-white transition-all shadow-md ${
                  isGenerating || (!prompt.trim() && !stagedImage)
                    ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-500 active:scale-95'
                }`}
                title="Create Image"
              >
                {isGenerating ? (
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          IMAGE STUDIO & POWERHOUSE EDITOR MODAL WITH VISUAL GRID OVERLAY
      ========================================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)]">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-xs sm:max-w-md">
                    Image Studio & Composition Editor
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Remove, Move, or Shift Perspective with Precision Visual Grid Overlays
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Download Button */}
                <button
                  onClick={() => handleDownload(editingItem)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-[var(--card-bg)] hover:bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-colors flex items-center space-x-1"
                  title="Download Image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden xs:inline">Download</span>
                </button>

                {/* Send to Chat Button */}
                {onSendToChat && (
                  <button
                    onClick={() => {
                      handleSendToChat(editingItem);
                      setEditingItem(null);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors flex items-center space-x-1 shadow"
                    title="Discuss or analyze this in Chat"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Send to Chat</span>
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--card-bg)] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Two Columns (Preview Canvas with Grid on Left, Tool Controls on Right) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-0">
              
              {/* Left Column: Image Canvas + Visual Grid Overlay Toolbar */}
              <div className="md:col-span-7 p-3 sm:p-4 bg-black/50 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-[var(--border-color)] relative select-none">
                
                {/* Canvas Top Bar: Before/After & Visual Grid Selector Toolbar */}
                <div className="w-full flex items-center justify-between flex-wrap gap-2 mb-2 z-20">
                  
                  {/* Before/After Toggle if edited */}
                  {editingItem.originalUrl ? (
                    <div className="flex items-center bg-black/80 backdrop-blur-md rounded-lg p-0.5 border border-white/20 text-xs shadow-lg">
                      <button
                        onClick={() => setShowComparison(false)}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          !showComparison ? 'bg-cyan-500 text-black font-semibold' : 'text-white/80 hover:text-white'
                        }`}
                      >
                        Edited
                      </button>
                      <button
                        onClick={() => setShowComparison(true)}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          showComparison ? 'bg-cyan-500 text-black font-semibold' : 'text-white/80 hover:text-white'
                        }`}
                      >
                        Original
                      </button>
                    </div>
                  ) : <div />}

                  {/* VISUAL GRID SELECTOR BAR */}
                  <div className="flex items-center space-x-1 bg-[#12141c]/90 border border-cyan-500/30 rounded-xl px-2 py-1 shadow-lg backdrop-blur-md">
                    <span className="text-[10px] font-mono text-cyan-300 uppercase mr-1">Grid:</span>
                    {[
                      { id: 'none', label: 'Off' },
                      { id: 'rule_of_thirds', label: '3x3 Thirds' },
                      { id: 'perspective', label: 'Perspective' },
                      { id: 'grid_4x4', label: '4x4 Align' },
                      { id: 'golden_ratio', label: 'Spiral' },
                      { id: 'crosshair', label: 'Center' },
                    ].map(g => (
                      <button
                        key={g.id}
                        onClick={() => setGridOverlay(g.id as any)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded-md transition-all ${
                          gridOverlay === g.id
                            ? 'bg-cyan-500 text-black font-bold shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                        title={`Toggle ${g.label} Composition Grid`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Interactive Canvas Wrapper with Rendered Grid Overlays */}
                <div 
                  ref={canvasContainerRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  className={`relative max-h-[55vh] max-w-full rounded-xl overflow-hidden border border-white/15 shadow-2xl flex items-center justify-center bg-black/60 my-auto select-none ${
                    editorTool === 'perspective_shift' && perspectiveMode === '3d_drag'
                      ? 'cursor-grab active:cursor-grabbing'
                      : (editorTool === 'area_select_edit' || editorTool === 'remove_object')
                      ? 'cursor-crosshair'
                      : ''
                  }`}
                  style={{ perspective: '900px' }}
                >
                  
                  <img 
                    src={showComparison && editingItem.originalUrl ? editingItem.originalUrl : editingItem.url} 
                    alt="Canvas Preview"
                    className="max-h-[50vh] max-w-full object-contain pointer-events-none transition-transform duration-75"
                    style={
                      editorTool === 'perspective_shift' && perspectiveMode === '3d_drag'
                        ? {
                            transform: `rotateX(${dragAngles.rotateX}deg) rotateY(${dragAngles.rotateY}deg) scale(${dragAngles.scale})`,
                            transformStyle: 'preserve-3d',
                          }
                        : undefined
                    }
                  />

                  {/* 3D Perspective Drag Active HUD Overlay */}
                  {editorTool === 'perspective_shift' && perspectiveMode === '3d_drag' && (
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none z-20">
                      <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-500/40 text-[11px] font-mono text-amber-300 flex items-center space-x-2 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>3D Drag Active: Pitch <strong>{Math.round(dragAngles.rotateX)}°</strong>, Yaw <strong>{Math.round(dragAngles.rotateY)}°</strong></span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setDragAngles({ rotateX: 0, rotateY: 0, scale: 1 })}
                        className="pointer-events-auto bg-black/80 hover:bg-black text-[10px] text-neutral-300 hover:text-white px-2 py-1 rounded-lg border border-white/10 shadow"
                      >
                        Reset 0°
                      </button>
                    </div>
                  )}

                  {/* Area Selection Box Overlay */}
                  {selectedArea && selectedArea.width > 0 && (
                    <div
                      className={`absolute border-2 border-dashed rounded pointer-events-none z-20 transition-all ${
                        selectedArea.action === 'remove'
                          ? 'border-red-400 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                          : 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      }`}
                      style={{
                        left: `${selectedArea.x}%`,
                        top: `${selectedArea.y}%`,
                        width: `${selectedArea.width}%`,
                        height: `${selectedArea.height}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 flex items-center space-x-1.5 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border border-white/20 shadow-lg">
                        <span className={selectedArea.action === 'remove' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {selectedArea.action === 'remove' ? '🗑️ Remove Area' : '➕ Link / Add Area'}
                        </span>
                        <span className="text-neutral-400">({Math.round(selectedArea.width)}% × {Math.round(selectedArea.height)}%)</span>
                      </div>
                    </div>
                  )}

                  {/* Helper Prompt Overlay for Area Selection */}
                  {(editorTool === 'area_select_edit' || (editorTool === 'remove_object' && !selectedArea)) && !isSelectingArea && (
                    <div className="absolute bottom-2 inset-x-2 flex justify-center pointer-events-none z-10">
                      <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[10px] text-neutral-300 shadow-md">
                        {selectedArea ? 'Area selected • Adjust instructions on the right' : 'Click & drag across image to highlight an object, person, or area'}
                      </div>
                    </div>
                  )}

                  {/* RENDERED VISUAL GRID OVERLAY SVG */}
                  {gridOverlay !== 'none' && (
                    <svg 
                      className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-150"
                      viewBox="0 0 300 300"
                      preserveAspectRatio="none"
                      style={{ opacity: gridOpacity }}
                    >
                      {/* 1. Rule of Thirds (3x3) */}
                      {gridOverlay === 'rule_of_thirds' && (
                        <g stroke={getGridColorHex()} strokeWidth="1.2">
                          {/* Vertical Thirds */}
                          <line x1="100" y1="0" x2="100" y2="300" strokeDasharray="3,3" />
                          <line x1="200" y1="0" x2="200" y2="300" strokeDasharray="3,3" />
                          {/* Horizontal Thirds */}
                          <line x1="0" y1="100" x2="300" y2="100" strokeDasharray="3,3" />
                          <line x1="0" y1="200" x2="300" y2="200" strokeDasharray="3,3" />
                          {/* Intersection Power Points */}
                          <circle cx="100" cy="100" r="4" fill={getGridColorHex()} />
                          <circle cx="200" cy="100" r="4" fill={getGridColorHex()} />
                          <circle cx="100" cy="200" r="4" fill={getGridColorHex()} />
                          <circle cx="200" cy="200" r="4" fill={getGridColorHex()} />
                        </g>
                      )}

                      {/* 2. Perspective Vanishing Grid */}
                      {gridOverlay === 'perspective' && (
                        <g stroke={getGridColorHex()} strokeWidth="1.2">
                          {/* Horizon Line */}
                          <line x1="0" y1="150" x2="300" y2="150" strokeWidth="2" />
                          {/* Vanishing Point Radial Rays */}
                          <circle cx="150" cy="150" r="5" fill={getGridColorHex()} />
                          <line x1="150" y1="150" x2="0" y2="0" strokeDasharray="4,3" />
                          <line x1="150" y1="150" x2="75" y2="0" strokeDasharray="4,3" />
                          <line x1="150" y1="150" x2="225" y2="0" strokeDasharray="4,3" />
                          <line x1="150" y1="150" x2="300" y2="0" strokeDasharray="4,3" />
                          <line x1="150" y1="150" x2="0" y2="300" strokeDasharray="4,3" />
                          <line x1="150" y1="150" x2="75" y2="300" strokeDasharray="4,3" />
                          <line x1="150" y1="150" x2="225" y2="300" strokeDasharray="4,3" />
                          <line x1="150" y1="150" x2="300" y2="300" strokeDasharray="4,3" />
                        </g>
                      )}

                      {/* 3. 4x4 Precision Alignment Grid */}
                      {gridOverlay === 'grid_4x4' && (
                        <g stroke={getGridColorHex()} strokeWidth="0.8" strokeDasharray="2,2">
                          <line x1="75" y1="0" x2="75" y2="300" />
                          <line x1="150" y1="0" x2="150" y2="300" strokeWidth="1.5" strokeDasharray="none" />
                          <line x1="225" y1="0" x2="225" y2="300" />
                          <line x1="0" y1="75" x2="300" y2="75" />
                          <line x1="0" y1="150" x2="300" y2="150" strokeWidth="1.5" strokeDasharray="none" />
                          <line x1="0" y1="225" x2="300" y2="225" />
                        </g>
                      )}

                      {/* 4. Golden Ratio Spiral */}
                      {gridOverlay === 'golden_ratio' && (
                        <g stroke={getGridColorHex()} strokeWidth="1.5" fill="none">
                          <rect x="0" y="0" width="300" height="300" opacity="0.3" />
                          <path d="M0,300 A300,300 0 0,1 300,0 A185,185 0 0,1 115,185 A115,115 0 0,1 115,70 A70,70 0 0,1 185,70 A45,45 0 0,1 185,115" strokeWidth="2" />
                        </g>
                      )}

                      {/* 5. Center Crosshair */}
                      {gridOverlay === 'crosshair' && (
                        <g stroke={getGridColorHex()} strokeWidth="1.2">
                          <line x1="150" y1="0" x2="150" y2="300" strokeDasharray="4,4" />
                          <line x1="0" y1="150" x2="300" y2="150" strokeDasharray="4,4" />
                          <circle cx="150" cy="150" r="30" fill="none" strokeWidth="1.5" />
                          <circle cx="150" cy="150" r="60" fill="none" strokeDasharray="2,2" opacity="0.6" />
                          <circle cx="150" cy="150" r="3" fill={getGridColorHex()} />
                        </g>
                      )}
                    </svg>
                  )}

                  {/* Loading Spinner during edit execution */}
                  {isProcessingEdit && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 p-4 z-30">
                      <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <div className="text-center">
                        <div className="text-xs font-semibold text-cyan-300">
                          {editorTool === 'remove_object' ? 'Surgically removing object & inpainting...' :
                           editorTool === 'move_object' ? 'Repositioning object & blending background...' :
                           editorTool === 'perspective_shift' ? 'Adjusting camera angle & re-framing...' :
                           'Applying creative AI edit...'}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          Reconstructing scene with Gemini 3.1 Flash Image
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Canvas Bottom Bar: Grid Tuning (Opacity & Color) */}
                {gridOverlay !== 'none' && (
                  <div className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-400 mt-2 px-2 bg-black/60 rounded-xl p-1.5 border border-white/10">
                    <div className="flex items-center space-x-2">
                      <span>Opacity:</span>
                      <input 
                        type="range"
                        min="0.2"
                        max="1"
                        step="0.05"
                        value={gridOpacity}
                        onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                        className="w-20 h-1 bg-neutral-700 rounded appearance-none accent-cyan-400"
                      />
                      <span>{Math.round(gridOpacity * 100)}%</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span>Color:</span>
                      {(['cyan', 'amber', 'emerald', 'white', 'purple'] as const).map(c => (
                        <button
                          key={c}
                          onClick={() => setGridColor(c)}
                          className={`w-3.5 h-3.5 rounded-full border ${
                            gridColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70'
                          }`}
                          style={{
                            backgroundColor: c === 'cyan' ? '#06b6d4' : c === 'amber' ? '#f59e0b' : c === 'emerald' ? '#10b981' : c === 'purple' ? '#a855f7' : '#ffffff'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {editingItem.editNote && (
                  <div className="mt-2 text-[11px] text-cyan-400/90 text-center font-mono">
                    ✦ {editingItem.editNote}
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Tool Suite */}
              <div className="md:col-span-5 p-4 flex flex-col justify-between bg-[var(--sidebar-bg)] overflow-y-auto">
                
                <div>
                  {/* Tool Tabs Header */}
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5 flex items-center justify-between">
                    <span>Select Editing Tool</span>
                    <span className="text-[10px] text-cyan-400/80 font-normal">AI Powered Image Studio</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    
                    {/* Tool 1: Edit with Message */}
                    <button
                      onClick={() => setEditorTool('edit_message')}
                      className={`p-2 rounded-xl text-xs font-medium border flex items-center space-x-2 transition-all text-left ${
                        editorTool === 'edit_message'
                          ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="truncate">Edit with Message</span>
                    </button>

                    {/* Tool 2: Remove Tool */}
                    <button
                      onClick={() => setEditorTool('remove_object')}
                      className={`p-2 rounded-xl text-xs font-medium border flex items-center space-x-2 transition-all text-left ${
                        editorTool === 'remove_object'
                          ? 'bg-red-600/20 border-red-500 text-red-300 shadow-sm'
                          : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="truncate">Remove Tool</span>
                    </button>

                    {/* Tool 3: Area Select & Link Tool */}
                    <button
                      onClick={() => {
                        setEditorTool('area_select_edit');
                        if (!selectedArea) {
                          setSelectedArea({ x: 25, y: 25, width: 50, height: 50, action: areaActionChoice });
                        }
                      }}
                      className={`p-2 rounded-xl text-xs font-medium border flex items-center space-x-2 transition-all text-left ${
                        editorTool === 'area_select_edit'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="truncate">Select Area & Link</span>
                    </button>

                    {/* Tool 4: Change Perspective / 3D Drag */}
                    <button
                      onClick={() => setEditorTool('perspective_shift')}
                      className={`p-2 rounded-xl text-xs font-medium border flex items-center space-x-2 transition-all text-left ${
                        editorTool === 'perspective_shift'
                          ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                      </svg>
                      <span className="truncate">Change Perspective</span>
                    </button>
                  </div>

                  {/* Dynamic Tool Controls */}
                  {editorTool === 'edit_message' && (
                    <div className="space-y-3 animate-fade-in">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                          Instruction for Modification
                        </label>
                        <textarea
                          rows={3}
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          placeholder="e.g. Add neon sunglasses, change hair color to auburn, make it rain with reflections..."
                          className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase">One-Click Presets:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[
                            "Add golden hour sunset lighting",
                            "Make it winter with falling snow",
                            "Add cyberpunk neon reflections",
                            "Change background to a tropical beach",
                            "Add vintage 35mm film grain"
                          ].map((p, i) => (
                            <button
                              key={i}
                              onClick={() => setEditInstruction(p)}
                              className="px-2 py-0.5 text-[10px] rounded-md bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-cyan-400 transition-colors"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tool: Remove Object */}
                  {editorTool === 'remove_object' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/30 text-xs text-red-200">
                        Select objects or people in the image to remove. You can drag a box directly on the image or describe what to remove below.
                      </div>

                      {selectedArea && selectedArea.width > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs">
                          <span className="text-red-300">
                            🎯 Canvas Area Box Selected: ({Math.round(selectedArea.width)}% × {Math.round(selectedArea.height)}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedArea(null)}
                            className="text-neutral-400 hover:text-red-300 text-[10px] underline"
                          >
                            Clear Box
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                          Object or Person to Remove
                        </label>
                        <input
                          type="text"
                          value={targetObject}
                          onChange={(e) => setTargetObject(e.target.value)}
                          placeholder="e.g. the person on the left, the coffee cup on the table, background photobomber..."
                          className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase">Common removals:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[
                            "the person standing on the right",
                            "the person in the background",
                            "the object in front of the subject",
                            "the watermark / text",
                            "the trash on the ground"
                          ].map((s, i) => (
                            <button
                              key={i}
                              onClick={() => setTargetObject(s)}
                              className="px-2 py-0.5 text-[10px] rounded-md bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-300 hover:border-red-400 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tool: Area Select & Link Message */}
                  {editorTool === 'area_select_edit' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200">
                        <strong>Area Select & Link Tool:</strong> Drag on the preview image to select a zone, then link an instruction to add or modify elements specifically inside that area.
                      </div>

                      {/* Area Action Toggle */}
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                          Action for Selected Area
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAreaActionChoice('add');
                              if (selectedArea) setSelectedArea({ ...selectedArea, action: 'add' });
                            }}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                              areaActionChoice === 'add'
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                                : 'bg-[var(--card-bg)] text-neutral-400 border-[var(--border-color)] hover:text-white'
                            }`}
                          >
                            ➕ Add Something Here
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAreaActionChoice('modify');
                              if (selectedArea) setSelectedArea({ ...selectedArea, action: 'modify' });
                            }}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                              areaActionChoice === 'modify'
                                ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                                : 'bg-[var(--card-bg)] text-neutral-400 border-[var(--border-color)] hover:text-white'
                            }`}
                          >
                            ✏️ Modify / Change Area
                          </button>
                        </div>
                      </div>

                      {/* Area Position Coordinates & Reset */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 text-[11px]">
                        <span className="text-neutral-300">
                          {selectedArea 
                            ? `Box: X ${Math.round(selectedArea.x)}%, Y ${Math.round(selectedArea.y)}% (${Math.round(selectedArea.width)}% × ${Math.round(selectedArea.height)}%)`
                            : 'No box selected. Drag on image to create box.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedArea({ x: 20, y: 20, width: 60, height: 60, action: areaActionChoice })}
                          className="text-emerald-400 hover:text-emerald-300 text-[10px] underline"
                        >
                          Auto Center (60%)
                        </button>
                      </div>

                      {/* Linked Instruction Message */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                          Linked Message / Instruction for this Area
                        </label>
                        <textarea
                          rows={2}
                          value={areaCustomPrompt}
                          onChange={(e) => setAreaCustomPrompt(e.target.value)}
                          placeholder={
                            areaActionChoice === 'add'
                              ? "e.g. Add an adorable fluffy golden retriever dog sitting here, add a glowing neon sign..."
                              : "e.g. Change clothing to a formal dark tuxedo, replace this object with a crystal orb..."
                          }
                          className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Quick Idea Chips */}
                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase">Quick Suggestions:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(areaActionChoice === 'add' ? [
                            "Add stylish sunglasses",
                            "Add warm glowing candles",
                            "Add blooming floral vines",
                            "Add a friendly pet companion",
                            "Add a floating holographic HUD"
                          ] : [
                            "Change hair style and color",
                            "Swap outfit for futuristic cyber jacket",
                            "Turn this surface into polished marble",
                            "Enhance lighting and sharpness here"
                          ]).map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setAreaCustomPrompt(s)}
                              className="px-2 py-0.5 text-[10px] rounded-md bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-emerald-300 hover:border-emerald-400 transition-colors"
                            >
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tool: Change Perspective / 3D Drag */}
                  {editorTool === 'perspective_shift' && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Sub-mode selector: Interactive 3D Drag vs Camera Presets */}
                      <div className="flex rounded-xl p-1 bg-black/40 border border-white/10">
                        <button
                          type="button"
                          onClick={() => setPerspectiveMode('3d_drag')}
                          className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                            perspectiveMode === '3d_drag'
                              ? 'bg-amber-500 text-black shadow'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                          </svg>
                          <span>Interactive 3D Drag</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPerspectiveMode('presets')}
                          className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                            perspectiveMode === 'presets'
                              ? 'bg-amber-500 text-black shadow'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Camera Presets
                        </button>
                      </div>

                      {perspectiveMode === '3d_drag' ? (
                        <div className="space-y-2.5">
                          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                            <p className="font-semibold">Drag directly on the image to rotate perspective in 3D!</p>
                            <p className="text-[10px] text-amber-300/80">
                              Fine-tune the horizontal (Yaw) and vertical (Pitch) angles below. Gemini will re-render the scene from your new camera angle.
                            </p>
                          </div>

                          {/* Live Angle Sliders */}
                          <div className="space-y-2 bg-black/30 p-2.5 rounded-xl border border-white/10">
                            {/* Horizontal Yaw Angle */}
                            <div>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-neutral-300 font-medium">Horizontal Yaw (Left/Right)</span>
                                <span className="text-amber-400 font-mono font-bold">{Math.round(dragAngles.rotateY)}°</span>
                              </div>
                              <input
                                type="range"
                                min="-45"
                                max="45"
                                value={dragAngles.rotateY}
                                onChange={(e) => setDragAngles(prev => ({ ...prev, rotateY: Number(e.target.value) }))}
                                className="w-full accent-amber-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Vertical Pitch Angle */}
                            <div>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-neutral-300 font-medium">Vertical Pitch (Tilt Up/Down)</span>
                                <span className="text-amber-400 font-mono font-bold">{Math.round(dragAngles.rotateX)}°</span>
                              </div>
                              <input
                                type="range"
                                min="-35"
                                max="35"
                                value={dragAngles.rotateX}
                                onChange={(e) => setDragAngles(prev => ({ ...prev, rotateX: Number(e.target.value) }))}
                                className="w-full accent-amber-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Zoom / Field Scale */}
                            <div>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-neutral-300 font-medium">Depth Zoom / Scale</span>
                                <span className="text-amber-400 font-mono font-bold">{dragAngles.scale.toFixed(2)}x</span>
                              </div>
                              <input
                                type="range"
                                min="0.8"
                                max="1.3"
                                step="0.05"
                                value={dragAngles.scale}
                                onChange={(e) => setDragAngles(prev => ({ ...prev, scale: Number(e.target.value) }))}
                                className="w-full accent-amber-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Quick Angle Presets */}
                          <div>
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase">Quick Angle Snaps:</span>
                            <div className="grid grid-cols-4 gap-1 mt-1">
                              {[
                                { label: '3/4 Left', x: -5, y: -25 },
                                { label: 'Front', x: 0, y: 0 },
                                { label: '3/4 Right', x: -5, y: 25 },
                                { label: 'Hero Low', x: -18, y: 0 },
                              ].map((snap, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setDragAngles({ rotateX: snap.x, rotateY: snap.y, scale: 1 })}
                                  className="py-1 text-[10px] rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-neutral-300 hover:text-white hover:border-amber-400 transition-colors"
                                >
                                  {snap.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {[
                              { id: 'right_to_center', label: 'Right to Center (Center Stage)', desc: 'Re-frames subject from right edge into the exact center' },
                              { id: 'left_to_center', label: 'Left to Center', desc: 'Re-frames subject from left edge into the center' },
                              { id: 'wide_angle', label: 'Wide-Angle Field of View', desc: 'Expands scene context with a cinematic wide lens' },
                              { id: 'low_angle', label: 'Heroic Low Angle', desc: 'Camera tilts up towards subject for dramatic stature' },
                              { id: 'high_angle', label: 'High Overhead Angle', desc: 'Overhead camera looking down' },
                              { id: 'three_quarter', label: 'Cinematic 3/4 Profile', desc: 'Rotates camera perspective around subject' },
                            ].map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setPerspectiveType(p.id as any)}
                                className={`p-2 rounded-xl border cursor-pointer transition-all ${
                                  perspectiveType === p.id
                                    ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-sm'
                                    : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white'
                                }`}
                              >
                                <div className="font-semibold text-xs text-[var(--text-primary)]">
                                  {p.label}
                                </div>
                                <div className="text-[10px] text-[var(--text-secondary)]">
                                  {p.desc}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                          Optional Custom Framing Instructions
                        </label>
                        <input
                          type="text"
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          placeholder="e.g. Keep lighting cinematic, widen depth of field..."
                          className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Execution Button */}
                <div className="pt-4 border-t border-[var(--border-color)] mt-4">
                  <button
                    onClick={handleExecuteEdit}
                    disabled={isProcessingEdit}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center space-x-2 ${
                      isProcessingEdit
                        ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                        : editorTool === 'remove_object'
                        ? 'bg-red-600 hover:bg-red-500'
                        : editorTool === 'area_select_edit'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : editorTool === 'perspective_shift'
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-cyan-600 hover:bg-cyan-500'
                    }`}
                  >
                    {isProcessingEdit ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Processing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>
                          {editorTool === 'remove_object' 
                            ? (selectedArea ? 'Remove Selected Area Box' : 'Execute Object Removal') :
                           editorTool === 'area_select_edit'
                            ? (areaActionChoice === 'add' ? 'Add Elements to Selected Area' : 'Modify Selected Area') :
                           editorTool === 'perspective_shift'
                            ? (perspectiveMode === '3d_drag' ? `Render 3D Perspective (${Math.round(dragAngles.rotateY)}° Yaw, ${Math.round(dragAngles.rotateX)}° Pitch)` : 'Apply Perspective Shift') :
                           'Apply Edit'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
