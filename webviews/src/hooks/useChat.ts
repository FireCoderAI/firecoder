import { useCallback, useEffect, useRef, useState } from "react";
import { randomId } from "../utilities/messageId";
import { vscode } from "../utilities/vscode";
import { useChatMessages } from "./useChatMessages";

export type ChatMessage = {
  role: string;
  content: string;
  chatMessageId: string;
};

export const useChat = (chatId?: string) => {
  const { chatMessages, setChatMessages } = useChatMessages();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatIdLocal, setChatIdLocal] = useState<string>(chatId || randomId());

  const abortController = useRef(new AbortController());

  useEffect(() => {
    const getChatHistory = async () => {
      if (chatId) {
        const history = await vscode.getChatHistory(chatId);
        if (history) {
          setChatMessages(history);
        }
      }
    };
    if (chatId) {
      getChatHistory();
    }
  }, [chatId, setChatMessages]);

  const sendMessage = async (chatHistoryLocal: ChatMessage[]) => {
    const messageId = randomId();
    for await (const newMessage of vscode.startGeneration(chatHistoryLocal, {
      signal: abortController.current.signal,
    })) {
      setChatMessages((chatHistoryLocal) => {
        const messages = chatHistoryLocal.filter(
          (message) => message.chatMessageId !== messageId
        );

        const currentChatMessage = chatHistoryLocal.find(
          (message) => message.chatMessageId === messageId
        );

        return [
          ...messages,
          {
            role: "ai",
            content: (currentChatMessage?.content || "") + newMessage,
            chatMessageId: messageId,
          },
        ];
      });
    }
    setChatMessages((chatHistoryLocal) => {
      (async () => {
        await vscode.saveChatHistory(chatIdLocal, chatHistoryLocal);
      })();
      return chatHistoryLocal;
    });
    setIsLoading(false);
  };

  const handleSubmit = () => {
    if (isLoading) {
      return;
    }
    if (input === "") {
      return;
    }
    if (abortController.current.signal.aborted) {
      abortController.current = new AbortController();
    }

    setChatMessages((value) => {
      const messageId = randomId();

      const newChatMessage = [
        ...value,
        {
          role: "user",
          content: input,
          chatMessageId: messageId,
        },
      ];
      setIsLoading(true);
      sendMessage(newChatMessage);

      return newChatMessage;
    });
    setInput("");
  };

  const stop = useCallback(() => {
    abortController.current.abort();
    setIsLoading(false);
  }, [abortController]);

  const startNewChat = useCallback(() => {
    setChatMessages([]);
  }, [setChatMessages]);

  return {
    chatMessages,
    input,
    isLoading,
    setInput,
    handleSubmit,
    startNewChat,
    stop,
  };
};
