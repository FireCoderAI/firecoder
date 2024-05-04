import { useState } from "react";
import { ChatMessage } from "./useChat";

export const useChatMessages = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  return {
    chatMessages,
    setChatMessages,
  };
};
