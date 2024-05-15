import { useLoaderData, useNavigate } from "react-router-dom";
import { vscode } from "../../utilities/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import styles from "./style.module.css";

export async function loader() {
  const chats = await vscode.getChats();
  return chats;
}

type LoaderReturn = Awaited<ReturnType<typeof loader>>;

const ChatsHistory = () => {
  const chats = useLoaderData() as LoaderReturn;

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
            <div className={styles.chatHistoryChatButtons}>
              <VSCodeButton
                appearance="secondary"
                onClick={() => navigate(`/chats/${chat.chatId}`)}
              >
                Open Chat
              </VSCodeButton>
              <p>
                {new Date(chat.date).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatsHistory;
