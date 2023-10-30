export function getNameFromPath(path: string) {
  const pathParts = path.split("/");
  return pathParts[pathParts.length - 1];
}
