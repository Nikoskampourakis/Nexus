import React, { useState } from 'react';
import { 
  Sparkles, 
  Compass, 
  Sun, 
  Moon, 
  CloudRain, 
  Trees, 
  Building2, 
  Orbit, 
  Waves, 
  Flame, 
  Check, 
  Copy, 
  Download, 
  ArrowRight,
  Maximize2,
  X,
  Sliders,
  RefreshCw,
  Plus
} from 'lucide-react';
import { GeneratedImageItem } from '../types';
import { generateImageWithQuality } from '../services/geminiService';
import { saveStoredCreation, trackImageCreation } from '../services/storageService';

interface ImagineSceneToolProps {
  onSendToChat?: (imageBase64: string, promptText: string) => void;
  onSavedCreation?: (item: GeneratedImageItem) => void;
  onClose?: () => void;
  onSelectForEdit?: (item: GeneratedImageItem) => void;
}

export interface CuratedScene {
  id: string;
  title: string;
  category: 'nature' | 'scifi' | 'architecture' | 'cinematic' | 'fantasy';
  description: string;
  basePrompt: string;
  lightingHint: string;
  emoji: string;
  gradient: string;
  tags: string[];
}

const SCENE_CATALOG: CuratedScene[] = [
  {
    id: 'cyberpunk-neon-city',
    title: 'Cyberpunk Metropolis',
    category: 'scifi',
    description: 'Towering neon glass skyscrapers, rain-slicked holographic streets, flying traffic, and glowing magenta reflections.',
    basePrompt: 'Vast sprawling cyberpunk metropolis at midnight, towering crystalline skyscrapers with glowing holographic billboards, rain-slicked asphalt reflecting vivid neon pink and cyan light, flying aerial vehicles crossing between skybridges, high contrast cinematic photography',
    lightingHint: 'Neon Magenta & Electric Blue',
    emoji: '🏙️',
    gradient: 'from-purple-950 via-indigo-950 to-pink-950',
    tags: ['Sci-Fi', 'Night', 'Neon']
  },
  {
    id: 'bioluminescent-forest',
    title: 'Bioluminescent Deep Forest',
    category: 'fantasy',
    description: 'Enchanted primordial forest with glowing crystal moss, ethereal floating spores, and radiant cyan fauna.',
    basePrompt: 'Ancient primordial twilight forest illuminated by bioluminescent glowing cyan mushrooms, floating spore particles like embers, twisted colossal banyan trees wrapped in radiant teal vines, soft mystical mist winding through mossy hollows',
    lightingHint: 'Ethereal Cyan Spore Glow',
    emoji: '🌲',
    gradient: 'from-emerald-950 via-teal-950 to-cyan-950',
    tags: ['Fantasy', 'Glowing', 'Mystic']
  },
  {
    id: 'mediterranean-coast-cliff',
    title: 'Amalfi Coast Villa',
    category: 'nature',
    description: 'Sun-drenched Mediterranean cliffs, whitewashed terracotta villas, pink bougainvillea, and crystal turquoise waters.',
    basePrompt: 'Breathtaking high-angle cliffside view of the Amalfi coast, sun-washed whitewashed terracotta villas clinging to sheer cliffs, vibrant magenta bougainvillea cascading over stone balconies, crystalline deep turquoise Mediterranean waters below with gentle ripples, warm golden afternoon sun',
    lightingHint: 'Warm Golden Hour Sun',
    emoji: '🌊',
    gradient: 'from-blue-950 via-amber-950 to-orange-950',
    tags: ['Landscape', 'Coastal', 'Sunny']
  },
  {
    id: 'zen-temple-garden',
    title: 'Minimalist Zen Temple',
    category: 'architecture',
    description: 'Pristine Japanese rock garden, quiet water pond with koi, aged cedar pavilion, and tranquil morning bamboo mist.',
    basePrompt: 'Serene Japanese Zen pavilion made of dark weathered cedar wood, sliding shoji screens overlooking a raked sand rock garden, smooth reflecting koi pond with lily pads, gentle morning mist winding through a towering green bamboo grove, perfectly balanced minimalist architectural composition',
    lightingHint: 'Soft Diffused Morning Mist',
    emoji: '⛩️',
    gradient: 'from-stone-900 via-emerald-950 to-zinc-900',
    tags: ['Architecture', 'Peaceful', 'Zen']
  },
  {
    id: 'martian-colony-outpost',
    title: 'Futuristic Mars Colony',
    category: 'scifi',
    description: 'Geodesic habitat domes on rust-red dunes, pressurized rovers, dust haze, and the twin moons Phobos and Deimos.',
    basePrompt: 'Pioneering human research colony on the surface of Mars, geodesic glass biosphere domes glowing with warm interior plant lights, red iron oxide sand dunes under a dusty butterscotch sky, pressurized exploration rovers parked outside airlocks, distant twin moons visible in the thin atmosphere',
    lightingHint: 'Dusty Martian Dusk',
    emoji: '🪐',
    gradient: 'from-orange-950 via-red-950 to-amber-950',
    tags: ['Space', 'Mars', 'Outpost']
  },
  {
    id: 'nordic-aurora-fjord',
    title: 'Nordic Aurora Glacier',
    category: 'nature',
    description: 'Vibrant emerald aurora borealis dancing over towering snowy peaks and black volcanic sand fjords.',
    basePrompt: 'Spectacular emerald and violet Aurora Borealis dancing across a crystal clear starry night sky, reflecting perfectly in a mirror-still Arctic fjord, jagged snow-capped glacier mountains framing the horizon, pristine volcanic black sand shoreline dusted with frost',
    lightingHint: 'Vibrant Green Aurora',
    emoji: '🌌',
    gradient: 'from-teal-950 via-emerald-950 to-slate-950',
    tags: ['Arctic', 'Aurora', 'Night']
  },
  {
    id: 'grand-vintage-library',
    title: 'Grand Renaissance Library',
    category: 'architecture',
    description: 'Soaring arched carved mahogany bookshelves, spiral staircases, brass armillary spheres, and dusty sunbeams.',
    basePrompt: 'Colossal multi-story Victorian Gothic library with ornate spiral cast-iron staircases leading to towering shelves packed with antique leather-bound books, massive stained-glass arched windows casting dramatic golden sunbeams illuminating floating dust motes, polished marble floor reflections',
    lightingHint: 'Dramatic Volumetric Sunbeams',
    emoji: '📚',
    gradient: 'from-amber-950 via-yellow-950 to-stone-900',
    tags: ['Historical', 'Library', 'Moody']
  },
  {
    id: 'rainy-midnight-cafe',
    title: 'Cozy Midnight Parisian Cafe',
    category: 'cinematic',
    description: 'Warm amber pendant lamps, wet cobblestone streets, steaming espresso, and rain streaks on the bistro window.',
    basePrompt: 'Atmospheric Parisian corner bistro late at night during a gentle rain, amber art deco pendant lights glowing warmly through condensation-streaked glass, wet cobblestone street outside reflecting vintage streetlamps, steaming porcelain cup on a small brass table, cinematic shallow depth of field',
    lightingHint: 'Warm Amber & Rainy Contrast',
    emoji: '☕',
    gradient: 'from-amber-950 via-zinc-900 to-stone-950',
    tags: ['Cinematic', 'Rain', 'Cozy']
  },
  {
    id: 'underwater-coral-paradise',
    title: 'Sunlit Coral Reef Haven',
    category: 'nature',
    description: 'Crystal azure waters, sun caustics dancing on brain corals, sea turtles gliding through vibrant schools of fish.',
    basePrompt: 'Crystal clear underwater photography inside a pristine tropical coral reef, shimmering sunlight caustics dancing across multicolored soft corals and sea fans, sea turtle gliding gracefully through schools of vivid yellow tang and clownfish, extraordinary water clarity and light refraction',
    lightingHint: 'Sunlight Water Caustics',
    emoji: '🐠',
    gradient: 'from-cyan-950 via-blue-950 to-teal-950',
    tags: ['Ocean', 'Marine', 'Tropical']
  }
];

