import React, { useState, useEffect, createContext, useContext } from 'react';
import * as LucideIcons from 'lucide-react';
import { getIconPackState, saveIconPackState, setIconOverride, removeIconOverride, PRESET_ICON_PACKS } from '../services/iconPackService';
import { GOOGLE_APP_ICONS } from './GoogleAppIcons';

interface IconPackContextType {
  activePackId: string;
  customOverrides: Record<string, string>;
  setActivePackId: (id: string) => void;
  setOverride: (iconId: string, url: string) => void;
  removeOverride: (iconId: string) => void;
}

export const IconPackContext = createContext<IconPackContextType>({
  activePackId: 'lucide-default',
  customOverrides: {},
  setActivePackId: () => {},
  setOverride: () => {},
  removeOverride: () => {}
});

export const IconPackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState(getIconPackState());

  useEffect(() => {
    const handleUpdate = () => {
      setState(getIconPackState());
    };
    window.addEventListener('iconpack-updated', handleUpdate);
    return () => window.removeEventListener('iconpack-updated', handleUpdate);
  }, []);

  const setActivePackId = (id: string) => {
    saveIconPackState({ ...state, activePackId: id });
  };

  const setOverride = (iconId: string, url: string) => {
    setIconOverride(iconId, url);
  };

  const removeOverride = (iconId: string) => {
    removeIconOverride(iconId);
  };

  return (
    <IconPackContext.Provider
      value={{
        activePackId: state.activePackId,
        customOverrides: state.customOverrides,
        setActivePackId,
        setOverride,
        removeOverride
      }}
    >
      {children}
    </IconPackContext.Provider>
  );
};

export const useIconPack = () => useContext(IconPackContext);

export interface AppIconProps {
  name: string; // e.g. 'Bot', 'User', 'Send', 'HardDrive', 'Search', 'Settings', 'Sparkles', 'Plus', 'Camera', 'Mic', etc.
  fallback?: React.ComponentType<any>;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

const ALIAS_MAP: Record<string, string[]> = {
  Trash2: ['Trash', 'Trash2'],
  Trash: ['Trash', 'Trash2'],
  Share2: ['Share', 'Share2'],
  Share: ['Share', 'Share2'],
  ImageIcon: ['Image', 'ImageIcon'],
  Image: ['Image', 'ImageIcon'],
  HardDrive: ['HardDrive', 'Drive'],
  Drive: ['HardDrive', 'Drive'],
  BrainCircuit: ['BrainCircuit', 'Council'],
  Council: ['BrainCircuit', 'Council'],
  Globe: ['Globe', 'Research'],
  Research: ['Globe', 'Research'],
  Glasses: ['Glasses', 'Study'],
  Study: ['Glasses', 'Study'],
  PlusCircle: ['Plus', 'PlusCircle'],
  Edit2: ['Edit2', 'Rename', 'Pencil']
};

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  fallback: Fallback,
  className = '',
  size,
  style,
  onClick,
  title
}) => {
  const [packState, setPackState] = useState(getIconPackState());

  useEffect(() => {
    const handleUpdate = () => {
      setPackState(getIconPackState());
    };
    window.addEventListener('iconpack-updated', handleUpdate);
    return () => window.removeEventListener('iconpack-updated', handleUpdate);
  }, []);

  const activePack = PRESET_ICON_PACKS.find(p => p.id === packState.activePackId) || PRESET_ICON_PACKS[0];

  // Resolve custom image or preset override checking aliases
  const possibleKeys = ALIAS_MAP[name] || [name];
  let imageUrl: string | undefined;

  for (const key of possibleKeys) {
    if (packState.customOverrides[key]) {
      imageUrl = packState.customOverrides[key];
      break;
    }
    if (activePack.overrides[key]) {
      imageUrl = activePack.overrides[key];
      break;
    }
  }

  if (imageUrl) {
    const dimensionStyle = size ? { width: `${size}px`, height: `${size}px` } : {};
    return (
      <img
        src={imageUrl}
        alt={name}
        title={title || name}
        onClick={onClick}
        className={`inline-block object-contain rounded transition-all ${className}`}
        style={{ ...dimensionStyle, ...style }}
      />
    );
  }

  // Check if matching official Google workspace icon exists
  const googleKey = name.toLowerCase().replace(/^google/, '');
  const GoogleComponent = GOOGLE_APP_ICONS[name.toLowerCase()] || GOOGLE_APP_ICONS[googleKey];
  if (GoogleComponent) {
    return (
      <GoogleComponent
        className={className}
        size={size}
        style={style}
      />
    );
  }

  // Find matching Lucide icon
  const LucideComponent = Fallback || (LucideIcons as any)[name] || LucideIcons.HelpCircle;

  // Apply icon pack CSS filters if configured (e.g. Neon glow, 3D shadow, pixel, gold luxe)
  const filterStyle = activePack.cssFilter ? { filter: activePack.cssFilter, ...style } : style;
  const dimensionProps = size ? { size } : {};

  return (
    <LucideComponent
      className={className}
      style={filterStyle}
      onClick={onClick}
      title={title}
      {...dimensionProps}
    />
  );
};
