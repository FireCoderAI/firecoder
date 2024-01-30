import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import "./codicon.css";
import { ChatMessage } from "./components/ChatMessage";
import { useState } from "react";

export const App = () => {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    {
      role: string;
      content: string;
      chatMessageId: string;
    }[]
  >([]);

  const handleHowdyClick = async (chatHistoryLocal: any) => {
    // @ts-ignore
    const messageId = global.crypto.randomUUID();
    await vscode.postMessageGenerator(
      {
        type: "sendMessage",
        data: chatHistoryLocal,
      },
      (newMessage) => {
        console.log(newMessage);
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
    // for await (const newMessage of vscode.postMessageGenerator({
    //   type: "sendMessage",
    //   data: chatHistoryLocal,
    // })) {
    //   console.log(newMessage);
    //   setChatHistory((chatHistoryLocal) => {
    //     const messages = chatHistoryLocal.filter(
    //       (message) => message.chatMessageId !== messageId
    //     );
    //     return [...messages, { ...newMessage, messageId } as any];
    //   });
    // }
  };

  return (
    <main>
      <div className="chat-history">
        {chatHistory.map((item) => (
          <ChatMessage role={item.role} content={item.content}></ChatMessage>
        ))}
      </div>
      <div
        className="chat-input-block"
        onSubmit={() => {
          // setChatHistory((value) => [
          //   ...value,
          //   { role: "user", content: input },
          // ]);
          // setInput("");
        }}
      >
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

              handleHowdyClick(newHistory);

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
