import * as vscode from "vscode";
import Logger from "./common/logger";
import { servers } from "./common/server";
import statusBar from "./common/statusBar";
import { getInlineCompletionProvider } from "./common/completion";
import { FirecoderTelemetrySenderInstance } from "./common/telemetry";
import { configuration } from "./common/utils/configuration";
import { state } from "./common/utils/state";
import { ChatPanel } from "./common/panel/chat";
import { tokenizer } from "./common/prompt/tokenizer";
import { login } from "./common/auth";
import { secretsStorage } from "./common/utils/secretStore";
import { getSuppabaseClient } from "./common/auth/supabaseClient";

export async function activate(context: vscode.ExtensionContext) {
  FirecoderTelemetrySenderInstance.init(context);
  vscode.env.createTelemetryLogger(FirecoderTelemetrySenderInstance);

  state.global.init(context.globalState);
  state.workspace.init(context.workspaceState);

  secretsStorage.init(context.secrets);

  Logger.info("FireCoder is starting.", {
    component: "main",
    sendTelemetry: true,
  });

  const provider = new ChatPanel(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("firecoder.chat-gui", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("firecoder.startNewChat", async () => {
      await provider.sendMessageToWebview("start-new-chat", {});
    })
  );

  statusBar.init(context);
  await tokenizer.init();

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

  if (configuration.get("cloud.use")) {
    const supabase = getSuppabaseClient();

    const data = await supabase.auth.getUser();
    if (data.error) {
      await login();
      return;
    }
  }

  vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration("firecoder.cloud.use")) {
      const cloudUse = configuration.get("cloud.use");
      const supabase = getSuppabaseClient();
      if (cloudUse === true) {
        const data = await supabase.auth.getUser();
        if (data.error) {
          await login();
          return;
        }
      }
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("firecoder.inlineSuggest", async () => {
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger"
      );
    })
  );

  const startChat = async () => {
    if (configuration.get("cloud.use") && configuration.get("cloud.chat.use")) {
      Logger.info("Use cloud for chat.", {
        component: "main",
        sendTelemetry: true,
      });
    } else if (configuration.get("local.chat.use")) {
      Logger.info("Use local for chat.", {
        component: "main",
        sendTelemetry: true,
      });
      try {
        await servers["chat-medium"].startServer();
      } catch (error) {
        vscode.window.showErrorMessage((error as Error).message);
        Logger.error(error, {
          component: "server",
          sendTelemetry: true,
        });
      }
      Logger.info("Chat is ready to start.", {
        component: "main",
        sendTelemetry: true,
      });
    } else {
      Logger.info("Chat is not enable", {
        component: "main",
        sendTelemetry: true,
      });
    }
  };

  const startCompletion = async (registerCompletionProvider: boolean) => {
    if (
      configuration.get("cloud.use") &&
      configuration.get("cloud.autocomplete.use")
    ) {
      Logger.info("Use cloud for auto completions.", {
        component: "main",
        sendTelemetry: true,
      });
    } else {
      Logger.info("Use local for auto completions.", {
        component: "main",
        sendTelemetry: true,
      });
      try {
        const serversStarted = await Promise.all(
          [
            ...new Set([
              configuration.get("completion.autoMode"),
              configuration.get("completion.manuallyMode"),
            ]),
          ].map((serverType) => servers[serverType].startServer())
        );

        if (serversStarted.some((serverStarted) => serverStarted)) {
          Logger.info("Servers inited", {
            component: "main",
            sendTelemetry: true,
          });
        }
      } catch (error) {
        vscode.window.showErrorMessage((error as Error).message);
        Logger.error(error, {
          component: "server",
          sendTelemetry: true,
        });
      }
    }
    if (registerCompletionProvider) {
      const InlineCompletionProvider = getInlineCompletionProvider(context);
      vscode.languages.registerInlineCompletionItemProvider(
        { pattern: "**" },
        InlineCompletionProvider
      );
    }
  };

  (async () => {
    await Promise.all([startChat(), startCompletion(true)]);

    Logger.info("FireCoder is ready.", {
      component: "main",
      sendTelemetry: true,
    });
  })();

  vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (
      event.affectsConfiguration("firecoder.cloud.use") ||
      event.affectsConfiguration("firecoder.cloud.chat.use") ||
      event.affectsConfiguration("firecoder.cloud.autocomplete.use") ||
      event.affectsConfiguration("firecoder.local.chat.use") ||
      event.affectsConfiguration("firecoder.completion.manuallyMode") ||
      event.affectsConfiguration("firecoder.completion.autoMode") ||
      event.affectsConfiguration(
        "firecoder.experimental.useGpu.linux.nvidia"
      ) ||
      event.affectsConfiguration("firecoder.experimental.useGpu.osx.metal") ||
      event.affectsConfiguration(
        "firecoder.experimental.useGpu.windows.nvidia"
      ) ||
      event.affectsConfiguration("firecoder.server.usePreRelease")
    ) {
      Object.values(servers).forEach((server) => server.stopServer());
      await Promise.all([startChat(), startCompletion(false)]);
    }
  });
}

export function deactivate() {
  Object.values(servers).forEach((server) => server.stopServer());
}
