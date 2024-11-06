PERSONA_STARTER_MESSAGE_CREATION_PROMPT = """
Create a starter message that a **user** might send to initiate a conversation with a chatbot assistant.
Your response should include three parts:

1. **Title**: A short, engaging title that reflects the user's intent
   (e.g., 'Need Travel Advice', 'Question About Coding', 'Looking for Book Recommendations').
2. **Description**: A brief explanation of the user's purpose or context,
   written from the user's perspective (no more than one line).
3. **Message**: The actual message that the user would send to the assistant.
   This should be natural, engaging, and encourage a helpful response from the assistant.

Ensure each part is clearly labeled and separated as shown above.
Do not provide any additional text or explanation.

**Context about the assistant:**
- **Name**: {name}
- **Description**: {description}
- **Instructions**: {instructions}
""".strip()


if __name__ == "__main__":
    print(PERSONA_STARTER_MESSAGE_CREATION_PROMPT)
