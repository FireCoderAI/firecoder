import * as vscode from "vscode";

export const getPrompt = (
  document: vscode.TextDocument,
  position: vscode.Position
) => {
  const textBefore = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  );
  const textAfter = document.getText(
    new vscode.Range(
      position,
      new vscode.Position(
        document.lineCount,
        document.lineAt(document.lineCount - 1).text.length
      )
    )
  );
  const textBeforeSlice = textBefore.slice(-100);
  const textAfterSlice = textAfter.slice(0, 100);
  const prompt = `<｜fim▁begin｜>${textBeforeSlice}<｜fim▁hole｜>${textAfterSlice}<｜fim▁end｜>`;

  return prompt;
};
