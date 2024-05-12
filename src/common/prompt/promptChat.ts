export type ChatMessage = {
  role: string;
  content: string;
  // chatMessageId: string;
};

export type Chat = {
  messages: ChatMessage[];
  chatId: string;
  date: number;
  title: string;
};

export const getPromptChat = (chatMessages: ChatMessage[]) => {
  const systemPrompt =
    chatMessages.find((message) => message.role === "system")?.content || "";
  const promptHistory = chatMessages
    .filter((chatMessage) => chatMessage.role !== "system")
    .map((chatMessage, index) => {
      const partOfPrompt =
        index === 0 && chatMessage.role === "user"
          ? "<start_of_turn>user\n" + systemPrompt + "\n"
          : chatMessage.role === "user"
          ? "<start_of_turn>user\n"
          : "<start_of_turn>model\n";
      return partOfPrompt + chatMessage.content + "<end_of_turn>\n";
    })
    .join("");

  const prompt = "<bos>" + promptHistory + "<start_of_turn>model\n";
  return prompt;
};
