import * as vscode from "vscode";

export const createProgress = (title: string, messageInit: string) => {
  let progressValue = 0;
  let message = messageInit;
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: title,
      cancellable: false,
    },
    (progress) => {
      return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (progressValue >= 100) {
            clearInterval(interval);
            resolve();
          } else {
            progress.report({
              increment: progressValue,
              message: message,
            });
            progressValue = 0;
          }
        }, 200);
      });
    }
  );

  const increaseProgress = (increment: number) => {
    progressValue += increment;
    if (progressValue > 100) {
      progressValue = 100;
    }
  };

  const setProgress = (newProgress: number) => {
    progressValue = newProgress;
  };

  const finishProgress = () => {
    progressValue = 100;
  };

  const setMessage = (newMessage: string) => {
    message = newMessage;
  };

  return { increaseProgress, finishProgress, setMessage, setProgress };
};
