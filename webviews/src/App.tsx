import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import { ChatMessage } from "./components/ChatMessage";
import { useState } from "react";

export const App = () => {
  function handleHowdyClick() {
    vscode.postMessage({
      command: "hello",
      text: "Hey there partner! 🤠",
    });
  }

  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      role: "user",
      content: "just message",
    },
    {
      role: "ai",
      content: "just message",
    },
  ]);

  return (
    <main>
      <div className="chat-history">
        {chatHistory.map((item) => (
          <ChatMessage role={item.role} content={item.content}></ChatMessage>
        ))}
      </div>
      <div
        className="chat-input"
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
        ></VSCodeTextArea>
        <VSCodeButton
          appearance="primary"
          onClick={() => {
            setChatHistory((value) => [
              ...value,
              { role: "user", content: input },
            ]);
            setInput("");
          }}
        >
          Button Text
        </VSCodeButton>
      </div>
    </main>
  );
};
