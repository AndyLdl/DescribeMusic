/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0D0C1D',
        primary: {
          DEFAULT: '#8B5CF6', // Vibrant Purple
          '500': '#8B5CF6',
          '600': '#7C3AED',
        },
        accent: {
          DEFAULT: '#38BDF8', // Electric Blue
          '400': '#38BDF8',
          '500': '#0EA5E9',
        },
      },
      animation: {
        'subtle-gradient': 'subtle-gradient 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-flow': 'gradient-flow 3s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'subtle-gradient': {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' },
        },
        'float': {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
          '100%': { transform: 'translateY(0px)' },
        },
        'gradient-flow': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'glow': {
          '0%': { 'box-shadow': '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)' },
          '100%': { 'box-shadow': '0 0 30px rgba(139, 92, 246, 0.8), 0 0 60px rgba(139, 92, 246, 0.5)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
