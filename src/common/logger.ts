import * as vscode from "vscode";

class Log {
  private outputChannel: vscode.LogOutputChannel;
  private activePerfMarkers: Map<string, number> = new Map();

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("FireCoder", {
      log: true,
    });
  }

  public startPerfMarker(marker: string) {
    const startTime = performance.now();
    this.outputChannel.appendLine(`PERF_MARKER> Start ${marker}`);
    this.activePerfMarkers.set(marker, startTime);
  }

  public endPerfMarker(marker: string) {
    const endTime = performance.now();
    this.outputChannel.appendLine(
      `PERF_MARKER> End ${marker}: ${
        endTime - this.activePerfMarkers.get(marker)!
      } ms`
    );
    this.activePerfMarkers.delete(marker);
  }

  private logString(message: any, component?: string): string {
    if (typeof message !== "string") {
      if (message instanceof Error) {
        message = message.message;
      } else if ("toString" in message) {
        message = message.toString();
      } else {
        message = JSON.stringify(message);
      }
    }
    return component ? `${component}> ${message}` : message;
  }

  public trace(message: any, component: string) {
    this.outputChannel.trace(this.logString(message, component));
  }

  public debug(message: any, component: string) {
    this.outputChannel.debug(this.logString(message, component));
  }

  public info(message: any, component?: string) {
    this.outputChannel.info(this.logString(message, component));
  }

  public warn(message: any, component?: string) {
    this.outputChannel.warn(this.logString(message, component));
  }

  public error(message: any, component?: string) {
    this.outputChannel.error(this.logString(message, component));
  }
}

const Logger = new Log();
export default Logger;
