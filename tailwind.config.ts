import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#080b14',
        surface: '#0d1117',
        'surface-2': '#161b22',
        'surface-3': '#1c2333',
        border: '#30363d',
        'border-bright': '#484f58',
        primary: '#7c3aed',
        'primary-light': '#a855f7',
        'primary-dark': '#5b21b6',
        accent: '#e879f9',
        gold: '#f59e0b',
        'gold-light': '#fcd34d',
        danger: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
        info: '#3b82f6',
        vampire: '#dc2626',
        'vampire-dark': '#991b1b',
        night: '#0a0e1a',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cinzel)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        'night-sky': 'linear-gradient(to bottom, #020408 0%, #0a0e1a 40%, #111827 100%)',
        'vampire-glow': 'radial-gradient(ellipse at center, rgba(220,38,38,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.1)',
        'glow-red': '0 0 20px rgba(220,38,38,0.4), 0 0 60px rgba(220,38,38,0.1)',
        'glow-gold': '0 0 20px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.1)',
        'glow-accent': '0 0 20px rgba(232,121,249,0.4), 0 0 60px rgba(232,121,249,0.1)',
        'glass': '0 8px 32px rgba(0,0,0,0.37), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card': '0 4px 24px rgba(0,0,0,0.5)',
        'inner-glow': 'inset 0 0 30px rgba(124,58,237,0.1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'blood-drip': 'bloodDrip 3s ease-in-out infinite',
        'flicker': 'flicker 4s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        bloodDrip: {
          '0%, 100%': { transform: 'scaleY(1)', opacity: '1' },
          '50%': { transform: 'scaleY(1.1)', opacity: '0.8' },
        },
        flicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%': { opacity: '0.4' },
          '97%': { opacity: '1' },
          '98%': { opacity: '0.2' },
          '99%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
