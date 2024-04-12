import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { getPromptCompletion } from "../prompt";
import { abortInterval, delay } from "./utils/intervals";
import { getAdditionalDocuments } from "./utils/getAdditionalDocuments";
import Logger from "../logger";
import { sendCompletionRequest } from "./localCompletion";
import { servers } from "../server";
import { configuration } from "../utils/configuration";
import { state } from "../utils/state";

const logCompletion = () => {
  const uuid = randomUUID();

  return {
    info: (text: any) =>
      Logger.info(text, { component: `Completion: ${uuid.slice(-8)}` }),
    uuid: () => uuid,
  };
};

export const getInlineCompletionProvider = (
  extensionContext: vscode.ExtensionContext
) => {
  let maxToken = 50;
  let expectedTime = 1000;

  const provider: vscode.InlineCompletionItemProvider = {
    provideInlineCompletionItems: async (
      document,
      position,
      context,
      token
    ) => {
      const triggerAuto =
        context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic;

      const currentInlineSuggestModeAuto = state.workspace.get(
        "inlineSuggestModeAuto"
      );

      if (currentInlineSuggestModeAuto !== true && triggerAuto === true) {
        return [];
      }

      if (context.selectedCompletionInfo) {
        return [];
      }

      const loggerCompletion = logCompletion();

      loggerCompletion.info("Completion: started");

      const cancelled = await delay(250, token);
      if (cancelled) {
        loggerCompletion.info("Completion: canceled");
        return [];
      }

      const { abortController, requestFinish } = abortInterval(token);

      const modelType = triggerAuto
        ? configuration.get("completion.autoMode")
        : configuration.get("completion.manuallyMode");

      const serverUrl = servers[modelType].serverUrl;

      const additionalDocuments: vscode.TextDocument[] = configuration.get(
        "experimental.useopentabs"
      )
        ? await getAdditionalDocuments()
        : [];

      const prompt = await getPromptCompletion({
        activeDocument: document,
        additionalDocuments: additionalDocuments,
        position: position,
        maxTokenExpect: triggerAuto ? maxToken : 2000,
        url: serverUrl,
      });

      const parameters = triggerAuto
        ? {
            n_predict: 128,
            stop: ["\n"],
          }
        : {
            n_predict: 512,
            stop: [],
            temperature: 0.5,
          };

      try {
        Logger.info(
          `Start request; Mode: ${triggerAuto ? "Auto" : "Manually"}`,
          {
            component: "completion",
            sendTelemetry: true,
          }
        );

        const completion = await sendCompletionRequest(
          prompt,
          parameters,
          abortController,
          loggerCompletion.uuid(),
          serverUrl
        );

        if (completion === null) {
          return [];
        }

        if (token.isCancellationRequested) {
          loggerCompletion.info(
            "Request: canceled by new completion cancel token"
          );

          return [];
        }
        if (triggerAuto) {
          maxToken *= expectedTime / completion.timing;
        }

        loggerCompletion.info(`maxToken: ${maxToken}`);

        loggerCompletion.info("Request: finished");

        return [
          {
            insertText: completion.content,
            range: new vscode.Range(position, position),
          },
        ];
      } catch (error) {
        const Error = error as Error;
        Logger.error(error);

        const errorMessage = Error.message;
        vscode.window.showErrorMessage(errorMessage);
      } finally {
        requestFinish();
      }
    },
  };

  return provider;
};
