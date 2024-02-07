import { useEffect } from "react";
import { vscode } from "../utilities/vscode";

export const useMessageListener = (
  command: string,
  callback: (message: any) => void
) => {
  useEffect(() => {
    vscode.addMessageListener(command, callback);
  });
};
