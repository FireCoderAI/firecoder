import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "langchain/schema/output_parser";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { HistoryMessage } from "../prompt";
import { configuration } from "../utils/configuration";
import { getSuppabaseClient } from "../auth/supabaseClient";

type Parameters = {
  temperature: number;
  n_predict: number;
  controller?: AbortController;
};

export const sendChatRequestCloud = async (
  history: HistoryMessage[],
  parameters: Parameters
) => {
  const supabase = getSuppabaseClient();
  const session = await supabase.auth.getSession();
  const apiKey = session.data?.session?.access_token;

  if (!apiKey) {
    throw new Error("No API key found");
  }

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
    configurable: {
      signal: parameters.controller,
    },
    maxConcurrency: 1,
  });

  return stream;
};
