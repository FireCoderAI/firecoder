import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import { ChatMessage } from "./components/ChatMessage";
import { ChatHelloMessage } from "./components/ChatHelloMessage";
import { AutoScrollDown } from "./components/AutoScrollDown";
import { useMessageListener } from "./hooks/messageListener";
import TextArea from "./components/TextArea";
import { useChat } from "./hooks/useChat";

export const App = () => {
  const {
    handleSubmit,
    isLoading,
    chatMessages,
    input,
    setInput,
    startNewChat,
    stop,
  } = useChat();

  useMessageListener("startNewChat", () => {
    startNewChat();
  });

  return (
    <>
      <main>
        <div className="chat-history">
          <ChatHelloMessage />
          {chatMessages.map((message) => (
            <ChatMessage
              key={message.chatMessageId}
              role={message.role}
              content={message.content}
            />
          ))}
          <AutoScrollDown chatMessages={chatMessages} />
        </div>
        <div className="chat-input-block">
          <div
            className="progress-container"
            role="progressbar"
            style={{ display: isLoading ? "block" : "none" }}
          >
            <div className="progress-bit"></div>
          </div>
          <TextArea
            value={input}
            onChange={(value) => setInput(value || "")}
            onSubmit={handleSubmit}
            buttonEnd={
              <VSCodeButton
                appearance="icon"
                onClick={isLoading ? stop : handleSubmit}
              >
                <span
                  className={`codicon ${
                    isLoading ? "codicon-debug-stop" : "codicon-send"
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
