import * as vscode from "vscode";

export const delay = async (
  milliseconds: number,
  token: vscode.CancellationToken
): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const interval = setInterval(() => {
      if (token.isCancellationRequested) {
        clearInterval(interval);
        resolve(true);
      }
    }, 10);

    setTimeout(() => {
      clearInterval(interval);
      resolve(token.isCancellationRequested);
    }, milliseconds);
  });
};
