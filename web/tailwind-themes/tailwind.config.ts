import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      fontWeight: {
        description: "375",
        "token-bold": "bold",
      },
      fontStyle: {
        "token-italic": "italic",
      },
      fontSize: {
        "code-sm": "small",
      },
      colors: {
        // code styling
        "code-bg": "var(--black)",
        "code-text": "var(--code-text)",
        "token-comment": "var(--token-comment)",
        "token-punctuation": "var(--token-punctuation)",
        "token-property": "var(--token-property)",
        "token-selector": "var(--token-selector)",
        "token-atrule": "var(--token-atrule)",
        "token-function": "var(--token-function)",
        "token-regex": "var(--token-regex)",
        "token-attr-name": "var(--token-attr-name)",
        "non-selectable": "var(--non-selectable)",

        input: "hsl(var(--input))",
        "input-colored": "#8DBAFF",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#080404",
          foreground: "#DDBBBB",
          300: "#8B4646",
          light: "#4B2525",
        },
        // TODO: make a proper palette for this that uses range
        brand: {
          50: "#EEDDDD",
          100: "#DDBBBB",
          200: "#BD7A7A",
          300: "#8B4646",
          400: "#4B2525",
          500: "#080404",
          600: "#070303",
          700: "#030202",
          800: "#030202",
          900: "#000000",
          950: "#000000",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // background
        background: "#ffffff",
        "background-inverted": "#000000",
        "background-subtle": "#e5e7eb", // gray-200
        "background-emphasis": "#f6f7f8",
        "background-strong": "#eaecef",
        "background-custom-header": "#f3f4f6",
        "background-weak": "#f3f4f6", // gray-100
        "background-dark": "#111827", // gray-900

        // text or icons
        default: "rgba(14, 14, 15, 0.8)",
        strong: "#111827", // gray-900
        inverted: "#ffffff", // white
        light: "#e5e7eb", // gray-200
        link: "#3b82f6", // blue-500
        "link-hover": "#1d4ed8", // blue-700
        subtle: "#6b7280", // gray-500
        emphasis: "#374151", // gray-700
        error: "#ef4444", // red-500
        alert: "#f59e0b", // amber-600
        accent: "#4B2525",

        // borders
        border: "#e5e7eb", // gray-200
        "border-light": "#f3f4f6", // gray-100
        "border-medium": "#d1d5db", // gray-300
        "border-strong": "#9ca3af", // gray-400

        // hover
        "hover-light": "#f3f4f6", // gray-100
        hover: "#e5e7eb", // gray-200

        // keyword highlighting
        highlight: {
          text: "#FFA726", // yellow-100
        },

        // for display documents
        document: "#ec4899", // pink-500

        dark: {
          50: "rgba(14, 14, 15, 0.1)",
          100: "rgba(14, 14, 15, 0.2)",
          200: "rgba(14, 14, 15, 0.3)",
          300: "rgba(14, 14, 15, 0.4)",
          400: "rgba(14, 14, 15, 0.5)",
          500: "rgba(14, 14, 15, 0.6)",
          600: "rgba(14, 14, 15, 0.7)",
          700: "rgba(14, 14, 15, 0.8)",
          800: "rgba(14, 14, 15, 0.9)",
          900: "rgba(14, 14, 15, 1)",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        regular: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        pill: "999px",
        circle: "50%",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      width: {
        sidebar: "300px",
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
      boxShadow: {
        xs: "0px 0px 0px 0px #00000000",
        sm: "0px 1px 3px 0px #00000033, 0px 2px 1px -1px #0000001f, 0px 1px 1px 0px #00000024",
        shadow:
          "0px 1px 5px 0px #00000033, 0px 3px 1px -2px #0000001f, 0px 2px 2px 0px #00000024",
        md: "0px 2px 4px -1px #00000033, 0px 1px 10px 0px #0000001f, 0px 4px 5px 0px #00000024",
        lg: "0px 3px 5px -1px #00000033, 0px 1px 18px 0px #0000001f, 0px 6px 10px 0px #00000024",
        xl: "0px 5px 5px -3px #00000033, 0px 3px 14px 2px #0000001f, 0px 8px 10px 1px #00000024",
        "2xl":
          "0px 7px 8px -4px #00000033, 0px 5px 22px 4px #0000001f, 0px 12px 17px 2px #00000024",
        "3xl":
          "0px 8px 10px -5px #00000033, 0px 6px 30px 5px #0000001f, 0px 16px 24px 2px #00000024",
        "4xl":
          "0px 11px 15px -7px #00000033, 0px 9px 46px 8px #0000001f, 0px 24px 38px 3px #00000024",
      },
      zIndex: {
        deep: "-999999",
        default: "1",
        masked: "100",
        mask: "200",
        sticky: "300",
        navigation: "400",
        "top-bar": "500",
        overlay: "600",
        spinner: "700",
        popout: "800",
        toast: "900",
        modal: "1000",
        notification: "1100",
        loading: "1200",
      },
      screens: {
        "2xl": "1420px",
        "3xl": "1700px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
