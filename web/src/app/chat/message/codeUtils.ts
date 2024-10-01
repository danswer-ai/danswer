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

  // Remove backticks and language identifier if present
  const codeBlockRegex = /^```(\w+)?\n([\s\S]*)\n```$/;
  const match = codeText.match(codeBlockRegex);
  if (match) {
    codeText = match[2].trim(); // Extract the code content without backticks and language identifier
  }
  return codeText;
}
