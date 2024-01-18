import * as vscode from "vscode";

const ConfigurationProperties = {
  "experimental.windows.usegpu.nvidia": {
    default: false,
  },
  "experimental.linux.usegpu.nvidia": {
    default: false,
  },
  "experimental.osx.usegpu.metal": {
    default: false,
  },
};

type ConfigurationPropertiesType = typeof ConfigurationProperties;

class Configuration {
  private configuration: vscode.WorkspaceConfiguration;
  constructor() {
    this.configuration = vscode.workspace.getConfiguration("firecoder");
  }

  public get<T extends keyof ConfigurationPropertiesType>(
    property: T
  ): ConfigurationPropertiesType[T]["default"] {
    return (
      this.configuration.get(property) ??
      ConfigurationProperties[property]["default"]
    );
  }
}

export const configuration = new Configuration();
