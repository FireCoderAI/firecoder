import { useNavigate, useParams } from "react-router-dom";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { ChatMessage } from "../../components/chat-message";
import { ChatHelloMessage } from "../../components/chat-hello-message";
import { AutoScrollDown } from "../../components/auto-scroll-down";
import { useMessageListener } from "../../hooks/messageListener";
import TextArea from "../../components/text-area";
import { useChat } from "../../hooks/useChat";
import styles from "./style.module.css";
import { useSettings } from "../../hooks/useSettings";

export const ChatInstance = () => {
  const { chatId } = useParams() as { chatId?: string };

  const {
    handleSubmit,
    isLoading,
    chatMessages,
    input,
    setInput,
    startNewChat,
    stop,
  } = useChat(chatId === "new-chat" ? undefined : chatId);

  const settings = useSettings();

  useMessageListener("start-new-chat", () => {
    startNewChat();
  });

  const navigate = useNavigate();

  return (
    <div className={styles.chatRoot}>
      <div className={styles.chatBlockNavigation}>
        <VSCodeButton
          appearance="icon"
          onClick={() => navigate("/chats/history")}
        >
          <span className={"codicon codicon-arrow-left"}></span>
        </VSCodeButton>
      </div>
      <div className={styles.chatHistory}>
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
      <div className={styles.chatInputBlock}>
        <div
          className={styles.progressContainer}
          role="progressbar"
          style={{ display: isLoading ? "block" : "none" }}
        >
          <div className={styles.progressBit}></div>
        </div>
        <TextArea
          value={input}
          onChange={(value) => setInput(value || "")}
          onSubmit={
            settings.configuration.chatIsWorking ? handleSubmit : () => true
          }
          buttonEnd={
            <VSCodeButton
              appearance="icon"
              disabled={!settings.configuration.chatIsWorking}
              onClick={isLoading ? stop : handleSubmit}
            >
              <span
                className={`codicon ${
                  settings.configuration.chatIsWorking
                    ? isLoading
                      ? "codicon-debug-stop"
                      : "codicon-send"
                    : "codicon-loading codicon-modifier-spin"
                }`}
              ></span>
            </VSCodeButton>
          }
        ></TextArea>
      </div>
    </div>
  );
};
