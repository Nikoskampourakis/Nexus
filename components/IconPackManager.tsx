import React, { useState, useRef } from 'react';
import { 
  APP_ICON_CATALOG, 
  PRESET_ICON_PACKS, 
  getIconPackState, 
  saveIconPackState, 
  setIconOverride, 
  removeIconOverride, 
  resetAllIconOverrides,
  exportIconPackAsJson,
  importIconPackFromJson,
  AppIconCatalogItem
} from '../services/iconPackService';
import { AppIcon } from './AppIcon';
import { 
  Sparkles, 
  Upload, 
  RotateCcw, 
  Download, 
  Check, 
  Image as ImageIcon, 
  Layers, 
  Search, 
  Palette, 
  FileUp, 
  X, 
  Sliders, 
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';

const STOCK_PRESET_IMAGES = [
  { name: 'Robot Avatar 1', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80' },
  { name: 'Sparkles Glow 1', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=120&auto=format&fit=crop&q=80' },
  { name: '3D Rocket Send', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=120&auto=format&fit=crop&q=80' },
  { name: 'Abstract Cyber Sphere', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80' },
  { name: 'Neon Glass Orb', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=120&auto=format&fit=crop&q=80' }
];

export const IconPackManager: React.FC = () => {
  const [packState, setPackState] = useState(getIconPackState());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [notification, setNotification] = useState<string | null>(null);
  
  // Modals & Panels State
  const [selectedIconItem, setSelectedIconItem] = useState<AppIconCatalogItem | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [showPreSelectedModal, setShowPreSelectedModal] = useState<boolean>(false);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectPack = (packId: string) => {
    const newState = { ...packState, activePackId: packId };
    setPackState(newState);
    saveIconPackState(newState);
    showToast(`Applied "${PRESET_ICON_PACKS.find(p => p.id === packId)?.name}" icon pack!`);
  };

  const handleFileUploadForIcon = (e: React.ChangeEvent<HTMLInputElement>, iconId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image file size must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setIconOverride(iconId, base64);
        setPackState(getIconPackState());
        showToast(`Replaced icon "${iconId}" with uploaded image!`);
        setSelectedIconItem(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmitForIcon = (iconId: string) => {
    const url = customUrlInput.trim();
    if (url) {
      setIconOverride(iconId, url);
      setPackState(getIconPackState());
      setCustomUrlInput('');
      showToast(`Updated icon "${iconId}" with custom image URL!`);
      setSelectedIconItem(null);
    }
  };

  const handleSelectStockImageForIcon = (iconId: string, url: string) => {
    setIconOverride(iconId, url);
    setPackState(getIconPackState());
    showToast(`Set preset image for icon "${iconId}"!`);
    setSelectedIconItem(null);
  };

  const handleResetSingleIcon = (iconId: string) => {
    removeIconOverride(iconId);
    setPackState(getIconPackState());
    showToast(`Reset "${iconId}" icon to default.`);
    setSelectedIconItem(null);
  };

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all custom icon overrides back to default?')) {
      resetAllIconOverrides();
      setPackState(getIconPackState());
      showToast('All icon overrides have been reset to default.');
    }
  };

  const handleExportJson = () => {
    exportIconPackAsJson();
    showToast('Exported icon pack JSON configuration!');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        const success = importIconPackFromJson(content);
        if (success) {
          setPackState(getIconPackState());
          showToast('Successfully imported and applied custom icon pack!');
        } else {
          showToast('Failed to parse icon pack JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const categories = ['All', 'Identity', 'Action', 'AI Tools', 'Navigation', 'Media & Inputs', 'Developer'];

  // Reverse Search & Category Filtering
  const filteredCatalog = APP_ICON_CATALOG.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesId = item.id.toLowerCase().includes(q);
    const matchesLabel = item.label.toLowerCase().includes(q);
    const matchesDesc = item.description.toLowerCase().includes(q);
    const matchesAliases = item.aliases ? item.aliases.some(a => a.toLowerCase().includes(q)) : false;
    const isOverriddenWithUrl = packState.customOverrides[item.id] && packState.customOverrides[item.id].toLowerCase().includes(q);

    return matchesCategory && (matchesId || matchesLabel || matchesDesc || matchesAliases || isOverriddenWithUrl);
  });

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-cyan-400 text-black px-4 py-2 rounded-2xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Action Toolbar Header */}
      <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Icon Pack & Custom Image Replacement</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  Site-Wide
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Every icon in this application can be replaced with custom uploaded images or URLs.
              </p>
            </div>
          </div>

          {/* Action Buttons: Reverse Search, Export, Import, Pre-Selected, Reset */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setShowPreSelectedModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Use Pre-Selected</span>
            </button>

            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-[var(--background)] hover:bg-[var(--sidebar-bg)] text-[var(--text-primary)] rounded-xl text-xs font-semibold border border-[var(--border-color)] flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export</span>
            </button>

            <label className="px-3 py-1.5 bg-[var(--background)] hover:bg-[var(--sidebar-bg)] text-[var(--text-primary)] rounded-xl text-xs font-semibold border border-[var(--border-color)] flex items-center space-x-1.5 cursor-pointer transition-all">
              <FileUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import</span>
              <input
                ref={jsonImportRef}
                type="file"
                accept=".json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
            </label>

            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/30 flex items-center space-x-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          </div>
        </div>

        {/* Reverse Search Input Bar & Category Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Reverse Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Reverse search icons by name, action (e.g. 'send', 'drive', 'bot'), or image URL..."
              className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl pl-9 pr-8 py-2 text-xs text-[var(--text-primary)] focus:border-purple-500 outline-none transition-all placeholder-[var(--text-secondary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto custom-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white font-semibold shadow'
                    : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Icon Image Boxes Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            App Icon Catalog ({filteredCatalog.length} icons) — Click any box to put custom image
          </span>
          <span className="text-[11px] text-purple-400 font-mono">
            Active Overrides: {Object.keys(packState.customOverrides).length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredCatalog.map((iconItem) => {
            const hasCustomImage = !!packState.customOverrides[iconItem.id];

            return (
              <div
                key={iconItem.id}
                onClick={() => setSelectedIconItem(iconItem)}
                className={`group p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 relative overflow-hidden ${
                  hasCustomImage
                    ? 'bg-purple-950/30 border-purple-500/70 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/50'
                    : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-purple-500/50 hover:bg-[var(--sidebar-bg)]'
                }`}
              >
                {/* Custom Image Badge */}
                {hasCustomImage && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow">
                    Image Set
                  </div>
                )}

                {/* Main Box Image Preview */}
                <div className="w-full aspect-square rounded-xl bg-[var(--background)] border border-[var(--border-color)] flex flex-col items-center justify-center p-2 relative group-hover:border-purple-400/50 transition-colors">
                  <AppIcon name={iconItem.id} className="w-10 h-10 object-contain transition-transform group-hover:scale-110" />
                </div>

                {/* Icon Info */}
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white truncate flex items-center justify-between">
                    <span>{iconItem.id}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    {iconItem.label}
                  </p>
                </div>

                {/* Click Instruction Hover Footer */}
                <div className="pt-1.5 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-medium text-purple-400 opacity-80 group-hover:opacity-100">
                  <span>{hasCustomImage ? 'Edit Image' : '+ Put Image'}</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Image Upload/Replacement Modal for Clicked Box */}
      {selectedIconItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <AppIcon name={selectedIconItem.id} className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Set Custom Image for "{selectedIconItem.id}"
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {selectedIconItem.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIconItem(null)}
                className="text-[var(--text-secondary)] hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Preview */}
            <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-black/40 border border-[var(--border-color)] flex items-center justify-center">
                  <AppIcon name={selectedIconItem.id} className="w-8 h-8 object-contain" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-white">Current Rendering</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {packState.customOverrides[selectedIconItem.id] ? 'Custom Uploaded Image' : 'Default Vector Icon'}
                  </div>
                </div>
              </div>

              {packState.customOverrides[selectedIconItem.id] && (
                <button
                  onClick={() => handleResetSingleIcon(selectedIconItem.id)}
                  className="px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Option 1: File Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                1. Upload Local Image File (PNG, JPG, SVG, WebP)
              </label>
              <label className="w-full py-3 px-4 rounded-xl bg-[var(--background)] hover:bg-purple-950/40 border border-dashed border-purple-500/50 text-xs font-semibold text-purple-300 flex items-center justify-center space-x-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Choose File / Drag & Drop</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUploadForIcon(e, selectedIconItem.id)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Option 2: Image URL */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                2. Paste Direct Image URL
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://example.com/icon.png"
                  className="flex-1 bg-[var(--background)] border border-[var(--border-color)] text-xs text-white px-3 py-2 rounded-xl focus:border-purple-400 outline-none"
                />
                <button
                  onClick={() => handleUrlSubmitForIcon(selectedIconItem.id)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Save URL
                </button>
              </div>
            </div>

            {/* Option 3: Stock Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                3. Choose from Curated Stock Sample Images
              </label>
              <div className="grid grid-cols-5 gap-2">
                {STOCK_PRESET_IMAGES.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectStockImageForIcon(selectedIconItem.id, img.url)}
                    className="w-full aspect-square rounded-xl bg-black/40 border border-[var(--border-color)] hover:border-purple-400 p-1 transition-all overflow-hidden"
                    title={img.name}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-contain rounded-lg" />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-[var(--border-color)] flex justify-end">
              <button
                onClick={() => setSelectedIconItem(null)}
                className="px-4 py-1.5 text-xs text-[var(--text-secondary)] hover:text-white"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* "Use Pre-Selected" Icon Packs Modal */}
      {showPreSelectedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-2xl rounded-2xl p-6 space-y-5 shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <span>Pre-Selected Theme Icon Sets</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Apply curated global icon filters, 3D glazes, neon glows, and pixel styles with 1-click.
                </p>
              </div>
              <button
                onClick={() => setShowPreSelectedModal(false)}
                className="text-[var(--text-secondary)] hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRESET_ICON_PACKS.map((pack) => {
                const isActive = packState.activePackId === pack.id;

                return (
                  <div
                    key={pack.id}
                    onClick={() => {
                      handleSelectPack(pack.id);
                      setShowPreSelectedModal(false);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      isActive
                        ? 'bg-purple-950/40 border-purple-400 shadow-lg shadow-purple-950/50 ring-1 ring-purple-400/50'
                        : 'bg-[var(--background)] border-[var(--border-color)] hover:border-purple-500/50 hover:bg-[var(--sidebar-bg)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white">{pack.name}</span>
                        {isActive && (
                          <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                        {pack.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        {pack.previewIcons.map((prev, idx) => (
                          <div
                            key={idx}
                            className="w-7 h-7 rounded-lg bg-black/40 border border-[var(--border-color)] flex items-center justify-center text-xs"
                          >
                            {prev.url ? (
                              <img src={prev.url} alt={prev.iconId} className="w-4 h-4 object-contain" />
                            ) : prev.emoji ? (
                              <span>{prev.emoji}</span>
                            ) : (
                              <AppIcon name={prev.iconId} className="w-3.5 h-3.5 text-purple-400" />
                            )}
                          </div>
                        ))}
                      </div>

                      <span className="text-xs font-semibold text-purple-400">
                        {isActive ? 'Applied' : 'Apply Pack →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[var(--border-color)] flex justify-end">
              <button
                onClick={() => setShowPreSelectedModal(false)}
                className="px-4 py-2 bg-[var(--background)] border border-[var(--border-color)] text-xs text-white rounded-xl"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
