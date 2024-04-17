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
  "experimental.useopentabs": {
    default: true,
  },
  "completion.autoMode": {
    default: "base-small",
  },
  "completion.manuallyMode": {
    default: "base-small",
  },
  homedir: {
    default: "",
  },
  "cloud.endpoint": {
    default: "https://llm-api.firecoder.cc/v1",
  },
  "cloud.apiToken": {
    default: "",
  },
  "cloud.use": {
    default: false,
  },
  "server.usePreRelease": {
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
  "experimental.useopentabs": {
    possibleValues: boolean;
  };
  "completion.autoMode": {
    possibleValues: TypeModelsBase;
  };
  "completion.manuallyMode": {
    possibleValues: TypeModelsBase;
  };
  homedir: {
    possibleValues: string;
  };
  "cloud.endpoint": {
    possibleValues: string;
  };
  "cloud.apiToken": {
    possibleValues: string;
  };
  "cloud.use": {
    possibleValues: boolean;
  };
  "server.usePreRelease": {
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
    this.configuration = vscode.workspace.getConfiguration("firecoder");

    return (
      this.configuration.get(property) ??
      ConfigurationProperties[property]["default"]
    );
  }
}

export const configuration = new Configuration();
