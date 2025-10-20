import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0049ac',
        accent: '#0f172a',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 2px 8px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        soft: '12px',
      },
    },
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        lg: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
