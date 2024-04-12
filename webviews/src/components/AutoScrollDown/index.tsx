import { memo, useEffect, useRef } from "react";

interface MessageProps {
  role: string;
  content: string;
}

interface AutoScrollDownProps {
  chatMessages: Array<MessageProps>;
}

export const AutoScrollDown: React.FC<AutoScrollDownProps> = memo(
  ({ chatMessages }) => {
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Scroll to bottom when the 'chatMessages' prop changes
    useEffect(() => {
      scrollToBottom();
    }, [chatMessages]);

    const scrollToBottom = () => {
      if (messagesEndRef.current)
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return <div ref={messagesEndRef} />;
  }
);
