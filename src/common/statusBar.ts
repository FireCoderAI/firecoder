import * as vscode from "vscode";

class StatusBar {
  private statusBar: vscode.StatusBarItem | null = null;
  public init(context: vscode.ExtensionContext) {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    context.subscriptions.push(this.statusBar);
    this.setDefault();
  }

  private setDefault() {
    this.hideProgress();
  }
  public showProgress() {
    if (this.statusBar !== null) {
      this.statusBar.text = `$(loading~spin) FireCoder`;
      this.statusBar.show();
    }
  }

  public hideProgress() {
    if (this.statusBar !== null) {
      this.statusBar.text = `$(check) FireCoder`;
      this.statusBar.show();
    }
  }
}
const statusBar = new StatusBar();
export default statusBar;
