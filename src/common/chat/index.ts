import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { HistoryMessage, getPromptChat } from "../prompt/promptChat";
import Logger from "../logger";
import { sendChatRequest } from "./localChat";
import { servers } from "../server";
import { configuration } from "../utils/configuration";
import statusBar from "../statusBar";

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
    n_predict: 4096,
    stop: [],
    temperature: 0.7,
  };

  const serverUrl = configuration.get("cloud.use")
    ? configuration.get("cloud.endpoint")
    : servers["chat-medium"].serverUrl;

  const { stopTask } = statusBar.startTask();

  try {
    Logger.info(`Start request;`, {
      component: "chat",
      sendTelemetry: true,
    });

    yield* sendChatRequest(
      prompt,
      parameters,
      loggerCompletion.uuid(),
      serverUrl
    );

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
