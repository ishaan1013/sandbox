import { Client } from "ssh2";

export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  privateKey: Buffer;
}

export class SSHSocketClient {
    private conn: Client;
    private config: SSHConfig;
    private socketPath: string;
    private isConnected: boolean = false;
  
    constructor(config: SSHConfig, socketPath: string) {
      this.conn = new Client();
      this.config = { ...config, port: 22};
      this.socketPath = socketPath;
  
      this.setupTerminationHandlers();
    }
  
    private setupTerminationHandlers() {
      process.on("SIGINT", this.closeConnection.bind(this));
      process.on("SIGTERM", this.closeConnection.bind(this));
    }
  
    private closeConnection() {
      console.log("Closing SSH connection...");
      this.conn.end();
      this.isConnected = false;
      process.exit(0);
    }
  
    connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        this.conn
          .on("ready", () => {
            console.log("SSH connection established");
            this.isConnected = true;
            resolve();
          })
          .on("error", (err) => {
            console.error("SSH connection error:", err);
            this.isConnected = false;
            reject(err);
          })
          .on("close", () => {
            console.log("SSH connection closed");
            this.isConnected = false;
          })
          .connect(this.config);
      });
    }
  
    sendData(data: string): Promise<string> {
      return new Promise((resolve, reject) => {
        if (!this.isConnected) {
          reject(new Error("SSH connection is not established"));
          return;
        }
  
        this.conn.exec(
          `echo "${data}" | nc -U ${this.socketPath}`,
          (err, stream) => {
            if (err) {
              reject(err);
              return;
            }
  
            stream
              .on("close", (code: number, signal: string) => {
                reject(
                  new Error(
                    `Stream closed with code ${code} and signal ${signal}`
                  )
                );
              })
              .on("data", (data: Buffer) => {
                resolve(data.toString());
              })
              .stderr.on("data", (data: Buffer) => {
                reject(new Error(data.toString()));
              });
          }
        );
      });
    }
  }