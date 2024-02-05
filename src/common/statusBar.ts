import { randomUUID } from "node:crypto";
import * as vscode from "vscode";
import { state } from "./utils/state";

class StatusBar {
  private activeTasks: Set<string> = new Set();
  private error: string | null = null;
  private statusBar: vscode.StatusBarItem | null = null;
  public init(context: vscode.ExtensionContext) {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBar.command = "firecoder.changeInlineSuggestMode";
    context.subscriptions.push(this.statusBar);
    this.setDefault();
    setInterval(() => {
      this.checkProgress();
    }, 50);
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
    if (this.error !== null) {
      return;
    }
    if (this.activeTasks.size === 0) {
      if (this.statusBar !== null) {
        this.statusBar.text = `$(${this.getInlineSuggestModeIcon()}) FireCoder`;
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

  public setError(tooltip: string) {
    if (this.statusBar !== null) {
      this.error = tooltip;
      this.statusBar.text = `$(error) FireCoder`;
      this.statusBar.tooltip = tooltip;
      return () => {
        this.error = null;
        this.checkProgress();
      };
    }
  }

  private getInlineSuggestMode() {
    const currentInlineSuggestModeAuto = state.workspace.get(
      "inlineSuggestModeAuto"
    );
    return currentInlineSuggestModeAuto;
  }
  private getInlineSuggestModeIcon() {
    if (this.getInlineSuggestMode()) {
      return "check-all";
    } else {
      return "check";
    }
  }

  private setDefault() {
    if (this.statusBar !== null) {
      this.statusBar.text = `$(${this.getInlineSuggestModeIcon()}) FireCoder`;

      this.statusBar.tooltip = `Change inline suggest mode. Currect: ${
        this.getInlineSuggestMode() ? "Auto" : "Manually"
      }`;
      this.statusBar.show();
    }
  }
}
const statusBar = new StatusBar();
export default statusBar;
