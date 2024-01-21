import * as vscode from "vscode";
import Logger from "./common/logger";
import { servers } from "./common/server";
import statusBar from "./common/statusBar";
import { getInlineCompletionProvider } from "./common/completion";
import { FirecoderTelemetrySenderInstance } from "./common/telemetry";
import { configuration } from "./common/utils/configuration";
import { state } from "./common/utils/state";

export async function activate(context: vscode.ExtensionContext) {
  FirecoderTelemetrySenderInstance.init(context);
  vscode.env.createTelemetryLogger(FirecoderTelemetrySenderInstance);
  state.global.init(context.globalState);
  state.workspace.init(context.workspaceState);

  Logger.info("FireCoder is starting.", {
    component: "main",
    sendTelemetry: true,
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "firecoder.changeInlineSuggestMode",
      async () => {
        const currentInlineSuggestModeAuto = state.workspace.get(
          "inlineSuggestModeAuto"
        );
        await state.workspace.update(
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
    const serversStarted = await Promise.all(
      [
        ...new Set([
          configuration.get("completion.autoMode"),
          configuration.get("completion.manuallyMode"),
          "chat-large" as const,
        ]),
      ].map((serverType) => servers[serverType].startServer())
    );

    if (serversStarted.some((serverStarted) => serverStarted)) {
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
