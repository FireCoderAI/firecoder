import http from "node:http";
import Logger from "../logger";

class AuthServer {
  private server: http.Server | null = null;
  private refreshToken: string | null = null;
  private timeout: number = 1000 * 60 * 10;
  constructor({ timeout = 10000 }: { timeout?: number } = {}) {
    this.timeout = timeout;
  }

  /**
   * @description Start the auth server.
   * The auth server will listen on the following URL: http://localhost:39729/refreshToken
   * If the auth server is already running, the function will do nothing.
   *
   */
  public async startServer() {
    if (this.server) {
      Logger.info("Auth server is already running", {
        component: "auth",
        sendTelemetry: false,
      });
      return;
    }

    const requestListener = (req: any, res: any) => {
      // get the token from the request
      // example of request:
      // GET http://localhost:39729/auth/v1/callback?refreshToken=Ju8HpwNlsNg5K3LPt0gqpw
      if (req.url.includes("/auth/v1/callback") && req.method === "GET") {
        const url = new URL(req.url, "http://localhost");
        const refreshToken = url.searchParams.get("refreshToken");
        if (refreshToken) {
          this.refreshToken = refreshToken;

          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Auth server login success, please close the window.");
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("No refresh token found");
          Logger.error("No refresh token found", {
            component: "auth",
            sendTelemetry: false,
          });
        }
      }
    };

    const host = "localhost";
    const port = 39729;

    this.server = http.createServer(requestListener);
    this.server.listen(port, host, () => {
      Logger.debug(`Server is running on http://${host}:${port}`, {
        component: "auth",
        sendTelemetry: false,
      });
    });

    return new Promise((resolve, reject) => {
      this.server?.on("listening", () => {
        resolve(true);
      });
      this.server?.on("error", (error) => {
        Logger.error(error, {
          component: "auth",
          sendTelemetry: true,
        });
        reject(error);
      });
    });
  }

  /**
   * @description
   * Stop the auth server.
   */
  public stopServer() {
    this.server?.close();
  }

  /**
   * @description
   *   Get the URL of the auth server.
   *   If the auth server is not running, the function will return null.
   */
  public getAuthServerUrl() {
    if (!this.server) {
      Logger.error("Auth server is not running", {
        component: "auth",
        sendTelemetry: true,
      });
      return null;
    }
    const addressServer = this.server.address();
    if (addressServer && typeof addressServer === "object") {
      const { address, port } = addressServer;

      return `http://${address}:${port}/auth/v1/callback`;
    }
    return null;
  }

  /**
   * @description
   *   Get the refresh token from the auth server.
   *   If the refresh token is not available, the function will wait for the refresh token to be available.
   *   If the refresh token is not available after the timeout, the function will return null.
   */
  public async getRefreshToken(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (this.refreshToken) {
          clearInterval(interval);
          resolve(this.refreshToken);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        reject(null);
      }, this.timeout);
    });
  }
}
const authServer = new AuthServer();
export { authServer };

export default AuthServer;
