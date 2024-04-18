import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { ChatMessage, getPromptChat } from "../prompt/promptChat";
import Logger from "../logger";
import { sendChatRequestLocal as sendChatRequestLocal } from "./localChat";
import { configuration } from "../utils/configuration";
import statusBar from "../statusBar";
import { sendChatRequestCloud } from "./cloudChat";
import {
  getHighlightedTextDetails,
  humanMessageWithCodePrompt,
  systemTemplate,
} from "./utils/useHighlightedTextAsContext";

const logCompletion = () => {
  const uuid = randomUUID();

  return {
    info: (text: any) =>
      Logger.info(text, { component: `Chat: ${uuid.slice(-8)}` }),
    uuid: () => uuid,
  };
};

export async function* chat(
  history: ChatMessage[],
  config?: {
    provideHighlightedText?: boolean;
    abortController: AbortController;
  }
) {
  const loggerCompletion = logCompletion();

  loggerCompletion.info("Chat: started");

  const parameters = {
    n_predict: 4096,
    stop: [],
    temperature: 0.7,
    controller: config?.abortController,
  };

  const { stopTask } = statusBar.startTask();
  try {
    Logger.info(`Start request;`, {
      component: "chat",
      sendTelemetry: true,
    });

    if (config?.provideHighlightedText) {
      const highlighted = getHighlightedTextDetails();

      if (highlighted !== null) {
        const firstMessage = history.shift();
        history.unshift({
          role: "user",
          content: await humanMessageWithCodePrompt.format({
            highlightedCode: highlighted.content,
            question: firstMessage?.content,
          }),
        });
        history.unshift({
          role: "system",
          content: systemTemplate,
        });
      }
    }

    if (configuration.get("cloud.use")) {
      yield* await sendChatRequestCloud(history, parameters);
    } else {
      const prompt = getPromptChat(history);

      yield* sendChatRequestLocal(prompt, parameters, loggerCompletion.uuid());
    }

    loggerCompletion.info("Request: finished");
  } catch (error) {
    const Error = error as Error;
    Logger.error(error);

    const errorMessage = Error.message;
    vscode.window.showErrorMessage(errorMessage);
  } finally {
    stopTask();
  }
}
