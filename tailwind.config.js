/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        md: '2rem',
        lg: '2.5rem',
        xl: '3rem',
        '2xl': '4rem',
      },
    },
    screens: {
      'sm': '640px',   // Móviles grandes
      'md': '768px',   // Tablets
      'lg': '1024px',  // Laptops pequeñas
      'xl': '1280px',  // Laptops estándar
      '2xl': '1536px', // Pantallas grandes
      'laptop': '1366px', // Breakpoint específico para laptops comunes
    },
    extend: {
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      fontSize: {
        'xxs': '0.625rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },
  plugins: [],
};
