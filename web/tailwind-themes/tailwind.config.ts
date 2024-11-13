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
        // TODO: make a proper palette for this that uses range
        brand: {
          50: "#F7DCFF",
          100: "#EEB3FE",
          200: "#DD67FE",
          300: "#CC1BFD",
          400: "#A302D0",
          500: "#670182",
          600: "#53016A",
          700: "#3C014C",
          800: "#280033",
          900: "#140019",
          950: "#0C000F",
        },
        secondary: {
          50: "#FDF5FF",
          100: "#FCF0FF",
          200: "#F8E1FF",
          300: "#F5D2FE",
          400: "#F1C3FE",
          500: "#EEB3FE",
          600: "#DA5EFD",
          700: "#C708FC",
          800: "#8702AB",
          900: "#430156",
          950: "#200128",
        },
        destructive: {
          50: "",
          100: "var(--destructive-foreground)",
          200: "",
          300: "",
          400: "",
          500: "var(--destructive)",
          600: "",
          700: "",
          800: "",
          900: "",
          950: "",
        },
        warning: {
          50: "",
          100: "var(--warning-foreground)",
          200: "",
          300: "",
          400: "",
          500: "var(--warning)",
          600: "",
          700: "",
          800: "",
          900: "",
          950: "",
        },
        success: {
          50: "",
          100: "var(--success-foreground)",
          200: "",
          300: "",
          400: "",
          500: "var(--success)",
          600: "",
          700: "",
          800: "",
          900: "",
          950: "",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
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
