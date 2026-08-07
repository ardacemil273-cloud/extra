/** @type {import('tailwindcss').Config} */
module.exports = {
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
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.5), 0 0 40px rgba(124, 58, 237, 0.2)',
        'glow-accent': '0 0 20px rgba(232, 121, 249, 0.5), 0 0 40px rgba(232, 121, 249, 0.2)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2)',
        'card': '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};