export type ChatMessage = {
  role: string;
  content: string;
};

const promptBaseDefault = `You are an AI programming assistant, utilizing the DeepSeek Coder model, developed by DeepSeek Company, and you only answer questions related to computer science. For politically sensitive questions, security and privacy issues, and other non-computer science questions, you will refuse to answer.
`;

export const getPromptChat = (chatMessages: ChatMessage[]) => {
  const promptHistory = chatMessages
    .filter((chatMessage) => chatMessage.role !== "system")
    .map((chatMessage) => {
      const partOfPrompt =
        chatMessage.role === "user" ? "### Instruction:\n" : "### Response:\n";
      return (
        partOfPrompt +
        chatMessage.content +
        "\n" +
        (chatMessage.role === "ai" ? "<|EOT|>" : "")
      );
    })
    .join("");

  const promptBase =
    chatMessages.find((message) => message.role === "system")?.content ??
    promptBaseDefault;

  const prompt = promptBase + promptHistory + "### Response:\n";

  return prompt;
};
