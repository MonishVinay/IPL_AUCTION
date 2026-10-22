import { io } from "socket.io-client";

// Connect to current origin (works seamlessly on Render and localhost with proxy)
export const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
