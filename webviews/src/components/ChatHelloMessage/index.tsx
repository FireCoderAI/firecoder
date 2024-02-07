import { ChatMessage } from "../ChatMessage";

const ChatHelloMessageContent = `
Hello! I'm FireCoder, your friendly AI assistant.\n
I'm here to help you with your coding questions. Feel free to ask me anything!
`;

export const ChatHelloMessage = () => {
  return <ChatMessage role="ai" content={ChatHelloMessageContent} />;
};
