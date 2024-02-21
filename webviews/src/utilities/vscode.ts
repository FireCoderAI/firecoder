import type { WebviewApi } from "vscode-webview";
import { randomMessageId } from "./messageId";

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

class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;
  private messageCallback: Record<string, any> = {};

  constructor() {
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
    window.addEventListener("message", (message) => {
      const newMessage = (message as MessageEvent<MessageType>).data;

      if (
        newMessage.type === "e2w-response" &&
        newMessage.messageId in this.messageCallback
      ) {
        this.messageCallback[newMessage.messageId](newMessage);
        return;
      }

      if (
        newMessage.type === "e2w" &&
        newMessage.command in this.messageCallback
      ) {
        this.messageCallback[newMessage.command](newMessage);
        return;
      }
    });
  }

  public async postMessageCallback(
    message: { type: string; data: any },
    messageCallback?: (message: any) => void
  ) {
    if (this.vsCodeApi) {
      const messageId = randomMessageId();
      if (messageCallback) {
        this.addMessageListener(messageId, messageCallback);
      }
      this.vsCodeApi.postMessage({
        ...message,
        messageId,
      });
    } else {
      console.log(message);
    }
  }
  public addMessageListener(
    commandOrMessageId: string,
    callback: (message: any) => void
  ) {
    this.messageCallback[commandOrMessageId] = callback;
  }
}

export const vscode = new VSCodeAPIWrapper();
