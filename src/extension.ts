import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import * as vscode from "vscode";
import { downloadServer, downloadModel } from "./download";
import { delay } from "./common/utils/delay";
import Logger from "./common/logger";

let statusBarItemFireCoder: vscode.StatusBarItem;
let server: ChildProcessWithoutNullStreams;

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("FireCoder activated");

  const serverPath = await downloadServer();
  const modelPath = await downloadModel();

  if (serverPath && modelPath) {
    server = spawn(
      serverPath,
      [
        `--model`,
        modelPath,
        "--port",
        "39129",
        "--parallel",
        "4",
        "--ctx-size",
        "1024",
      ],
      {
        detached: false,
      }
    );

    server.stdout.on("data", function (msg) {
      Logger.debug(msg, "llama");
    });
    server.stderr.on("data", function (msg) {
      Logger.error(msg, "llama");
    });
    server.on("error", (err) => {
      Logger.error(`error: ${err.message}`);
      Logger.error(`name: ${err.name}`);
      Logger.error(`stack: ${err.stack}`);
      Logger.error(`cause: ${err.cause}`);
    });
    server.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
    });
  }

  let controller: AbortController | null = null;
  const provider: vscode.InlineCompletionItemProvider = {
    async provideInlineCompletionItems(document, position, context, token) {
      const items: vscode.InlineCompletionItem[] = [];
      const textBefore = document.getText(
        new vscode.Range(new vscode.Position(0, 0), position)
      );
      const textAfter = document.getText(
        new vscode.Range(
          position,
          new vscode.Position(
            document.lineCount,
            document.lineAt(document.lineCount - 1).text.length
          )
        )
      );
      const textBeforeSlice = textBefore.slice(-100);
      const textAfterSlice = textAfter.slice(0, 100);
      const prompt = `<｜fim▁begin｜>${textBeforeSlice}<｜fim▁hole｜>${textAfterSlice}<｜fim▁end｜>`;
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

        statusBarItemFireCoder.text = `$(loading~spin) FireCoder`;
        statusBarItemFireCoder.show();

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

        statusBarItemFireCoder.text = `$(check) FireCoder`;
        statusBarItemFireCoder.show();

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

  statusBarItemFireCoder = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(statusBarItemFireCoder);
  statusBarItemFireCoder.text = `$(check) FireCoder`;
  statusBarItemFireCoder.show();
  vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**" },
    provider
  );
}

export function deactivate() {
  if (server) {
    server.kill(9);
  }
}
