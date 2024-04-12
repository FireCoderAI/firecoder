import * as vscode from "vscode";

export const getAdditionalDocuments = async () => {
  const additionalDocumentsUri = vscode.window.tabGroups.all
    .map((group) => group.tabs)
    .flat()
    .filter((tab) => !(tab.group.isActive && tab.isActive))
    .filter(
      (tab) =>
        tab.input &&
        "uri" in (tab.input as any) &&
        ((tab.input as any).uri as vscode.Uri).scheme === "file"
    )
    .map((tab) => (tab.input as any).uri as vscode.Uri);
  const additionalDocuments = await Promise.all(
    additionalDocumentsUri.map((uri) => vscode.workspace.openTextDocument(uri))
  );

  return additionalDocuments;
};
