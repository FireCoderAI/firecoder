import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { getPromptCompletion } from "../prompt";
import { abortInterval, delay } from "../utils/intervals";
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

      let additionalDocuments: vscode.TextDocument[] = [];

      if (!triggerAuto && configuration.get("experimental.useopentabs")) {
        const additionalDocumentsUri = vscode.window.tabGroups.all
          .map((group) => group.tabs)
          .flat()
          .filter((tab) => !(tab.group.isActive && tab.isActive))
          .filter(
            (tab) =>
              tab.input &&
              "uri" in (tab.input as any) &&
              ((tab.input as any).uri as vscode.Uri).scheme === "file"
          )
          .map((tab) => (tab.input as any).uri as vscode.Uri);
        additionalDocuments = await Promise.all(
          additionalDocumentsUri.map((uri) =>
            vscode.workspace.openTextDocument(uri)
          )
        );
      }

      const prompt = await getPromptCompletion({
        activeDocument: document,
        additionalDocuments: additionalDocuments,
        position: position,
        maxTokenExpect: triggerAuto ? maxToken : 1000,
        url: servers[modelType].serverUrl,
      });

      const parameters = triggerAuto
        ? {
            n_predict: 128,
            stop: ["\n"],
          }
        : {
            n_predict: 512,
            stop: [],
            temperature: 0.7,
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
          servers[modelType].serverUrl
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
