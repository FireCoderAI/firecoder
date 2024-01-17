import * as vscode from "vscode";
import Logger from "./common/logger";
import { servers } from "./common/server";
import statusBar from "./common/statusBar";
import { getInlineCompletionProvider } from "./common/completion";
import { FirecoderTelemetrySenderInstance } from "./common/telemetry";

export async function activate(context: vscode.ExtensionContext) {
  FirecoderTelemetrySenderInstance.init(context);
  vscode.env.createTelemetryLogger(FirecoderTelemetrySenderInstance);

  Logger.info("FireCoder is starting.", {
    component: "main",
    sendTelemetry: true,
  });

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

  Logger.info("Status Bad inited", {
    component: "main",
    sendTelemetry: true,
  });

  try {
    const serverSmallStarted = await servers["base-small"].startServer();
    if (serverSmallStarted) {
      Logger.info("Server inited", {
        component: "main",
        sendTelemetry: true,
      });
      const InlineCompletionProvider = getInlineCompletionProvider(context);
      vscode.languages.registerInlineCompletionItemProvider(
        { pattern: "**" },
        InlineCompletionProvider
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage((error as Error).message);
    Logger.error(error, {
      component: "server",
      sendTelemetry: true,
    });
  }

  Logger.info("FireCoder is ready.", {
    component: "main",
    sendTelemetry: true,
  });
}

export function deactivate() {
  Object.values(servers).forEach((server) => server.stopServer());
}
