import { VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus as vscodeHighlightStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./styles.module.css";

export const ChatMessage = (props: { role: string; content: string }) => {
  const title = props.role === "ai" ? "FireCoder" : "You";
  return (
    <>
      <div className={styles["chat-message"]}>
        <h4>{title}</h4>
        <Markdown
          components={{
            code(props) {
              const { children, className, node, ...rest } = props;
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                // @ts-ignore
                <SyntaxHighlighter
                  {...rest}
                  PreTag="div"
                  children={String(children).replace(/\n$/, "")}
                  language={match[1]}
                  style={vscodeHighlightStyle}
                />
              ) : (
                <code {...rest} className={className}>
                  {children}
                </code>
              );
            },
          }}
        >
          {props.content}
        </Markdown>
      </div>
      <VSCodeDivider />
    </>
  );
};
