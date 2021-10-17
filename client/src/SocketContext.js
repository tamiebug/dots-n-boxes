import React, { createContext } from "react";

import { socket, getOpenGamesList, reserveName, requestLobby, registerLobbyCallback,
  registerOnlineMoveCallback, attemptOnlineMove, joinLobby, performLobbyCommand } from "./Socket";

export { lobbyEvents, lobbyCommands } from "./Socket";

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketContextInterface = {
    socket,
    getOpenGamesList,
    reserveName,
    requestLobby,
    registerLobbyCallback,
    registerOnlineMoveCallback,
    attemptOnlineMove,
    joinLobby,
    performLobbyCommand,
  };
  return (
    <SocketContext.Provider value={ socketContextInterface }>
      { children }
    </SocketContext.Provider>
  );
}
