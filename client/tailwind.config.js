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
        nova: {
          dark: '#080D19',      // Primary Background
          card: '#111827',      // Secondary Background
          sidebar: '#0F172A',   // Sidebar Background
          primary: '#2563EB',   // Primary Accent (Royal/Electric Blue)
          accent: '#06B6D4',    // Secondary Accent (Cyan / Electric Cyan)
          success: '#22C55E',   // Success Green
          error: '#EF4444',     // Error Red
          text: '#F8FAFC',      // Main Text
          muted: '#94A3B8',     // Secondary Text
          border: '#1E293B',    // Subtle Borders
          hover: '#1E293B',     // Hover State
          chatBubbleMe: '#2563EB',
          chatBubbleThem: '#1E293B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}

