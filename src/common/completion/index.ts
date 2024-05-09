import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { getPromptCompletion } from "../prompt";
import { abortInterval, delay } from "./utils/intervals";
import { getAdditionalDocuments } from "./utils/getAdditionalDocuments";
import Logger from "../logger";
import { sendCompletionRequestLocal } from "./localCompletion";
import { servers } from "../server";
import { configuration } from "../utils/configuration";
import { state } from "../utils/state";
import { sendCompletionsRequestCloud } from "./cloudCompletion";
import statusBar from "../statusBar";

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

      // If the current mode is not auto and the trigger is automatic, don't suggest any completions.
      if (currentInlineSuggestModeAuto !== true && triggerAuto === true) {
        return [];
      }

      // If there is a selected completion item, don't suggest any completions.
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
      const { stopTask } = statusBar.startTask();

      try {
        Logger.info(
          `Start request; Mode: ${triggerAuto ? "Auto" : "Manually"}`,
          {
            component: "completion",
            sendTelemetry: true,
          }
        );
        const cloudUse = configuration.get("cloud.use");
        const cloudUseAutocomplete = configuration.get(
          "cloud.autocomplete.use"
        );
        if (cloudUse && cloudUseAutocomplete) {
          const prompt = await getPromptCompletion({
            activeDocument: document,
            additionalDocuments: await getAdditionalDocuments(),
            position: position,
            maxTokenExpect: 5300,
          });
          const completion = await sendCompletionsRequestCloud(prompt, {
            n_predict: 512,
            temperature: 0.5,
            controller: abortController,
          });

          if (completion === "" || completion === undefined) {
            return [];
          }

          if (token.isCancellationRequested) {
            loggerCompletion.info(
              "Request: canceled by new completion cancel token"
            );

            return [];
          }

          return [
            {
              insertText: completion,
              range: new vscode.Range(position, position),
            },
          ];
        } else {
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
          });

          const parameters = triggerAuto
            ? {
                n_predict: 128,
                stop: ["\n", "<|file_separator|>"],
              }
            : {
                n_predict: 512,
                stop: ["<|file_separator|>"],
                temperature: 0.5,
              };
          const modelType = triggerAuto
            ? configuration.get("completion.autoMode")
            : configuration.get("completion.manuallyMode");
          const completion = await sendCompletionRequestLocal(
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
          loggerCompletion.info("Request: finished");

          return [
            {
              insertText: completion.content,
              range: new vscode.Range(position, position),
            },
          ];
        }
      } catch (error) {
        const Error = error as Error;
        Logger.error(error);

        const errorMessage = Error.message;
        vscode.window.showErrorMessage(errorMessage);
      } finally {
        stopTask();
        requestFinish();
      }
      return [];
    },
  };

  return provider;
};
