import { Disposable, Webview, Uri } from "vscode";
import * as vscode from "vscode";
import { getUri } from "../utils/getUri";
import { getNonce } from "../utils/getNonce";
import { chat } from "../chat";
import { ChatMessage } from "../prompt/promptChat";

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
      command: string;
      done: boolean;
      data: any;
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
      async (message: any) => {
        if (message.type in this.messageCallback) {
          this.messageCallback[message.type]();
          return;
        }
        const type = message.type;

        switch (type) {
          case "sendMessage":
            await this.handleStartGeneration({
              chatMessage: message.data,
              messageId: message.messageId,
              messageType: message.type,
            });
            return;
        }
      },
      undefined,
      this.disposables
    );
  }

  private addMessageListener(
    commandOrMessageId: string,
    callback: (message: any) => void
  ) {
    this.messageCallback[commandOrMessageId] = callback;
  }

  private async handleStartGeneration({
    messageId,
    messageType,
    chatMessage,
  }: {
    messageId: string;
    messageType: string;
    chatMessage: ChatMessage[];
  }) {
    const sendResponse = (messageToResponse: any, done: boolean) => {
      this.postMessage({
        type: "e2w-response",
        id: messageId,
        command: messageType,
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

  public async sendMessageToWebview(
    command: MessageType["command"],
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

  private async postMessage(message: MessageType) {
    await this.webview?.postMessage(message);
  }
}
