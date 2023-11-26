
export async function createChatSession() {
  const chatSessionResponse = await fetch("/api/chat/create-chat-session", {
    method: "POST",
  });
  return chatSessionResponse;
}
