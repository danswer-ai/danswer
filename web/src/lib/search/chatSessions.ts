export async function createChatSession(personaId?: number | null) {
  const chatSessionResponse = await fetch("/api/chat/create-chat-session", {
    method: "POST",
    body: JSON.stringify({
      persona_id: personaId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return chatSessionResponse;
}
