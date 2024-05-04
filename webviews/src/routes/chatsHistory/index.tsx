import { useLoaderData, useNavigate } from "react-router-dom";
import { Chat } from "../../hooks/useChat";
import { vscode } from "../../utilities/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import styles from "./style.module.css";

export async function loader() {
  const chats = await vscode.getChats();
  return chats;
}

const ChatsHistory = () => {
  const chats = useLoaderData() as Chat[];

  const navigate = useNavigate();

  return (
    <div>
      <div className={styles.chatHistoryBlockNavigation}>
        <VSCodeButton onClick={() => navigate("/chats/new-chat")}>
          Open New Chat
        </VSCodeButton>
        <VSCodeButton
          appearance="secondary"
          onClick={() => vscode.deleteChats()}
        >
          Remove All Chats
        </VSCodeButton>
      </div>
      <div className={styles.chatHistoryBlock}>
        {chats.reverse().map((chat) => (
          <div className={styles.chatHistoryChat} key={chat.chatId}>
            <h4>{chat.title}</h4>
            <VSCodeButton
              appearance="secondary"
              onClick={() => navigate(`/chats/${chat.chatId}`)}
            >
              Open Chat
            </VSCodeButton>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatsHistory;
