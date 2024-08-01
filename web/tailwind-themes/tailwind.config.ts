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
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      }, */
      colors: {
        /* border: "hsl(var(--border))", */
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        /* background: "hsl(var(--background))", */
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        /* accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        }, */
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // background
        background: "#f9fafb", // gray-50
        "background-subtle": "#e5e7eb", // gray-200
        "background-emphasis": "#f6f7f8",
        "background-strong": "#eaecef",
        "background-search": "#ffffff",
        "background-custom-header": "#f3f4f6",
        "background-inverted": "#000000",
        "background-weak": "#f3f4f6", // gray-100
        "background-dark": "#111827", // gray-900

        // text or icons
        light: "#e5e7eb", // gray-200
        link: "#3b82f6", // blue-500
        "link-hover": "#1d4ed8", // blue-700
        subtle: "#6b7280", // gray-500
        default: "#4b5563", // gray-600
        emphasis: "#374151", // gray-700
        strong: "#111827", // gray-900
        inverted: "#ffffff", // white
        error: "#ef4444", // red-500
        alert: "#f59e0b", // amber-600
        accent: "#6671d0",

        // borders
        border: "#e5e7eb", // gray-200
        "border-light": "#f3f4f6", // gray-100
        "border-medium": "#d1d5db", // gray-300
        "border-strong": "#9ca3af", // gray-400

        // hover
        "hover-light": "#f3f4f6", // gray-100
        hover: "#e5e7eb", // gray-200
        "hover-emphasis": "#d1d5db", // gray-300
        "accent-hover": "#5964c2",

        // keyword highlighting
        highlight: {
          text: "#fef9c3", // yellow-100
        },

        // scrollbar
        scrollbar: {
          track: "#f9fafb",
          thumb: "#e5e7eb",
          "thumb-hover": "#d1d5db",

          dark: {
            thumb: "#989a9c",
            "thumb-hover": "#c7cdd2",
          },
        },

        // bubbles in chat for each "user"
        user: "#fb7185", // yellow-400
        ai: "#60a5fa", // blue-400

        // for display documents
        document: "#ec4899", // pink-500

        // light mode
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      screens: {
        "2xl": "1420px",
        "3xl": "1700px",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
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
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
