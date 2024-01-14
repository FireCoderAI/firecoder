import * as vscode from "vscode";
import Logger from "./common/logger";
import { servers } from "./common/server";
import statusBar from "./common/statusBar";
import { getInlineCompletionProvider } from "./common/completion";
import { TelemetrySenderInstance } from "./common/telemetry";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("FireCoder is starting.");
  TelemetrySenderInstance.init(context);
  const TelemetryLogger = vscode.env.createTelemetryLogger(
    TelemetrySenderInstance
  );
  TelemetrySenderInstance.sendEventData("FireCoder is starting.");
  TelemetryLogger.logUsage("FireCoder is starting.");

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

  try {
    const serverSmallStarted = await servers["base-small"].startServer();
    if (serverSmallStarted) {
      const InlineCompletionProvider = getInlineCompletionProvider(context);
      vscode.languages.registerInlineCompletionItemProvider(
        { pattern: "**" },
        InlineCompletionProvider
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage((error as Error).message);
    Logger.error(error);
    TelemetryLogger.logError(error as Error);
  }

  Logger.info("FireCoder is ready.");
  TelemetrySenderInstance.sendEventData("Firecoder is ready.");
}

export function deactivate() {
  servers["base-small"].stopServer();
}
