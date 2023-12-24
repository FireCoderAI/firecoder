import * as vscode from "vscode";
import Logger from "./common/logger";
import { startServer, stopServer } from "./common/server";
import statusBar from "./common/statusBar";
import { getInlineCompletionProvider } from "./common/completion";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("FireCoder is starting.");

  statusBar.init(context);

  await startServer();

  const InlineCompletionProvider = getInlineCompletionProvider();
  vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**" },
    InlineCompletionProvider
  );

  Logger.info("Firecoder is ready.");
}

export function deactivate() {
  stopServer();
}
