/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3f2',
          100: '#fee5e2',
          200: '#fecfca',
          300: '#fdafa5',
          400: '#fa8171',
          500: '#f15b45',
          600: '#de3d26',
          700: '#bb301c',
          800: '#9a2b1b',
          900: '#80291d',
        },
      },
    },
  },
  plugins: [],
}
