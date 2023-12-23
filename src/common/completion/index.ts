import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { getPrompt } from "../prompt";
import { abortInterval, delay } from "../utils/intervals";
import Logger from "../logger";
import statusBar from "../statusBar";

const logCompletion = () => {
  const uuid = randomUUID();

  return {
    info: (text: any) => Logger.info(text, `Completion: ${uuid.slice(-8)}`),
    uuid: () => uuid,
  };
};

export const getInlineCompletionProvider = () => {
  const provider: vscode.InlineCompletionItemProvider = {
    provideInlineCompletionItems: async (
      document,
      position,
      context,
      token
    ) => {
      const loggerCompletion = logCompletion();

      loggerCompletion.info("Completion started");

      const cancelled = await delay(250, token);
      if (cancelled) {
        loggerCompletion.info("Completion canceled");
        return;
      }
      const { abortController, requestFinish } = abortInterval(token);

      const items: vscode.InlineCompletionItem[] = [];
      const prompt = getPrompt(document, position);
      const { stopTask } = statusBar.startTask();

      const body = {
        stream: false,
        n_predict: 400,
        temperature: 0.3,
        stop: ["\n"],
        repeat_last_n: 256,
        repeat_penalty: 1.18,
        top_k: 40,
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
        slot_id: 1,
        prompt: prompt,
      };
      try {
        loggerCompletion.info("Start request");
        const startTime = performance.now();
        const res = await fetch("http://localhost:39129/completion", {
          body: JSON.stringify(body),
          method: "POST",
          signal: abortController.signal,
        });

        if (!res.ok) {
          Logger.error(res.status);
          Logger.error(res.statusText);

          vscode.window.showErrorMessage(
            `Error: ${res.status} ${res.statusText}`
          );
          return {
            items,
          };
        }

        const json: {
          content: string;
          slot_id: number;
          timings: {
            predicted_ms: number;
            predicted_per_second: number;
            prompt_ms: number;
            prompt_per_second: number;
          };
        } = (await res.json()) as any;

        loggerCompletion.info("Finish request");

        if (token.isCancellationRequested) {
          loggerCompletion.info(
            "Request canceled by new completion cancel token"
          );
          return;
        }

        Logger.debug(body, "Completion request");

        if (json.content !== "") {
          items.push({
            insertText: json.content,
            range: new vscode.Range(position, position),
          });
        }

        loggerCompletion.info(
          `Slot Id: ${json.slot_id}; ` +
            `Total time: ${(performance.now() - startTime).toFixed(2)}; ` +
            `PP: ${json.timings.prompt_per_second.toFixed(2)}; [t/s] ` +
            `TG: ${json.timings.predicted_per_second.toFixed(2)}; [t/s]`
        );
        Logger.debug(json, "Completion response json");

        loggerCompletion.info("Completion finish");

        return {
          items,
        };
      } catch (error) {
        const Error = error as Error;
        if (Error.name === "AbortError") {
          loggerCompletion.info("Request canceled by new completion abort");
          return;
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
