import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        violet: { DEFAULT: '#6C5CE7', deep: '#5A4AD8', soft: '#EDEAFE' },
        ink: { DEFAULT: '#1B1B3A', soft: '#63637F' },
        muted: '#9A9AB4',
        page: '#E8E8F6',
        surface: '#FFFFFF',
        tint: '#F6F6FC',
        mint: { DEFAULT: '#D3F3E3', ink: '#0F7A52' },
        pink: { DEFAULT: '#FFDCE6', ink: '#CE2F66' },
        amber: { DEFAULT: '#FFEBD2', ink: '#AE6100' },
        sky: { DEFAULT: '#DCEBFE', ink: '#1D63C0' },
        navy: '#1B1B3A',
      },
      borderRadius: {
        shell: '30px',
        card: '22px',
        ctl: '14px',
      },
      boxShadow: {
        card: '0 2px 6px rgba(27,27,58,.03), 0 12px 30px rgba(27,27,58,.055)',
        shell: '0 24px 70px rgba(27,27,58,.10)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
