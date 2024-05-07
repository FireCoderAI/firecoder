import * as vscode from "vscode";
import Logger from "../logger";
import { authServer } from "./authServer";
import { secretsStorage } from "../utils/secretStore";
import { getSuppabaseClient } from "./supabaseClient";

export const login = async () => {
  try {
    await authServer.startServer();

    vscode.env.openExternal(
      vscode.Uri.parse("https://dash.firecoder.cc/auth/extensions")
    );

    const refreshToken = await authServer.getRefreshToken();

    if (!refreshToken) {
      return {
        error: "No refresh token found",
      };
    }

    const supabase = getSuppabaseClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) {
      Logger.error(error, {
        component: "auth",
        sendTelemetry: true,
      });

      return {
        error: error.message,
      };
    }

    await secretsStorage.update("token", data.session?.access_token ?? "");
  } catch (error) {
    Logger.error(error, {
      component: "auth",
      sendTelemetry: true,
    });
  }
};
