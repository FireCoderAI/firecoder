import { memo } from "react";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus as vscodeHighlightStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./styles.module.css";

export const ChatMessage = memo((props: { role: string; content: string }) => {
  const title = props.role === "ai" ? "FireCoder" : "You";
  return (
    <>
      <div className={styles["chat-message"]}>
        <div className={styles["chat-header"]}>
          <h4 className={styles["chat-title"]}>{title}</h4>
          <VSCodeButton
            appearance="icon"
            onClick={() =>
              navigator.clipboard.writeText(
                String(props.content).replace(/\n$/, "")
              )
            }
          >
            <span className="codicon codicon-copy"></span>
          </VSCodeButton>
        </div>
        <Markdown
          components={{
            code(props) {
              const { children, className, node, ...rest } = props;
              const match = /language-(\w+)/.exec(className || "");

              return match ? (
                <div className={styles["code-container"]}>
                  <div className={styles["copy-container"]}>
                    <VSCodeButton
                      appearance="icon"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          String(children).replace(/\n$/, "")
                        )
                      }
                    >
                      <span className="codicon codicon-copy"></span>
                    </VSCodeButton>
                  </div>

                  {/* @ts-ignore */}
                  <SyntaxHighlighter
                    {...rest}
                    PreTag="div"
                    children={String(children).replace(/\n$/, "")}
                    language={match[1]}
                    style={vscodeHighlightStyle}
                  />
                </div>
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
});
