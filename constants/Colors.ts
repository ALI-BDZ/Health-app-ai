export const Colors = {
  light: {
    text: '#1e293b',
    background: '#f1f5f9',
    tint: '#3b82f6',
    icon: '#64748b',
    tabIconDefault: '#64748b',
    tabIconSelected: '#3b82f6',
  },
  dark: {
    text: '#f8fafc',
    background: '#0f172a',
    tint: '#60a5fa',
    icon: '#94a3b8',
    tabIconDefault: '#94a3b8',
    tabIconSelected: '#60a5fa',
  },
  // Blue palette
  primaryDark: '#1e40af',
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  
  // Status colors
  success: '#4CAF50',
  successLight: '#d4edda', // Added: Lighter green for calendar background
  warning: '#ffc107',       // Added: Standard yellow/orange for 'some forgotten' text
  warningLight: '#fff3cd',  // Added: Lighter yellow for calendar background
  error: '#ff6b6b',
  errorLight: '#f8d7da',    // Added: Lighter red for calendar background
  
  // Backgrounds
  background: '#f1f5f9',
  cardBackground: '#ffffff',
  lightGrey: '#e0e7ff', // Added: For inactive/disabled chips or general light elements
  
  // Text
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textMuted: '#64748b',
  
  // Utility
  white: '#ffffff',
  black: '#000000',
  borderLight: 'rgba(0, 0, 0, 0.05)',
  
  // Icon colors
  iconActive: '#ffffff',
  iconInactive: '#64748b'
};

export type ColorScheme = {
  primaryDark: string;
  primary: string;
  primaryLight: string;
  success: string;
  successLight: string; // Added
  warning: string;      // Added
  warningLight: string; // Added
  error: string;
  errorLight: string;   // Added
  background: string;
  cardBackground: string;
  lightGrey: string;    // Added
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  white: string;
  black: string;
  borderLight: string;
  iconActive: string;
  iconInactive: string;
};

// Removed the redundant and incorrect `Ionicons` type.
// It was not a color scheme definition and could cause confusion.