import { SSHSocketClient, SSHConfig } from "./SSHSocketClient"

export interface DokkuResponse {
  ok: boolean;
  output: string;
}

export class DokkuClient extends SSHSocketClient {

  constructor(config: SSHConfig) {
    super(
      config,
      "/var/run/dokku-daemon/dokku-daemon.sock"
    )
  }

  async sendCommand(command: string): Promise<DokkuResponse> {
    try {
      const response = await this.sendData(command);

      if (typeof response !== "string") {
        throw new Error("Received data is not a string");
      }

      return JSON.parse(response);
    } catch (error: any) {
      throw new Error(`Failed to send command: ${error.message}`);
    }
  }

  async listApps(): Promise<string[]> {
    const response = await this.sendCommand("apps:list");
    return response.output.split("\n").slice(1); // Split by newline and ignore the first line (header)
  }
}

export { SSHConfig };