import * as vscode from "vscode";
import { TypeModelsBase } from "../server";

const ConfigurationProperties = {
  "experimental.useGpu.windows.nvidia": {
    default: false,
  },
  "experimental.useGpu.linux.nvidia": {
    default: false,
  },
  "experimental.useGpu.osx.metal": {
    default: false,
  },
  "experimental.chat": {
    default: false,
  },
  "experimental.chat.useGpu": {
    default: false,
  },
  "completion.autoMode": {
    default: "base-small",
  },
  "completion.autoMode.useGpu": {
    default: false,
  },
  "completion.manualMode": {
    default: "base-small",
  },
  "completion.manualMode.useGpu": {
    default: false,
  },
} as const;

interface ConfigurationPropertiesType
  extends Record<keyof typeof ConfigurationProperties, any> {
  "experimental.useGpu.windows.nvidia": {
    possibleValues: boolean;
  };
  "experimental.useGpu.linux.nvidia": {
    possibleValues: boolean;
  };
  "experimental.useGpu.osx.metal": {
    possibleValues: boolean;
  };
  "experimental.chat": {
    possibleValues: boolean;
  };
  "experimental.chat.useGpu": {
    possibleValues: boolean;
  };
  "completion.autoMode": {
    possibleValues: TypeModelsBase;
  };
  "completion.autoMode.useGpu": {
    possibleValues: boolean;
  };
  "completion.manualMode": {
    possibleValues: TypeModelsBase;
  };
  "completion.manualMode.useGpu": {
    possibleValues: boolean;
  };
}

class Configuration {
  private configuration: vscode.WorkspaceConfiguration;
  constructor() {
    this.configuration = vscode.workspace.getConfiguration("firecoder");
  }

  public get<T extends keyof ConfigurationPropertiesType>(
    property: T
  ): ConfigurationPropertiesType[T]["possibleValues"] {
    return (
      this.configuration.get(property) ??
      ConfigurationProperties[property]["default"]
    );
  }
}

export const configuration = new Configuration();
