import { OpenAI } from "@langchain/openai";
import { configuration } from "../utils/configuration";
import Logger from "../logger";

type Parameters = {
  temperature: number;
  n_predict: number;
  controller?: AbortController;
};

export const sendCompletionsRequestCloud = async (
  prompt: string,
  parameters: Parameters
) => {
  const apiKey = configuration.get("cloud.apiToken");

  const model = new OpenAI({
    maxRetries: 0,
    openAIApiKey: apiKey,
    configuration: {
      baseURL: configuration.get("cloud.endpoint"),
    },
    stop: ["<|file_separator|>"],
    temperature: parameters.temperature,
    maxTokens: parameters.n_predict,
  });
  try {
    const response = await model.invoke(prompt, {
      configurable: {
        signal: parameters.controller,
      },
      maxConcurrency: 1,
    });

    return response;
  } catch (error) {
    Logger.error(error);
  }
};
