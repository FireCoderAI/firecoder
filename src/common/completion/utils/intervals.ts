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

export const abortInterval = (token: vscode.CancellationToken) => {
  const abortController = new AbortController();

  const interval = setInterval(() => {
    if (token.isCancellationRequested) {
      abortController.abort();
      clearInterval(interval);
    }
  }, 10);

  const finish = () => {
    clearInterval(interval);
  };

  return {
    abortController,
    requestFinish: finish,
  };
};
