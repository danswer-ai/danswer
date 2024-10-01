export function extractCodeText(
  node: any,
  content: string,
  children: React.ReactNode
): string {
  let codeText = "";
  if (
    node?.position?.start?.offset != null &&
    node?.position?.end?.offset != null
  ) {
    codeText = content
      .slice(node.position.start.offset, node.position.end.offset)
      .trim();
  } else {
    // Fallback if position offsets are not available
    codeText = children?.toString() || "";
  }
  return codeText;
}
