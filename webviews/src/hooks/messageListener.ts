import { useEffect } from "react";
import { vscode } from "../utilities/vscode";

export const useMessageListener = (
  command: "startNewChat",
  callback: (message: any) => void
) => {
  useEffect(() => {
    vscode.addMessageListener(command, callback);
  });
};
