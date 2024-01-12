import { randomUUID } from "node:crypto";
import * as vscode from "vscode";

class StatusBar {
  private activeTasks: Set<string> = new Set();
  private statusBar: vscode.StatusBarItem | null = null;
  private workspaceState: vscode.Memento | null = null;
  public init(context: vscode.ExtensionContext) {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.workspaceState = context.workspaceState;

    this.statusBar.command = "firecoder.changeInlineSuggestMode";
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

  public checkProgress() {
    if (this.activeTasks.size === 0) {
      if (this.statusBar !== null) {
        this.statusBar.text = `$(${
          this.getInlineSuggestMode() ? "check-all" : "check"
        }) FireCoder`;
        this.statusBar.tooltip = `Change inline suggest mode. Currect: ${
          this.getInlineSuggestMode() ? "Auto" : "Manually"
        }`;
      }
    } else {
      if (this.statusBar !== null) {
        this.statusBar.text = `$(loading~spin) FireCoder`;
        this.statusBar.tooltip = `Change inline suggest mode. Currect: ${
          this.getInlineSuggestMode() ? "Auto" : "Manually"
        }`;
      }
    }
  }

  private getInlineSuggestMode() {
    if (this.workspaceState !== null) {
      const currentInlineSuggestModeAuto = this.workspaceState.get(
        "inlineSuggestModeAuto",
        true
      );
      return currentInlineSuggestModeAuto;
    }
    return true;
  }

  private setDefault() {
    if (this.statusBar !== null) {
      this.statusBar.text = `$(${
        this.getInlineSuggestMode() ? "check-all" : "check"
      }) FireCoder`;

      this.statusBar.tooltip = `Change inline suggest mode. Currect: ${
        this.getInlineSuggestMode() ? "Auto" : "Manually"
      }`;
      this.statusBar.show();
    }
  }
}
const statusBar = new StatusBar();
export default statusBar;
