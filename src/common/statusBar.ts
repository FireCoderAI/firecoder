import { randomUUID } from "node:crypto";
import * as vscode from "vscode";

class StatusBar {
  private activeTasks: Set<string> = new Set();
  private statusBar: vscode.StatusBarItem | null = null;
  public init(context: vscode.ExtensionContext) {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    context.subscriptions.push(this.statusBar);
    this.setDefault();
    setInterval(() => {
      this.checkProgress();
    }, 10);
  }
  public startTask() {
    const uuid = randomUUID();
    this.activeTasks.add(uuid);
    this.checkProgress();

    return {
      stopTask: () => {
        this.activeTasks.delete(uuid);
        this.checkProgress();
      },
    };
  }

  private checkProgress() {
    if (this.activeTasks.size === 0) {
      if (this.statusBar !== null) {
        this.statusBar.text = `$(check) FireCoder`;
      }
    } else {
      if (this.statusBar !== null) {
        this.statusBar.text = `$(loading~spin) FireCoder`;
      }
    }
  }

  private setDefault() {
    if (this.statusBar !== null) {
      this.statusBar.text = `$(check) FireCoder`;
      this.statusBar.show();
    }
  }
}
const statusBar = new StatusBar();
export default statusBar;
