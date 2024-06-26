/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",

    // tremor
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    transparent: "transparent",
    current: "currentColor",
    extend: {
      screens: {
        "2xl": "1420px",
        "3xl": "1700px",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
      width: {
        "message-xs": "450px",
        "message-sm": "550px",
        "message-default": "740px",
        "searchbar-xs": "560px",
        "searchbar-sm": "660px",
        searchbar: "850px",
        "document-sidebar": "800px",
        "document-sidebar-large": "1000px",
      },
      maxWidth: {
        "document-sidebar": "1000px",
      },
      colors: {
        // background
        background: "#fafafa", // neutral-50
        "background-weak": "#f5f5f5", // neutral-100

        // background: "#f3f4f6",
        "background-emphasis": "#f6f7f8",
        "background-strong": "#eaecef",
        "background-search": "#ffffff",
        "background-custom-header": "#f3f4f6",
        "background-inverted": "#000000",
        // "background-weak": "#f0f0f0", // neutral-100

        // text or icons
        link: "#3b82f6", // blue-500
        "link-hover": "#1d4ed8", // blue-700
        subtle: "#737373", // neutral-500
        default: "#525252", // neutral-600
        emphasis: "#374151", // neutral-700
        strong: "#171717", // neutral-900
        inverted: "#ffffff", // white
        error: "#ef4444", // red-500
        success: "#059669", // emerald-600
        alert: "#f59e0b", // amber-600
        accent: "#6671d0",

        // borders
        border: "#e5e5e5", // neutral-200
        "border-light": "#f3f4f6", // neutral-100
        "border-medium": "#d4d4d4", // neutral-300
        "border-strong": "#a3a3a3", // neutral-400

        // hover
        "hover-light": "#f3f4f6", // neutral-100
        hover: "#e5e5e5", // neutral-200
        "hover-emphasis": "#d4d4d4", // neutral-300
        "accent-hover": "#5964c2",

        // keyword highlighting
        highlight: {
          text: "#fef9c3", // yellow-100
        },

        // scrollbar
        scrollbar: {
          track: "#fafafa",
          thumb: "#e5e5e5",
          "thumb-hover": "#d4d4d4",

          dark: {
            thumb: "#989a9c",
            "thumb-hover": "#c7cdd2",
          },
        },

        // bubbles in chat for each "user"
        user: "#fb7185", // rose-400
        "user-hover": "#f43f5e", // rose-500
        ai: "#60a5fa", // blue-400

        // for display documents
        document: "#ec4899", // pink-500

        // light mode
        tremor: {
          brand: {
            faint: "#eff6ff", // blue-50
            muted: "#bfdbfe", // blue-200
            subtle: "#60a5fa", // blue-400
            DEFAULT: "#3b82f6", // blue-500
            emphasis: "#1d4ed8", // blue-700
            inverted: "#ffffff", // white
          },
          background: {
            muted: "#fafafa", // neutral-50
            subtle: "#f3f4f6", // neutral-100
            DEFAULT: "#ffffff", // white
            emphasis: "#374151", // neutral-700
          },
          border: {
            DEFAULT: "#e5e5e5", // neutral-200
          },
          ring: {
            DEFAULT: "#e5e5e5", // neutral-200
          },
          content: {
            subtle: "#a3a3a3", // neutral-400
            DEFAULT: "#525252", // neutral-600
            emphasis: "#374151", // neutral-700
            strong: "#171717", // neutral-900
            inverted: "#ffffff", // white
          },
        },
        // dark mode
        "dark-tremor": {
          brand: {
            faint: "#0B1229", // custom
            muted: "#172554", // blue-950
            subtle: "#1e40af", // blue-800
            DEFAULT: "#3b82f6", // blue-500
            emphasis: "#60a5fa", // blue-400
            inverted: "#0a0a0a", // neutral-950
          },
          background: {
            muted: "#131A2B", // custom
            subtle: "#262626", // neutral-800
            DEFAULT: "#171717", // neutral-900
            emphasis: "#d4d4d4", // neutral-300
          },
          border: {
            DEFAULT: "#262626", // neutral-800
          },
          ring: {
            DEFAULT: "#262626", // neutral-800
          },
          content: {
            subtle: "#737373", // neutral-500
            DEFAULT: "#d4d4d4", // neutral-300
            emphasis: "#f3f4f6", // neutral-100
            strong: "#fafafa", // neutral-50
            inverted: "#000000", // black
          },
        },
        boxShadow: {
          // light
          "tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          "tremor-card":
            "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          "tremor-dropdown":
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          // dark
          "dark-tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          "dark-tremor-card":
            "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          "dark-tremor-dropdown":
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        },
        borderRadius: {
          "tremor-small": "0.375rem",
          "tremor-default": "0.5rem",
          "tremor-full": "9999px",
        },
        fontSize: {
          "tremor-label": ["0.75rem"],
          "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
          "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
          "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
        },
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [
    require("@tailwindcss/typography"),
    require("@headlessui/tailwindcss"),
  ],
};
