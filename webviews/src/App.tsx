import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import "./codicon.css";
import { ChatMessage } from "./components/ChatMessage";
import { useState } from "react";
import { ChatHelloMessage } from "./components/ChatHelloMessage";
import { useMessageListener } from "./hooks/messageListener";

export const App = () => {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    {
      role: string;
      content: string;
      chatMessageId: string;
    }[]
  >([]);

  useMessageListener("startNewChat", () => {
    setChatHistory([]);
  });

  const sendMessage = async (chatHistoryLocal: any) => {
    // @ts-ignore
    const messageId = global.crypto.randomUUID();
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

  return (
    <main>
      <div className="chat-history">
        <ChatHelloMessage />
        {chatHistory.map((item) => (
          <ChatMessage role={item.role} content={item.content} />
        ))}
      </div>
      <div className="chat-input-block">
        <VSCodeTextArea
          value={input}
          onInput={(e) => {
            // @ts-ignore
            setInput(e?.target?.value || "");
          }}
          className="chat-input"
        ></VSCodeTextArea>

        <VSCodeButton
          appearance="primary"
          onClick={() => {
            setChatHistory((value) => {
              // @ts-ignore
              const messageId = global.crypto.randomUUID();

              const newHistory = [
                ...value,
                { role: "user", content: input, chatMessageId: messageId },
              ];

              sendMessage(newHistory);

              return newHistory;
            });
            setInput("");
          }}
        >
          Submit
        </VSCodeButton>
      </div>
    </main>
  );
};
