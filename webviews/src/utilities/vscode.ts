import type { WebviewApi } from "vscode-webview";
import { randomMessageId } from "./messageId";
import { ChatMessage } from "../hooks/useChat";
import { Transform } from "./transformCallback2AsyncGenerator";

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
      id: string;
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
        newMessage.id in this.messageCallback
      ) {
        this.messageCallback[newMessage.id](newMessage);
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

  public postMessageCallback(
    message: { type: string; data: any },
    messageCallback?: (message: any) => void,
    config?: { signal?: AbortSignal }
  ) {
    if (this.vsCodeApi) {
      const messageId = randomMessageId();
      if (messageCallback) {
        this.addMessageListener(messageId, messageCallback);
      }

      config?.signal?.addEventListener("abort", () => {
        this.abortOperation(messageId);
      });

      this.vsCodeApi.postMessage({
        ...message,
        messageId,
      });
    } else {
      console.log(message);
    }
  }

  public startGeneration(
    chatHistory: ChatMessage[],
    config?: {
      signal: AbortSignal;
    }
  ) {
    const transform = new Transform<string>();
    this.postMessageCallback(
      {
        data: chatHistory,
        type: "sendMessage",
      },
      (message) => {
        if (message.done) {
          transform.close();
        } else {
          transform.push(message.data);
        }
      },
      {
        signal: config?.signal,
      }
    );

    return transform.stream();
  }

  public addMessageListener(
    commandOrMessageId: string,
    callback: (message: any) => void
  ) {
    this.messageCallback[commandOrMessageId] = callback;
  }

  private abortOperation(messageId: string) {
    this.vsCodeApi?.postMessage({
      type: "abort-generate",
      id: messageId,
    });
  }
}

export const vscode = new VSCodeAPIWrapper();
