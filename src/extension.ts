import * as vscode from "vscode";
import { delay } from "./common/utils/delay";
import Logger from "./common/logger";
import { getPrompt } from "./common/prompt";
import { startServer, stopServer } from "./common/server";
import statusBar from "./common/statusBar";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("FireCoder is starting");

  statusBar.init(context);

  await startServer();

  let controller: AbortController | null = null;
  const provider: vscode.InlineCompletionItemProvider = {
    async provideInlineCompletionItems(document, position, context, token) {
      const items: vscode.InlineCompletionItem[] = [];
      const prompt = getPrompt(document, position);
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
        slot_id: -1,
        prompt: prompt,
      };
      try {
        const cancelled = await delay(500, token);
        if (cancelled) {
          return;
        }
        Logger.info(`Controller is null: ${controller === null}`);
        if (controller === null) {
          controller = new AbortController();
        } else {
          controller.abort();
          controller = new AbortController();
        }
        statusBar.showProgress();

        const res = await fetch("http://localhost:39129/completion", {
          body: JSON.stringify(body),
          method: "POST",
          signal: controller.signal,
        });
        if (token.isCancellationRequested) {
          return;
        }
        Logger.debug(body, "Completion request");

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
        } = (await res.json()) as any;

        if (json.content !== "") {
          items.push({
            insertText: json.content,
            range: new vscode.Range(position, position),
          });
        }
        Logger.debug(body, "Completion response");
        Logger.debug(json, "Completion response json");

        statusBar.hideProgress();

        return {
          items,
        };
      } catch (error) {
        const Error = error as Error;
        if (Error.name === "AbortError") {
          return;
        }
        Logger.error(error);

        const errorMessage = Error.message;
        vscode.window.showErrorMessage(errorMessage);
      }
    },
  };

  vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**" },
    provider
  );
}

export function deactivate() {
  stopServer();
}
