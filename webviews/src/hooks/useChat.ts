import { useCallback, useState } from "react";
import { randomMessageId } from "../utilities/messageId";
import { vscode } from "../utilities/vscode";

export const useChat = () => {
  const [chatMessages, setChatMessages] = useState<
    {
      role: string;
      content: string;
      chatMessageId: string;
    }[]
  >([]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    if (isLoading) {
      return;
    }
    if (input === "") {
      return;
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

  const sendMessage = async (chatHistoryLocal: any) => {
    const messageId = randomMessageId();
    await vscode.postMessageCallback(
      {
        type: "sendMessage",
        data: chatHistoryLocal,
      },
      (newMessage) => {
        setChatMessages((chatHistoryLocal) => {
          const messages = chatHistoryLocal.filter(
            (message) => message.chatMessageId !== messageId
          );

          const currentChatMessage = chatHistoryLocal.find(
            (message) => message.chatMessageId === messageId
          );

          if (newMessage.done) {
            setIsLoading(false);
            return chatHistoryLocal;
          }

          return [
            ...messages,
            {
              role: "ai",
              content: (currentChatMessage?.content || "") + newMessage.data,
              chatMessageId: messageId,
            },
          ];
        });
      }
    );
  };

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
  };
};
