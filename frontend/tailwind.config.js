/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        savecus: {
          50: '#FDFBF2',   // Soft warm ivory highlight
          100: '#FBF4DC',  // Warm cream border / secondary background
          200: '#F7E6B2',  // Light amber card container
          300: '#F4D685',  // Subtle gold accent
          400: '#F2C85C',  // Vibrant gold hover state
          500: '#F1C04C',  // CORE SIGNATURE GOLDEN AMBER
          600: '#D6A535',  // Deep amber active/pressed state
          700: '#AC7E1F',  // Dark amber focus ring
          800: '#865F17',  // Rich warm bronze
          900: '#6F4C12',  // Deep bronze boundary
        },
        brand: {
          50: '#FDFBF2',
          100: '#FBF4DC',
          200: '#F7E6B2',
          300: '#F4D685',
          400: '#F2C85C',
          500: '#F1C04C',  // CORE SIGNATURE GOLDEN AMBER
          600: '#D6A535',
          700: '#AC7E1F',
          800: '#865F17',
          900: '#6F4C12',
        },
        charcoal: {
          50: '#2E2D28',
          100: '#25241F',
          200: '#1E1D19',
          300: '#181714',
          400: '#141310',
          500: '#121212',  // CORE SIGNATURE DEEP CHARCOAL
          600: '#0E0D0B',
          900: '#000000',
        },
        surface: {
          base: '#121212',
          card: '#1C1B17',
          elevated: '#24231E',
          border: '#36342D',
          borderStrong: '#524F44',
          borderFocus: '#F1C04C',
        },
      },
      fontSize: {
        'xs': ['13px', '18px'],
        'sm': ['15px', '22px'],
        'base': ['17px', '26px'],
        'lg': ['19px', '28px'],
        'xl': ['22px', '30px'],
        '2xl': ['26px', '34px'],
        '3xl': ['32px', '40px'],
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
