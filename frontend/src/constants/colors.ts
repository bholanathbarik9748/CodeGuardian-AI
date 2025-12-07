/**
 * Color constants used throughout the application
 * Extracted from the login page design for consistency
 */

export const colors = {
  // Primary gradient colors (background)
  gradient: {
    indigo: {
      900: '#312e81', // from-indigo-900
      500: '#6366f1', // from-indigo-500
    },
    purple: {
      900: '#581c87', // via-purple-900
      600: '#9333ea', // to-purple-600
      500: '#a855f7', // bg-purple-500
      200: '#e9d5ff', // to-purple-200
    },
    pink: {
      900: '#831843', // to-pink-900
      600: '#db2777', // to-pink-600
      500: '#ec4899', // bg-pink-500
    },
  },

  // Background colors
  background: {
    glass: 'rgba(255, 255, 255, 0.1)', // bg-white/10
    glassBorder: 'rgba(255, 255, 255, 0.2)', // border-white/20
  },

  // Text colors
  text: {
    white: '#ffffff',
    white90: 'rgba(255, 255, 255, 0.9)', // text-white/90
    white70: 'rgba(255, 255, 255, 0.7)', // text-white/70
    purple200: '#e9d5ff', // text-purple-200
    purple20070: 'rgba(233, 213, 255, 0.7)', // text-purple-200/70
  },

  // Button colors
  button: {
    github: {
      bg: '#111827', // bg-gray-900
      bgHover: '#1f2937', // hover:bg-gray-800
      bgGradientFrom: '#1f2937', // from-gray-800
      bgGradientTo: '#111827', // to-gray-900
      text: '#ffffff',
      shine: 'rgba(255, 255, 255, 0.1)', // via-white/10
    },
    logout: {
      from: '#ef4444', // from-red-500
      to: '#ec4899', // to-pink-600
      hoverFrom: '#dc2626', // hover:from-red-600
      hoverTo: '#db2777', // hover:to-pink-700
      text: '#ffffff',
    },
  },

  // Loading spinner colors
  loading: {
    border: '#e9d5ff', // border-purple-200
    borderActive: '#9333ea', // border-t-purple-600
    dot: '#9333ea', // bg-purple-600
  },

  // User card colors
  userCard: {
    from: 'rgba(34, 197, 94, 0.2)', // from-green-500/20
    to: 'rgba(16, 185, 129, 0.2)', // to-emerald-500/20
    border: 'rgba(74, 222, 128, 0.3)', // border-green-400/30
    avatar: {
      from: '#4ade80', // from-green-400
      to: '#10b981', // to-emerald-500
    },
    status: '#22c55e', // bg-green-500
  },

  // Icon/Logo colors
  icon: {
    lock: '#ffffff', // text-white (lock icon)
    github: '#ffffff', // GitHub icon fill
  },

  // Shadow colors
  shadow: {
    card: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // shadow-2xl
    button: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', // shadow-lg
  },

  // Animation particle colors
  particles: {
    purple: {
      bg: '#a855f7', // bg-purple-500
      opacity: 0.2, // opacity-20
    },
    pink: {
      bg: '#ec4899', // bg-pink-500
      opacity: 0.2, // opacity-20
    },
    indigo: {
      bg: '#6366f1', // bg-indigo-500
      opacity: 0.2, // opacity-20
    },
  },
} as const;

/**
 * Tailwind CSS class names for easy reference
 * Use these when you need the exact same styling
 */
export const tailwindClasses = {
  // Background gradients
  backgroundGradient:
    'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
  backgroundGradientAnimated:
    'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 bg-[length:200%_200%] animate-gradient',

  // Glass morphism card
  glassCard:
    'bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20',

  // Text styles
  headingGradient:
    'bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200',
  textPurple: 'text-purple-200',
  textPurpleMuted: 'text-purple-200/70',

  // Buttons
  githubButton:
    'bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95',
  logoutButton:
    'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95',

  // User card
  userCard:
    'bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl border border-green-400/30 shadow-lg',
  avatarGradient: 'bg-gradient-to-br from-green-400 to-emerald-500',

  // Animations
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  pulseSlow: 'animate-pulse-slow',
  gradient: 'animate-gradient',
} as const;

/**
 * RGB values for programmatic color manipulation
 */
export const rgbColors = {
  indigo900: { r: 49, g: 46, b: 129 },
  purple900: { r: 88, g: 28, b: 135 },
  pink900: { r: 131, g: 24, b: 67 },
  purple500: { r: 168, g: 85, b: 247 },
  pink500: { r: 236, g: 72, b: 153 },
  indigo500: { r: 99, g: 102, b: 241 },
} as const;

/**
 * Helper function to get color with opacity
 */
export const withOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba if needed
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

/**
 * Theme object for easy access
 */
export const theme = {
  colors,
  tailwindClasses,
  rgbColors,
  withOpacity,
} as const;

export default theme;

