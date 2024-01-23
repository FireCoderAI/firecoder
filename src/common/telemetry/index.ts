import * as os from "node:os";
import * as vscode from "vscode";
import {
  ExtendedError,
  Faro,
  InternalLoggerLevel,
  Stacktrace,
  initializeFaro,
} from "@grafana/faro-core";
import { FetchTransport } from "@grafana/faro-web-sdk";
import Logger from "../logger";

type Properties = {
  extensionversion: string;
  machineid: string;
  sessionid: string;
  vscodeversion: string;
  osrelease: string;
  osplatform: NodeJS.Platform;
  osarchitecture: string;
  osmachine: string;
  oscpu: string;
  osram: string;
};
class FirecoderTelemetrySender implements vscode.TelemetrySender {
  private faro?: Faro;
  private properties?: Properties;
  constructor() {}

  public init(context: vscode.ExtensionContext) {
    this.properties = this.getProperties(context);
    try {
      this.faro = initializeFaro({
        app: {
          name: "firecoder-vscode",
          version: "1.0.0",
          environment: "production",
        },
        transports: [
          new FetchTransport({
            url: "https://faro-collector-prod-eu-west-0.grafana.net/collect/33a834c252bb6b780b5d242def445bbd",
          }),
        ],
        sessionTracking: {
          enabled: false,
        },
        dedupe: false,
        globalObjectKey: "firecoder-vscode",
        internalLoggerLevel: InternalLoggerLevel.ERROR,
        isolate: true,
        instrumentations: [],
        metas: [],
        parseStacktrace: function (err: ExtendedError): Stacktrace {
          return {
            frames: [],
          };
        },
        paused: false,
        preventGlobalExposure: false,
        unpatchedConsole: console,
      });
    } catch (error) {
      Logger.error(error);
    }
  }

  private getProperties(context: vscode.ExtensionContext) {
    const properties = {
      extensionversion: context.extension.packageJSON.version as string,
      machineid: vscode.env.machineId,
      sessionid: vscode.env.sessionId,
      vscodeversion: vscode.version,
      osrelease: os.release(),
      osplatform: os.platform(),
      osarchitecture: os.arch(),
      osmachine: os.machine(),
      oscpu: os.cpus()?.[0]?.model,
      osram: String(os.totalmem()),
    };
    return properties;
  }

  public sendEventData(eventName: string, data?: Record<string, any>) {
    if (vscode.env.isTelemetryEnabled) {
      this.faro?.api.pushEvent(eventName, {
        ...this.properties,
        ...(data || {}),
      });
    }
  }

  public sendErrorData(error: Error, data?: Record<string, any>) {
    if (vscode.env.isTelemetryEnabled) {
      this.faro?.api.pushError(error, {
        context: {
          ...this.properties,
          ...(data || {}),
        },
      });
    }
  }
  public sendLogText(text: string, data?: Record<string, any>) {
    if (vscode.env.isTelemetryEnabled) {
      this.faro?.api.pushLog([text], {
        context: this.properties,
        ...(data || {}),
      });
    }
  }
}
export const FirecoderTelemetrySenderInstance = new FirecoderTelemetrySender();
