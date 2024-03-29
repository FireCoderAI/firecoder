import * as vscode from "vscode";
import Logger from "./common/logger";
import { servers } from "./common/server";
import statusBar from "./common/statusBar";
import { getInlineCompletionProvider } from "./common/completion";
import { FirecoderTelemetrySenderInstance } from "./common/telemetry";
import { configuration } from "./common/utils/configuration";
import { state } from "./common/utils/state";
import { ChatPanel } from "./common/panel/chat";

export async function activate(context: vscode.ExtensionContext) {
  FirecoderTelemetrySenderInstance.init(context);
  vscode.env.createTelemetryLogger(FirecoderTelemetrySenderInstance);
  state.global.init(context.globalState);
  state.workspace.init(context.workspaceState);

  Logger.info("FireCoder is starting.", {
    component: "main",
    sendTelemetry: true,
  });

  const isChatEnabled = configuration.get("experimental.chat");

  if (isChatEnabled) {
    const provider = new ChatPanel(context.extensionUri);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "firecoder.chat-gui",
        provider,
        {
          webviewOptions: { retainContextWhenHidden: true },
        }
      )
    );
    context.subscriptions.push(
      vscode.commands.registerCommand("firecoder.startNewChat", async () => {
        await provider.sendMessageToWebview("startNewChat", {});
      })
    );
  }

  statusBar.init(context);

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

  (async () => {
    if (configuration.get("cloud.use")) {
      Logger.info("Use cloud", {
        component: "main",
        sendTelemetry: true,
      });
      const InlineCompletionProvider = getInlineCompletionProvider(context);
      vscode.languages.registerInlineCompletionItemProvider(
        { pattern: "**" },
        InlineCompletionProvider
      );
    } else {
      try {
        const serversStarted = await Promise.all(
          [
            ...new Set([
              configuration.get("completion.autoMode"),
              configuration.get("completion.manuallyMode"),
              ...(isChatEnabled ? ["chat-medium" as const] : []),
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
    }

    Logger.info("FireCoder is ready.", {
      component: "main",
      sendTelemetry: true,
    });
  })();
}

export function deactivate() {
  Object.values(servers).forEach((server) => server.stopServer());
}
