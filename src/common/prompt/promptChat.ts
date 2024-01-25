import * as vscode from "vscode";
import Logger from "../logger";

export type HistoryMessage = {
  role: string;
  content: string;
};

const promptBase = `You are an AI programming assistant, utilizing the DeepSeek Coder model, developed by DeepSeek Company, and you only answer questions related to computer science. For politically sensitive questions, security and privacy issues, and other non-computer science questions, you will refuse to answer.
`;

export const getPromptChat = async (history: HistoryMessage[]) => {
  const promptHistory = history
    .map((message) => {
      const partOfPrompt =
        message.role === "user" ? "### Instruction:\n" : "### Response:\n";
      return (
        partOfPrompt +
        message.content +
        "\n" +
        (message.role === "ai" ? "<|EOT|>" : "")
      );
    })
    .join("");
  const prompt = promptBase + promptHistory + "### Response:\n";
  console.log(prompt);
  return prompt;
};
