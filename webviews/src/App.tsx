import { vscode } from "./utilities/vscode";
import {
  VSCodeButton,
  VSCodeProgressRing,
  VSCodeTextArea,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import "./App.css";
// import "./codicon.css";
import { ChatMessage } from "./components/ChatMessage";
import { useState } from "react";
import { ChatHelloMessage } from "./components/ChatHelloMessage";
import { useMessageListener } from "./hooks/messageListener";
import { randomMessageId } from "./utilities/messageId";
import TextArea from "./components/TextArea";
// import ProgressDivider from "./components/VsCodeDividerProgress";

export const App = () => {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    {
      role: string;
      content: string;
      chatMessageId: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useMessageListener("startNewChat", () => {
    setChatHistory([]);
  });

  const sendMessage = async (chatHistoryLocal: any) => {
    const messageId = randomMessageId();
    await vscode.postMessageCallback(
      {
        type: "sendMessage",
        data: chatHistoryLocal,
      },
      (newMessage) => {
        setChatHistory((chatHistoryLocal) => {
          const messages = chatHistoryLocal.filter(
            (message) => message.chatMessageId !== messageId
          );

          if (newMessage.done) {
            setIsLoading(false);
            return chatHistoryLocal;
          }

          return [
            ...messages,
            {
              role: "ai",
              content: newMessage.data,
              chatMessageId: messageId,
            } as any,
          ];
        });
      }
    );
  };

  const onSubmit = () => {
    if (isLoading) {
      return;
    }
    setChatHistory((value) => {
      const messageId = randomMessageId();

      const newHistory = [
        ...value,
        {
          role: "user",
          content: input,
          chatMessageId: messageId,
        },
      ];
      setIsLoading(true);
      sendMessage(newHistory);

      return newHistory;
    });
    setInput("");
  };

  return (
    <>
      <main>
        <div className="chat-history">
          <ChatHelloMessage />
          {chatHistory.map((item) => (
            <ChatMessage role={item.role} content={item.content} />
          ))}
        </div>
        <div className="chat-input-block">
          <TextArea
            value={input}
            onChange={(value) => setInput(value || "")}
            onSubmit={onSubmit}
            buttonEnd={
              <VSCodeButton
                appearance="icon"
                disabled={isLoading}
                onClick={onSubmit}
              >
                <span
                  className={`codicon ${
                    isLoading
                      ? "codicon-loading codicon-modifier-spin codicon-modifier-disabled"
                      : "codicon-send"
                  }`}
                ></span>
              </VSCodeButton>
            }
          ></TextArea>
        </div>
      </main>
    </>
  );
};
