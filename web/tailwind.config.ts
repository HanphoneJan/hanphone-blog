module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  corePlugins: {
    pre: false,
    code: false
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Arial', 'SimSun', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      },
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--primary-hover) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        hover: 'rgb(var(--hover) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        'code-bg': 'rgb(var(--code-bg) / <alpha-value>)',
        'code-text': 'rgb(var(--code-text) / <alpha-value>)'
      }
    }
  },
  plugins: [
    function ({ addVariant }) {
      // 添加主题特定变体
      addVariant('macaron', '&:where(.theme-macaron, .theme-macaron *)')
      addVariant('cyber', '&:where(.theme-cyber, .theme-cyber *)')
    }
  ]
}
