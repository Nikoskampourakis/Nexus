import React from 'react';

export interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

// 1. Official Google "G" 4-color Logo (Transparent background)
export const GoogleLogo: React.FC<IconProps> = ({ className = 'w-5 h-5', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// 2. Official Gmail Icon (4-color envelope 'M' with 100% transparent background)
export const GmailIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Left blue vertical pillar */}
    <path fill="#4285F4" d="M3 19.5V6.75L6.8 9.75V19.5H3z" />
    {/* Right green vertical pillar */}
    <path fill="#34A853" d="M21 19.5V6.75L17.2 9.75V19.5H21z" />
    {/* Red envelope top chevron flap */}
    <path fill="#EA4335" d="M3 6.75C3 5.23 4.23 4 5.75 4H7.5V9.75L3 6.75z" />
    {/* Yellow top right flap tab */}
    <path fill="#FBBC05" d="M16.5 9.75V4H18.25C19.77 4 21 5.23 21 6.75L16.5 9.75z" />
    {/* Red center chevron fold */}
    <path fill="#EA4335" d="M3 6.75L12 13.88L21 6.75L17.2 9.75L12 13.88L6.8 9.75L3 6.75z" />
    {/* Subtle depth crease on center fold */}
    <path fill="#C5221F" opacity="0.25" d="M6.8 9.75L12 13.88L17.2 9.75V19.5H6.8V9.75z" />
    <path fill="#EA4335" d="M6.8 9.75L12 13.88L17.2 9.75L12 5.5L6.8 9.75z" />
  </svg>
);

// 3. Official Google Drive Icon (Triangular ribbon with 100% transparent background)
export const GoogleDriveIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Yellow top-right bar */}
    <path fill="#FFBA00" d="M8.02 3L15.98 3L22.98 15L15.02 15z" />
    {/* Blue bottom bar */}
    <path fill="#2684FC" d="M4.02 21L12.02 21L19.98 9L11.98 9z" />
    {/* Green left bar */}
    <path fill="#00AC47" d="M1.02 15L5.02 21L12.98 9L8.98 3z" />
    {/* Corner shadow overlaps for authentic Google depth */}
    <path fill="#00832D" opacity="0.25" d="M8.98 3L8.02 3L1.02 15L5.02 15z" />
    <path fill="#EA4335" opacity="0.18" d="M19.98 9L15.02 15L11.98 9z" />
  </svg>
);

// 4. Official Google Sheets Icon (Green folded spreadsheet with 100% transparent background)
export const GoogleSheetsIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Green Document Body */}
    <path fill="#0F9D58" d="M14.5 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7.5L14.5 2z" />
    {/* Corner Fold */}
    <path fill="#57BB8A" d="M14.5 2V7.5H20L14.5 2z" />
    {/* Fold Crease Shadow */}
    <path fill="#0B8043" opacity="0.28" d="M14.5 7.5L20 13H14.5V7.5z" />
    {/* Translucent Grid / Spreadsheet cells */}
    <rect x="7.5" y="11" width="9" height="6.5" rx="0.5" fill="#FFFFFF" fillOpacity="0.22" />
    <path fill="#FFFFFF" d="M7.5 13.5h9v1h-9zm0 2h9v1h-9zm3.5-4.5v6.5h-1V11h1z" />
    <rect x="7.5" y="11" width="9" height="6.5" rx="0.5" stroke="#FFFFFF" strokeWidth="0.8" />
  </svg>
);

// 5. Official Google Docs Icon (Blue folded document with 100% transparent background)
export const GoogleDocsIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Blue Document Body */}
    <path fill="#4285F4" d="M14.5 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7.5L14.5 2z" />
    {/* Corner Fold */}
    <path fill="#A1C2FA" d="M14.5 2V7.5H20L14.5 2z" />
    {/* Fold Crease Shadow */}
    <path fill="#1A73E8" opacity="0.28" d="M14.5 7.5L20 13H14.5V7.5z" />
    {/* Document Text Lines */}
    <rect x="7.5" y="11" width="9" height="1.2" rx="0.6" fill="#FFFFFF" />
    <rect x="7.5" y="13.5" width="9" height="1.2" rx="0.6" fill="#FFFFFF" />
    <rect x="7.5" y="16" width="6" height="1.2" rx="0.6" fill="#FFFFFF" />
  </svg>
);

