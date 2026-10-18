/** @type {import('tailwindcss').Config} */

// Limbo theme: strictly greyscale. Every chromatic Tailwind palette the components
// reference is remapped to this neutral scale, so no stray colour can appear.
const grey = {
  50: '#f4f4f4',
  100: '#e9e9e9',
  200: '#d6d6d6',
  300: '#bdbdbd',
  400: '#9a9a9a',
  500: '#767676',
  600: '#555555',
  700: '#3b3b3b',
  800: '#272727',
  850: '#1d1d1d',
  900: '#151515',
  950: '#0b0b0b',
};

// Former "gold" accent: brighter ramp so highlights still read as the strongest greys.
const accent = {
  300: '#f0f0f0',
  400: '#dcdcdc',
  500: '#b0b0b0',
  600: '#848484',
  700: '#4a4a4a',
};

const chromatic = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'crimson', 'amber', 'rose', 'emerald', 'purple', 'blue', 'cyan', 'sky',
  'yellow', 'red', 'teal', 'violet', 'indigo', 'orange', 'green', 'lime',
  'fuchsia', 'pink',
];

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(chromatic.map((name) => [name, grey])),
        gold: accent,
        obsidian: '#050505',
        void: '#0a0a0a',
        fog: '#8a8a8a',
        malice: '#3b3b3b',
      },
      boxShadow: {
        'gold-glow': '0 0 30px -8px rgba(255, 255, 255, 0.10)',
        'crimson-glow': '0 0 30px -8px rgba(255, 255, 255, 0.14)',
        'gothic-card': '0 4px 24px -2px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        display: ['"Josefin Sans"', 'Jost', 'system-ui', 'sans-serif'],
        sans: ['Jost', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Courier Prime"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1.1rem' }],
        'xs': ['0.84rem', { lineHeight: '1.25rem' }],
        'sm': ['0.94rem', { lineHeight: '1.45rem' }],
        'base': ['1.05rem', { lineHeight: '1.65rem' }],
        'lg': ['1.22rem', { lineHeight: '1.75rem' }],
        'xl': ['1.42rem', { lineHeight: '1.9rem' }],
        '2xl': ['1.75rem', { lineHeight: '2.25rem' }],
        '3xl': ['2.15rem', { lineHeight: '2.5rem' }],
        '4xl': ['2.65rem', { lineHeight: '3rem' }],
        '5xl': ['3.25rem', { lineHeight: '3.6rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
      },
    },
  },
  plugins: [],
};
