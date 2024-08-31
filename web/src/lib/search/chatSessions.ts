export async function createChatSession(assistantId?: number | null) {
  const chatSessionResponse = await fetch("/api/chat/create-chat-session", {
    method: "POST",
    body: JSON.stringify({
      assistant_id: assistantId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return chatSessionResponse;
}
