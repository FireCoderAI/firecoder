import { OpenAI } from "@langchain/openai";
import { configuration } from "../utils/configuration";
import Logger from "../logger";
import { getSuppabaseClient } from "../auth/supabaseClient";

type Parameters = {
  temperature: number;
  n_predict: number;
  controller?: AbortController;
};

export const sendCompletionsRequestCloud = async (
  prompt: string,
  parameters: Parameters
) => {
  const supabase = getSuppabaseClient();
  const session = await supabase.auth.getSession();
  const apiKey = session.data?.session?.access_token;

  if (!apiKey) {
    throw new Error("No API key found");
  }

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
