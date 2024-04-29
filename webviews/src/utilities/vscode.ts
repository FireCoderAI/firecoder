import type { WebviewApi } from "vscode-webview";
import { randomId } from "./messageId";
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
      type: "get-chat-history";
      chatId: string;
    }
  | {
      type: "save-chat-history";
      chatId: string;
      data: ChatMessage[];
    }
  | {
      type: "get-chats";
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
    message: MessageToExtention,
    messageCallback?: (message: any) => void,
    config?: { signal?: AbortSignal }
  ) {
    if (this.vsCodeApi) {
      const id = randomId();
      if (messageCallback) {
        this.addMessageListener(id, messageCallback);
      }

      config?.signal?.addEventListener("abort", () => {
        this.abortOperation();
      });

      this.vsCodeApi.postMessage({
        ...message,
        id,
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
        type: "send-message",
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

  public getChatHistory(chatId: string) {
    return new Promise<ChatMessage[] | null>((resolve) => {
      this.postMessageCallback(
        {
          type: "get-chat-history",
          chatId: chatId,
        },
        (message) => {
          resolve(message.data);
        }
      );
    });
  }

  public saveChatHistory(chatId: string, history: ChatMessage[]) {
    return new Promise<void>((resolve) => {
      this.postMessageCallback(
        {
          type: "save-chat-history",
          chatId: chatId,
          data: history,
        },
        (message) => {
          resolve(message.data);
        }
      );
    });
  }

  public getChats() {
    return new Promise<ChatMessage[][]>((resolve) => {
      this.postMessageCallback({
        type: "get-chats",
      });
    });
  }

  public addMessageListener(
    commandOrMessageId: string,
    callback: (message: any) => void
  ) {
    this.messageCallback[commandOrMessageId] = callback;
  }

  private abortOperation() {
    this.vsCodeApi?.postMessage({
      type: "abort-generate",
    });
  }
}

export const vscode = new VSCodeAPIWrapper();
