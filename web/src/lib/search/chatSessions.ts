export async function createChatSession() {
  const chatSessionResponse = await fetch("/api/chat/create-chat-session", {
    method: "POST",
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return chatSessionResponse;
}
