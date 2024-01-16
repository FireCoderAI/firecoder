import * as vscode from "vscode";
import { FirecoderTelemetrySenderInstance } from "./telemetry";
import { LogLevel } from "@grafana/faro-core";

interface LogOptions {
  component?: string;
  sendTelemetry?: boolean;
}

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

  public trace(message: any, options?: LogOptions) {
    const messageString = this.logString(message, options?.component);

    this.outputChannel.trace(messageString);

    if (options?.sendTelemetry) {
      FirecoderTelemetrySenderInstance.sendLogText(messageString, {
        level: LogLevel.TRACE,
      });
    }
  }

  public debug(message: any, options?: LogOptions) {
    const messageString = this.logString(message, options?.component);

    this.outputChannel.debug(messageString);

    if (options?.sendTelemetry) {
      FirecoderTelemetrySenderInstance.sendLogText(messageString, {
        level: LogLevel.DEBUG,
      });
    }
  }

  public info(message: any, options?: LogOptions) {
    const messageString = this.logString(message, options?.component);

    this.outputChannel.info(messageString);

    if (options?.sendTelemetry) {
      FirecoderTelemetrySenderInstance.sendLogText(messageString, {
        level: LogLevel.INFO,
      });
    }
  }

  public warn(message: any, options?: LogOptions) {
    const messageString = this.logString(message, options?.component);

    this.outputChannel.warn(messageString);

    if (options?.sendTelemetry) {
      FirecoderTelemetrySenderInstance.sendLogText(messageString, {
        level: LogLevel.WARN,
      });
    }
  }

  public error(message: any, options?: LogOptions) {
    const messageString = this.logString(message, options?.component);

    this.outputChannel.error(messageString);

    if (options?.sendTelemetry) {
      FirecoderTelemetrySenderInstance.sendLogText(messageString, {
        level: LogLevel.ERROR,
      });
    }
  }
}

const Logger = new Log();
export default Logger;
