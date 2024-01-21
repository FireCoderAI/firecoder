import * as vscode from "vscode";
import { TypeModel, TypeModelsBase } from "../server";

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
  "completion.autoMode": {
    default: "base-small",
  },
  "completion.manuallyMode": {
    default: "base-small",
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
  "completion.autoMode": {
    possibleValues: TypeModelsBase;
  };
  "completion.manuallyMode": {
    possibleValues: TypeModelsBase;
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
