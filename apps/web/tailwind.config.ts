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
        // LuckyRay design system
        surface: {
          DEFAULT: 'hsl(220 13% 9%)',
          elevated: 'hsl(220 13% 11%)',
          overlay: 'hsl(220 13% 14%)',
          border: 'hsl(220 13% 18%)',
        },
        content: {
          DEFAULT: 'hsl(220 15% 92%)',
          muted: 'hsl(220 10% 55%)',
          subtle: 'hsl(220 10% 40%)',
        },
        accent: {
          DEFAULT: 'hsl(258 84% 70%)',
          muted: 'hsl(258 40% 30%)',
          subtle: 'hsl(258 20% 15%)',
        },
        gold: {
          DEFAULT: 'hsl(43 80% 60%)',
          muted: 'hsl(43 40% 30%)',
          subtle: 'hsl(43 20% 12%)',
        },
        success: 'hsl(142 71% 45%)',
        warning: 'hsl(38 92% 50%)',
        error: 'hsl(0 72% 51%)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-devanagari)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgb(0 0 0 / 0.3)',
        card: '0 4px 12px 0 rgb(0 0 0 / 0.4)',
        dialog: '0 20px 60px 0 rgb(0 0 0 / 0.6)',
        glow: '0 0 20px 0 hsl(258 84% 70% / 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'stream': 'stream 0.5s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        stream: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
      },
    },
  },
  plugins: [],
};

export default config;
