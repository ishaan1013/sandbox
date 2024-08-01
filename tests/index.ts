// Import necessary modules
import { io, Socket } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config();

interface CallbackResponse {
  success: boolean;
  apps?: string[];
  message?: string;
}

let socketRef: Socket = io(
  `http://localhost:4000?userId=user_2hFB6KcK6bb3Gx9241UXsxFq4kO&sandboxId=v30a2c48xal03tzio7mapt19`,
  {
    timeout: 2000,
  }
);

socketRef.on("connect", async () => {
  console.log("Connected to the server");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  socketRef.emit("list", (response: CallbackResponse) => {
    if (response.success) {
      console.log("List of apps:", response.apps);
    } else {
      console.log("Error:", response.message);
    }
  });

  socketRef.emit("deploy", (response: CallbackResponse) => {
    if (response.success) {
      console.log("It worked!");
    } else {
      console.log("Error:", response.message);
    }
  });
});

socketRef.on("disconnect", () => {
  console.log("Disconnected from the server");
});

socketRef.on("connect_error", (error: Error) => {
  console.error("Connection error:", error);
});
