import { VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import "./Component.css";

export const ChatMessage = (props: { role: string; content: string }) => {
  return (
    <>
      <div className="chat-message">
        <h4>{props.role}</h4>
        <p>{props.content}</p>
      </div>
      <VSCodeDivider />
    </>
  );
};
