import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

let roomSocket: Socket | null = null;
let gameSocket: Socket | null = null;
let voiceSocket: Socket | null = null;

function createSocket(namespace: string): Socket {
  const token = getAccessToken();
  return io(`${WS_URL}${namespace}`, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"],
  });
}

export function getRoomSocket(): Socket {
  if (!roomSocket || roomSocket.disconnected) {
    roomSocket = createSocket("/rooms");
  }
  return roomSocket;
}

export function getGameSocket(): Socket {
  if (!gameSocket || gameSocket.disconnected) {
    gameSocket = createSocket("/game");
  }
  return gameSocket;
}

export function getVoiceSocket(): Socket {
  if (!voiceSocket || voiceSocket.disconnected) {
    voiceSocket = createSocket("/voice");
  }
  return voiceSocket;
}

export function connectRoomSocket(): void {
  const socket = getRoomSocket();
  if (!socket.connected) socket.connect();
}

export function connectGameSocket(): void {
  const socket = getGameSocket();
  if (!socket.connected) socket.connect();
}

export function connectVoiceSocket(): void {
  const socket = getVoiceSocket();
  if (!socket.connected) socket.connect();
}

export function disconnectAll(): void {
  roomSocket?.disconnect();
  gameSocket?.disconnect();
  voiceSocket?.disconnect();
  roomSocket = null;
  gameSocket = null;
  voiceSocket = null;
}
