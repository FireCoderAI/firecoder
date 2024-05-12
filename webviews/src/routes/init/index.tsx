import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import styles from "./style.module.css";
import { vscode } from "../../utilities/vscode";
import { useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { Navigate } from "react-router-dom";

export default function Init() {
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const settings = useSettings();

  if (settings.configuration.chatEnabled) {
    return <Navigate to="/chats/new-chat" />;
  }

  return (
    <div className={styles.init}>
      <h3>
        FireCoder Chat is currently disabled. Please enable it to start
        chatting.
      </h3>
      <p>
        FireCoder needs to download the chat model and save it to your device's
        local storage.
        <br />
        This model is quite large, around 6GB, so the download may take a few
        minutes.
      </p>
      <VSCodeButton
        disabled={isChatEnabled}
        onClick={() => {
          setIsChatEnabled(true);
          vscode.enableChat();
        }}
      >
        Enable
        {isChatEnabled ? (
          <span
            slot="start"
            className="codicon codicon-loading codicon-modifier-spin"
          ></span>
        ) : (
          <span
            slot="start"
            className="codicon codicon-desktop-download"
          ></span>
        )}
      </VSCodeButton>
    </div>
  );
}
