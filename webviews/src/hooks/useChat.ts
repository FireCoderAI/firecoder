import { useCallback, useRef, useState } from "react";
import { randomMessageId } from "../utilities/messageId";
import { vscode } from "../utilities/vscode";

export type ChatMessage = {
  role: string;
  content: string;
  chatMessageId: string;
};

export const useChat = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const abortController = useRef(new AbortController());

  const sendMessage = async (chatHistoryLocal: ChatMessage[]) => {
    const messageId = randomMessageId();
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
      const messageId = randomMessageId();

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
  }, []);

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
