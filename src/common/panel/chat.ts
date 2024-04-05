import { Disposable, Webview, window, Uri } from "vscode";
import * as vscode from "vscode";
import { getUri } from "../utils/getUri";
import { getNonce } from "../utils/getNonce";
import { chat } from "../chat";

export type MessageType =
  | {
      type: "e2w";
      command: string;
      done: boolean;
      data: any;
    }
  | {
      type: "e2w-response";
      command: string;
      messageId: string;
      done: boolean;
      data: any;
    };

export class ChatPanel implements vscode.WebviewViewProvider {
  private disposables: Disposable[] = [];
  private webview: Webview | undefined;

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
        const sendResponse = (messageToResponse: any, done: boolean) => {
          this.postMessage({
            type: "e2w-response",
            command: message.type,
            messageId: message.messageId,
            data: messageToResponse,
            done: done,
          });
        };
        const type = message.type;
        const data = message.data;

        switch (type) {
          case "sendMessage":
            for await (const message of chat(data, {
              provideHighlightedText: true,
            })) {
              sendResponse(message, false);
            }
            sendResponse("", true);
            return;
        }
      },
      undefined,
      this.disposables
    );
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
