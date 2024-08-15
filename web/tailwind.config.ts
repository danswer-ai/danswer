var merge = require("lodash/merge");

const baseThemes = require("./tailwind-themes/tailwind.config.ts");
const customThemes = process.env.NEXT_PUBLIC_THEME
  ? require(`./tailwind-themes/custom/${process.env.NEXT_PUBLIC_THEME}/tailwind.config.ts`)
  : null;

/** @type {import('tailwindcss').Config} */
module.exports = customThemes ? merge(baseThemes, customThemes) : baseThemes;
