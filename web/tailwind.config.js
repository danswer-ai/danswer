var merge = require("lodash/merge");

// Use relative paths for imports
const baseThemes = require("./tailwind-themes/tailwind.config.js");

let customThemes = null;
try {
  if (process.env.NEXT_PUBLIC_THEME) {
    customThemes = require(
      `./tailwind-themes/custom/${process.env.NEXT_PUBLIC_THEME}/tailwind.config.js`
    );
  }
} catch (error) {
  console.warn(`Custom theme not found for: ${process.env.NEXT_PUBLIC_THEME}`);
}

/** @type {import('tailwindcss').Config} */
module.exports = customThemes ? merge(baseThemes, customThemes) : baseThemes;
