export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#eef1f5',
        card: '#ffffff',
        ink: '#111827',
        muted: '#6b7280',
        accent: '#155239',
        accentSoft: '#e8f1ec',
        divider: '#e5e7eb',
      },
      borderRadius: { xl2: '18px' },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.06), 0 8px 24px rgba(16,24,40,.04)' },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
