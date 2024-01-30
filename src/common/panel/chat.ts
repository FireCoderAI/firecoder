import { Disposable, Webview, window, Uri } from "vscode";
import * as vscode from "vscode";
import { getUri } from "../utils/getUri";
import { getNonce } from "../utils/getNonce";
import { chat } from "../chat";

export class ChatPanel implements vscode.WebviewViewProvider {
  private disposables: Disposable[] = [];

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
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
      "webview-ui",
      "build",
      "assets",
      "codicon.ttf",
    ]);

    const nonce = getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>FireCoder Chat</title>
          <style nonce="${nonce}">
            @font-face {
              font-family: "codicon";
              font-display: block;
              src: url("${codiconFontUri}") format("truetype");
            }
          </style>
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
        const sendResponse = (messageToResponse: any) => {
          webview.postMessage({
            messageId: message.messageId,
            data: messageToResponse,
          });
        };
        const type = message.type;
        const data = message.data;

        switch (type) {
          case "sendMessage":
            for await (const message of chat(data)) {
              sendResponse(message);
            }
            return;
        }
      },
      undefined,
      this.disposables
    );
  }
}
