import type { WebviewApi } from "vscode-webview";
import { randomId } from "./messageId";
import { Chat, ChatMessage } from "../hooks/useChat";
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

class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;
  private messageCallback: Record<
    string,
    Record<string, (...messages: any) => any>
  > = {};

  constructor() {
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
    window.addEventListener("message", (message) => {
      const newMessage = (message as MessageEvent<MessageType>).data;

      const callCallbacks = (commandOrMessageId: string, message: any) => {
        if (commandOrMessageId in this.messageCallback) {
          const callbacks = Object.values(
            this.messageCallback[commandOrMessageId]
          );
          callbacks.forEach((callback) => {
            callback(newMessage);
          });
        }
      };

      if (
        newMessage.type === "e2w-response" &&
        newMessage.id in this.messageCallback
      ) {
        callCallbacks(newMessage.id, newMessage);
        return;
      }

      if (
        newMessage.type === "e2w" &&
        newMessage.command in this.messageCallback
      ) {
        callCallbacks(newMessage.command, newMessage);
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

  public getChat(chatId: string) {
    return new Promise<Chat | null>((resolve) => {
      this.postMessageCallback(
        {
          type: "get-chat",
          chatId: chatId,
        },
        (message) => {
          resolve(message.data);
        }
      );
    });
  }

  public getSettings() {
    return new Promise<{
      chatEnabled: boolean;
      userLoggined: boolean;
    }>((resolve) => {
      this.postMessageCallback(
        {
          type: "get-settings",
        },
        (message) => {
          resolve(message.data);
        }
      );
    });
  }

  public enableChat() {
    return new Promise<void>((resolve) => {
      this.postMessageCallback(
        {
          type: "enable-chat",
        },
        (message) => {
          resolve(message.data);
        }
      );
    });
  }

  public saveChatHistory(chatId: string, history: Chat) {
    return new Promise<void>((resolve) => {
      this.postMessageCallback(
        {
          type: "save-chat",
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
    return new Promise<Chat[]>((resolve) => {
      this.postMessageCallback(
        {
          type: "get-chats",
        },
        (message) => {
          resolve(message.data);
        }
      );
    });
  }

  public deleteChat(chatId: string) {
    return new Promise<void>((resolve) => {
      this.postMessageCallback(
        {
          type: "delete-chat",
          chatId: chatId,
        },
        (message) => {
          resolve(message.data);
        }
      );
    });
  }

  public deleteChats() {
    return new Promise<void>((resolve) => {
      this.postMessageCallback(
        {
          type: "delete-chats",
        },
        (message) => {
          resolve(message.data);
        }
      );
    });
  }

  public addMessageListener(
    commandOrMessageId: string,
    callback: (message: any) => void
  ) {
    const callbackId = randomId();
    if (commandOrMessageId in this.messageCallback) {
      this.messageCallback[commandOrMessageId][callbackId] = callback;
    } else {
      this.messageCallback[commandOrMessageId] = {
        [callbackId]: callback,
      };
    }
    // remove callback on dispose
    return () => {
      if (commandOrMessageId in this.messageCallback) {
        delete this.messageCallback[commandOrMessageId][callbackId];
      }
    };
  }

  private abortOperation() {
    this.vsCodeApi?.postMessage({
      type: "abort-generate",
    });
  }
}

export const vscode = new VSCodeAPIWrapper();
