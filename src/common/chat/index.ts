import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { HistoryMessage, getPromptChat } from "../prompt/promptChat";
import Logger from "../logger";
import { sendChatRequest } from "./localChat";
import { servers } from "../server";

const logCompletion = () => {
  const uuid = randomUUID();

  return {
    info: (text: any) =>
      Logger.info(text, { component: `Chat: ${uuid.slice(-8)}` }),
    uuid: () => uuid,
  };
};

export async function* chat(history: HistoryMessage[]) {
  const loggerCompletion = logCompletion();

  loggerCompletion.info("Chat: started");

  const prompt = await getPromptChat(history);

  const parameters = {
    n_predict: 512,
    stop: [],
    temperature: 0.7,
  };

  try {
    Logger.info(`Start request;`, {
      component: "chat",
      sendTelemetry: true,
    });

    yield* sendChatRequest(
      prompt,
      parameters,
      loggerCompletion.uuid(),
      servers["chat-medium"].serverUrl
    );

    // if (chatResponse === null) {
    //   return [];
    // }

    loggerCompletion.info("Request: finished");
    // return {
    //   role: "ai",
    //   content: chatResponse.content,
    // };
  } catch (error) {
    const Error = error as Error;
    Logger.error(error);

    const errorMessage = Error.message;
    vscode.window.showErrorMessage(errorMessage);
  }
}
