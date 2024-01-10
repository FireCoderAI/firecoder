import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { getPrompt } from "../prompt";
import { abortInterval, delay } from "../utils/intervals";
import Logger from "../logger";
import statusBar from "../statusBar";
import { TelemetryInstance } from "../telemetry";

const logCompletion = () => {
  const uuid = randomUUID();

  return {
    info: (text: any) => Logger.info(text, `Completion: ${uuid.slice(-8)}`),
    uuid: () => uuid,
  };
};

export const getInlineCompletionProvider = () => {
  let maxToken = 50;
  let expectedTime = 1000;
  const provider: vscode.InlineCompletionItemProvider = {
    provideInlineCompletionItems: async (
      document,
      position,
      context,
      token
    ) => {
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

      const prompt = await getPrompt(document, position, maxToken);
      const { stopTask } = statusBar.startTask();

      const parameters = {
        stream: false,
        n_predict: 128,
        temperature: 0.3,
        stop: ["\n"],
        repeat_last_n: 256,
        repeat_penalty: 1.18,
        penalize_nl: true,
        top_k: 20,
        top_p: 0.5,
        min_p: 0.05,
        tfs_z: 1,
        typical_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
        mirostat: 0,
        mirostat_tau: 5,
        mirostat_eta: 0.1,
        grammar: "",
        n_probs: 0,
        image_data: [],
        cache_prompt: false,
        slot_id: -1,
        prompt: prompt,
      };
      try {
        loggerCompletion.info("Completion: processing; Request: started");
        TelemetryInstance.sendTelemetryEvent("Start request");

        const startTime = performance.now();

        const response = await fetch("http://localhost:39129/completion", {
          body: JSON.stringify(parameters),
          method: "POST",
          signal: abortController.signal,
        });

        if (!response.ok) {
          Logger.error(response.statusText);

          vscode.window.showErrorMessage(
            `Error: ${response.status} ${response.statusText}`
          );
          return [];
        }

        const completion: {
          content: string;
          slot_id: number;
          timings: {
            predicted_ms: number;
            predicted_n: number;
            predicted_per_second: number;
            predicted_per_token_ms: number;
            prompt_ms: number;
            prompt_n: number;
            prompt_per_second: number;
            prompt_per_token_ms: number;
          };
        } = (await response.json()) as any;

        if (token.isCancellationRequested) {
          loggerCompletion.info(
            "Completion: finish; Request: canceled by new completion cancel token"
          );

          return [];
        }

        if (completion.content === "") {
          loggerCompletion.info(
            "Completion: finish; Request: canceled by empty content"
          );
          return [];
        }

        loggerCompletion.info(
          `Slot Id: ${completion.slot_id}; ` +
            `Total time: ${(performance.now() - startTime).toFixed(2)}; ` +
            `PP: ${completion?.timings?.prompt_per_second?.toFixed(
              2
            )}; [t/s] ` +
            `TG: ${completion?.timings?.predicted_per_second?.toFixed(
              2
            )}; [t/s]`
        );

        maxToken *=
          expectedTime /
          (completion?.timings?.prompt_ms
            ? completion?.timings?.prompt_ms
            : performance.now() - startTime);

        loggerCompletion.info(`maxToken: ${maxToken}`);

        loggerCompletion.info("Completion finish");

        return [
          {
            insertText: completion.content,
            range: new vscode.Range(position, position),
          },
        ];
      } catch (error) {
        const Error = error as Error;
        if (Error.name === "AbortError") {
          loggerCompletion.info("Request canceled by new completion abort");
          return [];
        }
        Logger.error(error);

        const errorMessage = Error.message;
        vscode.window.showErrorMessage(errorMessage);
      } finally {
        stopTask();
        requestFinish();
      }
    },
  };

  return provider;
};
