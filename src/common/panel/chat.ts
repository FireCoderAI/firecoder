import { Disposable, Webview, Uri } from "vscode";
import * as vscode from "vscode";
import { getUri } from "../utils/getUri";
import { getNonce } from "../utils/getNonce";
import { chat } from "../chat";
import { Chat, ChatMessage } from "../prompt/promptChat";
import { state } from "../utils/state";
import { configuration } from "../utils/configuration";
import { TypeModelsChat, modelsChat, servers } from "../server";
import { getSuppabaseClient } from "../auth/supabaseClient";

export type MessageType =
  | {
      type: "e2w";
      command: string;
      done: boolean;
      data: any;
    }
  | {
      type: "e2w-response";
      id: string;
      done: boolean;
      data: any;
    };

type MessageToExtention =
  | {
      type: "send-message";
      data: ChatMessage[];
    }
  | {
      type: "abort-generate";
      id: string;
    }
  | {
      type: "get-settings";
    }
  | {
      type: "enable-chat";
    }
  | {
      type: "get-chat";
      chatId: string;
    }
  | {
      type: "save-chat";
      chatId: string;
      data: Chat;
    }
  | {
      type: "get-chats";
    }
  | {
      type: "delete-chat";
      chatId: string;
    }
  | {
      type: "delete-chats";
    };

type MessageFromWebview = MessageToExtention & {
  id: string;
};

export class ChatPanel implements vscode.WebviewViewProvider {
  private disposables: Disposable[] = [];
  private webview: Webview | undefined;
  private messageCallback: Record<string, any> = {};

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this.webview = webviewView.webview;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getWebviewContent(
      webviewView.webview,
      this.extensionUri
    );
    this.setWebviewMessageListener(webviewView.webview);
    webviewView.show();
  }

  private getWebviewContent(webview: Webview, extensionUri: Uri) {
    const stylesUri = getUri(webview, extensionUri, [
      "webviews",
      "build",
      "static",
      "css",
      "main.css",
    ]);

    const scriptUri = getUri(webview, extensionUri, [
      "webviews",
      "build",
      "static",
      "js",
      "main.js",
    ]);

    const codiconFontUri = getUri(webview, extensionUri, [
      "webviews",
      "build",
      "codicon.ttf",
    ]);

    const codiconStyleUri = getUri(webview, extensionUri, [
      "webviews",
      "build",
      "codicon.css",
    ]);

    const nonce = getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <meta http-equiv="Content-Security-Policy" content="unsafe-inline; default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" href="${codiconStyleUri}">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>FireCoder Chat</title>
        </head>
        <body>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="root"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  private setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      async (message: MessageFromWebview) => {
        if (message.type in this.messageCallback) {
          this.messageCallback[message.type]();
          return;
        }

        const type = message.type;

        switch (type) {
          case "send-message":
            await this.handleStartGeneration({
              id: message.id,
              chatMessage: message.data,
            });
            break;
          case "get-chat":
            await this.handleGetChat({
              id: message.id,
              chatId: message.chatId,
            });
            break;
          case "save-chat":
            await this.handleSaveChat({
              id: message.id,
              chatId: message.chatId,
              history: message.data,
            });
            break;
          case "delete-chat":
            await this.handleDeleteChat({
              id: message.id,
              chatId: message.chatId,
            });
            break;
          case "delete-chats":
            await this.handleDeleteChats({
              id: message.id,
            });
            break;
          case "get-chats":
            await this.handleGetChats({
              id: message.id,
            });
            break;
          case "get-settings":
            await this.handleGetSettings({
              id: message.id,
            });
            break;
          case "enable-chat":
            await this.handleEnableChat({
              id: message.id,
            });
            break;
          default:
            break;
        }
      },
      undefined,
      this.disposables
    );
  }

  private async handleStartGeneration({
    id,
    chatMessage,
  }: {
    id: string;
    chatMessage: ChatMessage[];
  }) {
    const sendResponse = (messageToResponse: string, done: boolean) => {
      this.postMessage({
        type: "e2w-response",
        id: id,
        data: messageToResponse,
        done: done,
      });
    };
    const abortController = new AbortController();

    this.addMessageListener("abort-generate", () => {
      abortController.abort();
    });

    for await (const message of chat(chatMessage, {
      provideHighlightedText: true,
      abortController,
    })) {
      sendResponse(message, false);
    }

    sendResponse("", true);
  }

  private async handleGetSettings({ id }: { id: string }) {
    const settigns = await this.getSettings();

    await this.postMessage({
      type: "e2w-response",
      id: id,
      data: settigns,
      done: true,
    });
  }

  private async getSettings() {
    const cloudUsing = configuration.get("cloud.use");
    const cloudChatUsing = configuration.get("cloud.chat.use");
    const chatServerIsWorking = Object.keys(modelsChat)
      .map(
        (chatModel) => servers[chatModel as TypeModelsChat].status === "started"
      )
      .some((serverIsWorking) => serverIsWorking);

    const localChatUsing = configuration.get("local.chat.use");
    const supabase = getSuppabaseClient();
    const sesssion = await supabase.auth.getSession();
    const userLoggined = sesssion.data.session ? true : false;

    const chatEnabled = localChatUsing || (cloudUsing && cloudChatUsing);
    const chatIsWorking =
      (cloudUsing && cloudChatUsing && userLoggined) ||
      (chatServerIsWorking && localChatUsing);

    return {
      chatEnabled: chatEnabled,
      chatIsWorking: chatIsWorking,
      userLoggined: userLoggined,
    };
  }

  private async handleGetChat({ chatId, id }: { chatId: string; id: string }) {
    const sendResponse = (messageToResponse: Chat | null, done: boolean) => {
      this.postMessage({
        type: "e2w-response",
        id: id,
        data: messageToResponse,
        done: done,
      });
    };

    const history = state.global.get(`chat-${chatId}`);
    if (history) {
      sendResponse(history, true);
    } else {
      sendResponse(null, true);
    }
  }

  private async handleSaveChat({
    chatId,
    history,
    id,
  }: {
    chatId: string;
    history: Chat;
    id: string;
  }) {
    await state.global.update(`chat-${chatId}`, history);
    await this.postMessage({
      type: "e2w-response",
      id: id,
      data: "",
      done: true,
    });
  }

  private async handleDeleteChat({
    chatId,
    id,
  }: {
    chatId: string;
    id: string;
  }) {
    await state.global.delete(`chat-${chatId}`);
    await this.postMessage({
      type: "e2w-response",
      id: id,
      data: "",
      done: true,
    });
  }

  private async handleDeleteChats({ id }: { id: string }) {
    await state.global.deleteChats();
    await this.postMessage({
      type: "e2w-response",
      id: id,
      data: true,
      done: true,
    });
  }

  private async handleEnableChat({ id }: { id: string }) {
    await configuration.set("local.chat.use", true);
    await this.postMessage({
      type: "e2w-response",
      id: id,
      data: true,
      done: true,
    });
  }

  private async handleGetChats({ id }: { id: string }) {
    const chats = state.global.getChats();
    await this.postMessage({
      type: "e2w-response",
      id: id,
      data: chats,
      done: true,
    });
  }

  private addMessageListener(
    commandOrMessageId: string,
    callback: (message: any) => void
  ) {
    this.messageCallback[commandOrMessageId] = callback;
  }

  private async postMessage(message: MessageType) {
    await this.webview?.postMessage(message);
  }

  public async sendMessageToWebview(
    command: string,
    data: MessageType["data"]
  ) {
    const message: MessageType = {
      type: "e2w",
      command,
      data,
      done: true,
    };
    await this.postMessage(message);
  }
}
