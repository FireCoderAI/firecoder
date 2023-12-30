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

type Properties = {
  extensionversion: string;
  machineid: string;
  sessionid: string;
  vscodeversion: string;
  osrelease: string;
  osplatform: NodeJS.Platform;
  osarchitecture: string;
  oscpu: string;
  osram: string;
};
class Telemetry {
  private faro?: Faro;
  private properties?: Properties;
  constructor() {}

  public init(context: vscode.ExtensionContext) {
    this.properties = this.getProperties(context);
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
        throw new Error("Function not implemented.");
      },
      paused: false,
      preventGlobalExposure: false,
      unpatchedConsole: console,
    });
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
      oscpu: os.cpus()?.[0]?.model,
      osram: String(os.totalmem()),
    };
    return properties;
  }

  public sendTelemetryEvent(text: string) {
    if (vscode.env.isTelemetryEnabled) {
      this.faro?.api.pushEvent(text, this.properties);
    }
  }
}
export const TelemetryInstance = new Telemetry();
