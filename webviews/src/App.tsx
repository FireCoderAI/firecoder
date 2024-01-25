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
    }[]
  >([]);

  const handleHowdyClick = async (chatHistoryLocal: any) => {
    const newMessage = await vscode.postMessage({
      type: "sendMessage",
      data: chatHistoryLocal,
    });
    setChatHistory((value) => [...value, newMessage as any]);
    console.log(newMessage);
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
          setChatHistory((value) => [
            ...value,
            { role: "user", content: input },
          ]);
          setInput("");
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
              const newHistory = [...value, { role: "user", content: input }];

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
