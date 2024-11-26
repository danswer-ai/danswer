import config from "../../tailwind-themes/tailwind.config";
const tailwindColors = config.theme.extend.colors;

export const useGradient = (teamspaceName: string) => {
  const colors = [
    tailwindColors.brand[50],
    tailwindColors.brand[200],
    tailwindColors.brand[400],
    tailwindColors.brand[600],
    tailwindColors.brand[500],
  ];
  const index = teamspaceName.charCodeAt(0) % colors.length;
  return `linear-gradient(135deg, ${colors[index]}, ${
    colors[(index + 1) % colors.length]
  })`;
};
