import { Sandbox, ProcessHandle } from "e2b";

// Terminal class to manage a pseudo-terminal (PTY) in a sandbox environment
export class Terminal {
  private pty: ProcessHandle | undefined; // Holds the PTY process handle
  private input:
    | { stop: () => void; sendData: (data: Uint8Array) => void }
    | undefined; // Holds input stream controls
  private sandbox: Sandbox; // Reference to the sandbox environment

  // Constructor initializes the Terminal with a sandbox
  constructor(sandbox: Sandbox) {
    this.sandbox = sandbox;
  }

  // Initialize the terminal with specified rows, columns, and data handler
  async init({
    rows = 20,
    cols = 80,
    onData,
  }: {
    rows?: number;
    cols?: number;
    onData: (responseData: string) => void;
  }): Promise<void> {
    // Create a new PTY process
    this.pty = await this.sandbox.pty.create({
      rows,
      cols,
      timeout: 0,
      onData: (data: Uint8Array) => {
        onData(data.toString()); // Convert received data to string and pass to handler
      },
    });
    // Set up input stream for the PTY
    this.input = await this.sandbox.pty.streamInput(this.pty.pid);
  }

  // Send data to the terminal
  sendData(data: string): void {
    if (this.input) {
      this.input.sendData(Buffer.from(data)); // Convert string to Buffer and send
    } else {
      console.log("Cannot send data because input is not initialized.");
    }
  }

  // Resize the terminal
  async resize(size: { cols: number; rows: number }): Promise<void> {
    if (this.pty) {
      await this.sandbox.pty.resize(this.pty.pid, size);
    } else {
      console.log("Cannot send data because pty is not initialized.");
    }
  }

  // Close the terminal, killing the PTY process and stopping the input stream
  async close(): Promise<void> {
    if (this.pty) {
      await this.pty.kill();
    } else {
      console.log("Cannot kill pty because it is not initialized.");
    }
    if (this.input) {
      this.input.stop();
    } else {
      console.log("Cannot stop input because it is not initialized.");
    }
  }
}

// Usage example:
// const terminal = new Terminal(sandbox);
// await terminal.init();
// terminal.sendData('ls -la');
// await terminal.resize({ cols: 100, rows: 30 });
// await terminal.close();