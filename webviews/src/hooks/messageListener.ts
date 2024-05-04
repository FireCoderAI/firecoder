import { useEffect } from "react";
import { vscode } from "../utilities/vscode";

export const useMessageListener = (
  command: "start-new-chat",
  callback: (message: any) => void
) => {
  useEffect(() => {
    const removeCallback = vscode.addMessageListener(command, callback);
    return () => {
      removeCallback();
    };
  }, [command]);
};
