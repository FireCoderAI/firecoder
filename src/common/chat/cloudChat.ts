import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "langchain/schema/output_parser";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { HistoryMessage } from "../prompt";
import { configuration } from "../utils/configuration";

type Parameters = {
  temperature: number;
  n_predict: number;
};

export const sendChatRequestCloud = async (
  history: HistoryMessage[],
  parameters: Parameters
) => {
  const apiKey = configuration.get("cloud.apiToken");

  const model = new ChatOpenAI({
    maxRetries: 0,
    openAIApiKey: apiKey,
    configuration: {
      baseURL: configuration.get("cloud.endpoint"),
    },
    temperature: parameters.temperature,
    maxTokens: parameters.n_predict,
  });

  const parser = new StringOutputParser();

  const messages = history.map((message) => {
    switch (message.role) {
      case "ai":
        return new AIMessage(message.content);
      case "user":
        return new HumanMessage(message.content);
      case "system":
        return new SystemMessage(message.content);
      default:
        return new HumanMessage(message.content);
    }
  });

  const stream = await model.pipe(parser).stream(messages, {
    maxConcurrency: 1,
  });

  return stream;
};
