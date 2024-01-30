import type { WebviewApi } from "vscode-webview";

class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;
  private messageCallback: Record<string, any> = {};

  constructor() {
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
    window.addEventListener("message", (message) => {
      if (message?.data?.messageId in this.messageCallback) {
        this.messageCallback[message?.data?.messageId](message?.data?.data);
      }
    });
  }

  private async response(messageId: string) {
    return new Promise((res, rej) => {
      this.messageCallback[messageId] = res;
    });
  }

  public async postMessage(message: { type: string; data: any }) {
    if (this.vsCodeApi) {
      // @ts-ignore
      const messageId = global.crypto.randomUUID();
      this.vsCodeApi.postMessage({
        ...message,
        messageId,
      });
      return await this.response(messageId);
    } else {
      console.log(message);
    }
  }

  private async *responseGenerator(messageId: string) {
    while (true) {
      // @ts-ignore
      const message = yield;
      if (message?.data?.messageId === messageId) {
        debugger;
        yield message.data;
      }
    }
  }

  public async postMessageGenerator(
    message: { type: string; data: any },
    messageCallback: (message: any) => void
  ) {
    if (this.vsCodeApi) {
      window.addEventListener("message", (message) => {
        if (message?.data?.messageId === messageId) {
          messageCallback(message?.data);
        }
      });
      // @ts-ignore
      const messageId = global.crypto.randomUUID();
      this.vsCodeApi.postMessage({
        ...message,
        messageId,
      });
    } else {
      console.log(message);
    }
  }
}

export const vscode = new VSCodeAPIWrapper();