// 6. Official Google Calendar Icon (4-color frame & "31" with 100% transparent background)
export const GoogleCalendarIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Blue Left/Top Frame */}
    <path fill="#4285F4" d="M19 4H7C5.34 4 4 5.34 4 7v10c0 1.66 1.34 3 3 3h12c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1z" />
    {/* 100% Transparent Calendar Inner Body */}
    <rect x="5.5" y="7" width="13" height="11.5" rx="1.5" fill="#FFFFFF" fillOpacity="0.1" />
    {/* Red Top-Right Corner */}
    <path fill="#EA4335" d="M19 4h-3.5v4h4.5V5c0-.55-.45-1-1-1z" />
    {/* Green Bottom-Right Corner */}
    <path fill="#34A853" d="M19 20c.55 0 1-.45 1-1v-4h-4.5V20H19z" />
    {/* Yellow Right Edge */}
    <path fill="#FBBC05" d="M20 8h-4.5v8H20V8z" />
    {/* Hanging Top Tabs */}
    <rect x="7.5" y="2" width="2" height="3" rx="1" fill="#4285F4" />
    <rect x="14.5" y="2" width="2" height="3" rx="1" fill="#4285F4" />
    {/* Date "31" in Google Blue */}
    <text 
      x="12" 
      y="15.5" 
      textAnchor="middle" 
      fill="#FFFFFF" 
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
      fontSize="7.8" 
      fontWeight="700"
    >
      31
    </text>
  </svg>
);

// 7. Official Google Tasks Icon (Blue ring checkmark with 100% transparent background)
export const GoogleTasksIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Circular outer track */}
    <circle cx="12" cy="12" r="8.5" stroke="#4285F4" strokeWidth="2.5" />
    {/* Blue Bold Checkmark */}
    <path 
      d="M7.8 12.2l2.8 2.8 5.6-6" 
      stroke="#1A73E8" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Yellow Google accent dot */}
    <circle cx="16.5" cy="7.5" r="1.8" fill="#FBBC05" />
  </svg>
);

// 8. Official Google Slides Icon (Amber presentation document with 100% transparent background)
export const GoogleSlidesIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Amber Document Body */}
    <path fill="#F4B400" d="M14.5 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7.5L14.5 2z" />
    {/* Corner Fold */}
    <path fill="#FBE7A2" d="M14.5 2V7.5H20L14.5 2z" />
    {/* Fold Crease Shadow */}
    <path fill="#D89E00" opacity="0.25" d="M14.5 7.5L20 13H14.5V7.5z" />
    {/* Slide Canvas Rectangle (Transparent with crisp border) */}
    <rect x="7" y="11" width="10" height="7" rx="0.8" fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeWidth="0.8" />
    <rect x="8.5" y="12.5" width="7" height="4" rx="0.4" fill="#F4B400" fillOpacity="0.6" />
  </svg>
);

// 9. Official Google Meet Icon (4-color video camera with 100% transparent background)
export const GoogleMeetIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="3" y="6" width="11" height="12" rx="2" fill="#00832D" />
    <path fill="#00AC47" d="M3 8c0-1.1.9-2 2-2h9v12H5c-1.1 0-2-.9-2-2V8z" />
    <path fill="#2684FC" d="M14 6h-3v12h3V6z" />
    <path fill="#FFBA00" d="M19.5 8.5L14 12.5v-1l5.5-4z" />
    <path fill="#EA4335" d="M19.5 15.5L14 11.5v1l5.5 4c.6.4 1.5 0 1.5-.7v-5.6c0-.7-.9-1.1-1.5-.7z" />
  </svg>
);

// 10. Official Google Workspace Logo (Interlocking multi-color loop with transparent background)
export const GoogleWorkspaceIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    style={size ? { width: size, height: size, ...style } : style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fill="#4285F4" d="M5.5 7.5a3.5 3.5 0 1 1 7 0v2h-7v-2z" />
    <path fill="#34A853" d="M18.5 7.5a3.5 3.5 0 1 0-7 0v2h7v-2z" />
    <path fill="#FBBC05" d="M5.5 16.5a3.5 3.5 0 0 0 7 0v-2h-7v2z" />
    <path fill="#EA4335" d="M18.5 16.5a3.5 3.5 0 0 1-7 0v-2h7v2z" />
  </svg>
);

// Comprehensive map of official icons by key and aliases
export const GOOGLE_APP_ICONS: Record<string, React.FC<IconProps>> = {
  gmail: GmailIcon,
  googlemail: GmailIcon,
  mail: GmailIcon,
  inbox: GmailIcon,
  drive: GoogleDriveIcon,
  googledrive: GoogleDriveIcon,
  gdrive: GoogleDriveIcon,
  sheets: GoogleSheetsIcon,
  googlesheets: GoogleSheetsIcon,
  spreadsheet: GoogleSheetsIcon,
  docs: GoogleDocsIcon,
  googledocs: GoogleDocsIcon,
  document: GoogleDocsIcon,
  calendar: GoogleCalendarIcon,
  googlecalendar: GoogleCalendarIcon,
  tasks: GoogleTasksIcon,
  googletasks: GoogleTasksIcon,
  slides: GoogleSlidesIcon,
  googleslides: GoogleSlidesIcon,
  meet: GoogleMeetIcon,
  googlemeet: GoogleMeetIcon,
  workspace: GoogleWorkspaceIcon,
  googleworkspace: GoogleWorkspaceIcon,
  google: GoogleLogo,
  appstore: GoogleWorkspaceIcon,
  store: GoogleWorkspaceIcon
};
