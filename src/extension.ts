// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ChildProcessWithoutNullStreams, execFile, spawn } from "child_process";
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
let myStatusBarItem: vscode.StatusBarItem;
let server: ChildProcessWithoutNullStreams;
export function activate(context: vscode.ExtensionContext) {
  const fireCoderLog = vscode.window.createOutputChannel("FireCoder");
  fireCoderLog.append("FireCoder activated");
  fireCoderLog.show();

  const config = vscode.workspace.getConfiguration("firecoder");
  const serverPath = config.get("serverPath") as string;
  const modelPath = config.get("modelPath") as string;
  if (serverPath !== "" && modelPath !== "") {
    server = spawn(serverPath, [`--model`, modelPath, "--port", "39129"], {
      detached: false,
    });
    fireCoderLog.append("spawn process");

    server.stdout.on("data", function (msg) {
      fireCoderLog.append(`stdout: ${msg}`);
    });
    server.stderr.on("data", function (msg) {
      fireCoderLog.append(`stderr: ${msg}`);
    });
    server.on("error", (err) => {
      fireCoderLog.append(`error: ${err.message}`);
      fireCoderLog.append(`name: ${err.name}`);
      fireCoderLog.append(`stack: ${err.stack}`);
      fireCoderLog.append(`cause: ${err.cause}`);
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
        fireCoderLog.append(`Controller is null: ${controller === null}`);
        if (controller === null) {
          controller = new AbortController();
        } else {
          controller.abort();
          controller = new AbortController();
        }
        myStatusBarItem.text = `$(loading~spin) FireCoder`;
        myStatusBarItem.show();
        const res = await fetch("http://localhost:39129/completion", {
          body: JSON.stringify(body),
          method: "POST",
          signal: controller.signal,
        });
        fireCoderLog.append(JSON.stringify(body, null, 2));

        if (!res.ok) {
          fireCoderLog.append(JSON.stringify(res.status, null, 2));
          fireCoderLog.append(JSON.stringify(res.statusText, null, 2));

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
        fireCoderLog.append(JSON.stringify(json, null, 2));

        myStatusBarItem.text = `$(check) FireCoder`;
        myStatusBarItem.show();

        return {
          items,
        };
      } catch (error) {
        fireCoderLog.append(JSON.stringify(error, null, 2));

        const errorMessage = (error as Error).message;
        vscode.window.showErrorMessage(errorMessage);
      }
    },
  };

  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(myStatusBarItem);
  myStatusBarItem.text = `$(check) FireCoder`;
  myStatusBarItem.show();
  vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**" },
    provider
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (server) {
    server.kill(9);
  }
}
