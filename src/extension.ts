import * as vscode from "vscode";
import Logger from "./common/logger";
import { startServer, stopServer } from "./common/server";
import statusBar from "./common/statusBar";
import { getInlineCompletionProvider } from "./common/completion";
import { TelemetryInstance } from "./common/telemetry";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("FireCoder is starting.");

  TelemetryInstance.init(context);
  TelemetryInstance.sendTelemetryEvent("FireCoder is starting.");

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "firecoder.changeInlineSuggestMode",
      async () => {
        const currentInlineSuggestModeAuto = context.workspaceState.get(
          "inlineSuggestModeAuto",
          true
        );
        await context.workspaceState.update(
          "inlineSuggestModeAuto",
          !currentInlineSuggestModeAuto
        );
        statusBar.checkProgress();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("firecoder.inlineSuggest", async () => {
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger"
      );
    })
  );

  statusBar.init(context);

  await startServer();

  const InlineCompletionProvider = getInlineCompletionProvider(context);
  vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**" },
    InlineCompletionProvider
  );

  Logger.info("Firecoder is ready.");
}

export function deactivate() {
  stopServer();
}