export const ImagineSceneTool: React.FC<ImagineSceneToolProps> = ({
  onSendToChat,
  onSavedCreation,
  onClose,
  onSelectForEdit
}) => {
  const [selectedScene, setSelectedScene] = useState<CuratedScene>(SCENE_CATALOG[0]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [lightingPreset, setLightingPreset] = useState<string>('scene-default');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [artStyle, setArtStyle] = useState<string>('Cinematic Photorealism');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Scenes' },
    { id: 'nature', label: 'Landscapes & Nature' },
    { id: 'scifi', label: 'Sci-Fi & Futuristic' },
    { id: 'architecture', label: 'Architecture & Spaces' },
    { id: 'cinematic', label: 'Cinematic Moods' },
    { id: 'fantasy', label: 'Fantasy & Surreal' }
  ];

  const filteredScenes = filterCategory === 'all' 
    ? SCENE_CATALOG 
    : SCENE_CATALOG.filter(s => s.category === filterCategory);

  const lightingOptions = [
    { id: 'scene-default', label: 'Scene Default Lighting', hint: selectedScene.lightingHint },
    { id: 'golden-hour', label: 'Golden Hour (Warm 3200K)', hint: 'Soft warm low-angle sunset rays' },
    { id: 'blue-hour', label: 'Twilight / Blue Hour', hint: 'Deep indigo sky, cool ambient contrast' },
    { id: 'neon-noir', label: 'Cyberpunk Neon Glow', hint: 'Punchy magenta & teal rim lighting' },
    { id: 'foggy-morning', label: 'Ethereal Mist & Fog', hint: 'Diffused volumetric light with mystery' },
    { id: 'dramatic-studio', label: 'High-Contrast Chiaroscuro', hint: 'Dramatic shadows and bright key light' }
  ];

  const handleGenerateScene = async () => {
    setIsGenerating(true);
    setError(null);

    // Build the master prompt
    let lightingAddition = '';
    if (lightingPreset === 'golden-hour') {
      lightingAddition = ', illuminated by warm golden hour sunset lighting with long cinematic shadows';
    } else if (lightingPreset === 'blue-hour') {
      lightingAddition = ', illuminated during twilight blue hour with deep sapphire ambient tones';
    } else if (lightingPreset === 'neon-noir') {
      lightingAddition = ', lit with dramatic cyberpunk neon rim lights and high contrast color bleeding';
    } else if (lightingPreset === 'foggy-morning') {
      lightingAddition = ', enveloped in soft morning fog with diffused gentle atmospheric haze';
    } else if (lightingPreset === 'dramatic-studio') {
      lightingAddition = ', dramatic chiaroscuro high-contrast lighting with striking key light';
    }

    const subjectAddition = customSubject.trim() 
      ? `, featuring ${customSubject.trim()} seamlessly integrated as the focal point`
      : '';

    const fullPrompt = `${selectedScene.basePrompt}${subjectAddition}${lightingAddition}, style: ${artStyle}, 8k resolution, masterful composition, masterpiece.`;

    try {
      const dataUrl = await generateImageWithQuality(fullPrompt, 'Cinema 8K', aspectRatio as any);

      const newItem: GeneratedImageItem = {
        id: `scene_${Date.now()}`,
        url: dataUrl,
        prompt: `${selectedScene.title}${customSubject ? ' (' + customSubject + ')' : ''}`,
        style: artStyle,
        aspectRatio,
        createdAt: Date.now(),
        editType: 'imagine_scene',
        editNote: `Generated scene: ${selectedScene.title}`
      };

      setGeneratedImages(prev => [newItem, ...prev]);
      setActiveImageIndex(0);

      await saveStoredCreation(newItem);
      trackImageCreation();
      if (onSavedCreation) onSavedCreation(newItem);
    } catch (err: any) {
      console.error('Scene generation failed:', err);
      setError(err?.message || 'Failed to generate scene. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentPreview = generatedImages[activeImageIndex];

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Imagine: Scene Generator</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Curated Environments
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Select a cinematic scene, customize lighting, subjects, and let AI bring it to life</p>
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Scene Catalog & Customization */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  filterCategory === cat.id
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Scene Grid Cards */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Select Scene to Generate</span>
              <span className="text-[10px] text-zinc-400">{filteredScenes.length} Environments Available</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredScenes.map(scene => {
                const isSelected = selectedScene.id === scene.id;
                return (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedScene(scene)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-950/80 to-indigo-950/80 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50">
                          {scene.emoji}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                        {scene.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {scene.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="truncate">{scene.lightingHint}</span>
                      <span className="text-purple-400 font-medium">Select →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scene Customizer Panel */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Customize Scene: {selectedScene.title}</span>
            </div>

            {/* Custom Subject Addition */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>Add Focal Subject / Character</span>
                <span className="text-[10px] text-zinc-400 font-normal">Optional</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. A solitary astronaut exploring, a chrome motorcycle, a wandering red fox..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                {customSubject && (
                  <button 
                    onClick={() => setCustomSubject('')}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Lighting Control */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Environment Lighting</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {lightingOptions.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setLightingPreset(l.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      lightingPreset === l.id
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{l.label}</div>
                    <div className="text-[9px] text-zinc-400 truncate">{l.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio & Art Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Aspect Ratio</label>
                <div className="flex gap-2">
                  {[
                    { id: '16:9', label: '16:9 Cinematic' },
                    { id: '1:1', label: '1:1 Square' },
                    { id: '9:16', label: '9:16 Mobile' },
                    { id: '21:9', label: '21:9 Ultrawide' }
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatio(r.id)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        aspectRatio === r.id
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {r.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Aesthetic Style</label>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="Cinematic Photorealism">Cinematic Photorealism (Hasselblad / 8K)</option>
                  <option value="Anime Makoto Shinkai">Anime Shinkai Aesthetic (Vibrant Sky)</option>
                  <option value="Cyberpunk Unreal Engine 5">Unreal Engine 5 Render</option>
                  <option value="Vintage 35mm Film">Vintage 35mm Analog Film Grain</option>
                  <option value="Classical Oil Painting">Classical Oil Masterpiece</option>
                  <option value="Studio Product Lighting">Studio Minimalist Clean</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-200">
                {error}
              </div>
            )}

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateScene}
              disabled={isGenerating}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Rendering {selectedScene.title} in 8K...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Imagine: Generate Scene ({selectedScene.title})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output Gallery & Preview */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border-color)] bg-[var(--card-bg)] p-5 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Generated Scenes</h3>
            <span className="text-xs text-zinc-400">{generatedImages.length} Saved</span>
          </div>

          {currentPreview ? (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Main Preview Container */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl group">
                <img
                  src={currentPreview.url}
                  alt={currentPreview.prompt}
                  className="w-full h-auto max-h-[420px] object-contain mx-auto"
                />
                <div className="p-3 bg-zinc-900/90 border-t border-zinc-800">
                  <p className="text-xs font-bold text-white truncate">{currentPreview.prompt}</p>
                  <p className="text-[10px] text-zinc-400">{currentPreview.style} • {currentPreview.aspectRatio}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (onSendToChat) {
                      onSendToChat(currentPreview.url, `Generated scene: ${currentPreview.prompt}`);
                      if (onClose) onClose();
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <span>Chat with Scene</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <a
                  href={currentPreview.url}
                  download={`scene_${Date.now()}.png`}
                  className="py-2.5 px-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>

              {/* Quick Actions to Edit or Extend */}
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Next Tool Actions</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      if (onSelectForEdit) onSelectForEdit(currentPreview);
                    }}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-center"
                  >
                    🪄 Remove Objects
                  </button>
                  <button
                    onClick={() => {
                      if (onSelectForEdit) onSelectForEdit(currentPreview);
                    }}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-center"
                  >
                    ↔️ Extend Canvas
                  </button>
                </div>
              </div>

              {/* Thumbnail Strip */}
              {generatedImages.length > 1 && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold">Recent Takes</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {generatedImages.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                          activeImageIndex === idx ? 'border-purple-500 scale-105' : 'border-zinc-800 opacity-60'
                        }`}
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-400 space-y-2">
              <Compass className="w-10 h-10 stroke-1 text-purple-400" />
              <h4 className="text-xs font-bold text-zinc-300">No Scenes Generated Yet</h4>
              <p className="text-[11px] max-w-xs text-zinc-400">
                Choose an environment from the catalog on the left and tap Imagine Scene to render.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
