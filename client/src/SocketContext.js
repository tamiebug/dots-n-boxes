import React, { createContext } from "react";

import { socket, getOpenGamesList, reserveName, startLobby, attemptOnlineMove, joinLobby, getGameLobbyHandler } from "./Socket";

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketContextInterface = {
    socket,
    getOpenGamesList,
    reserveName,
    startLobby,
    attemptOnlineMove,
    joinLobby,
    getGameLobbyHandler
  };
  return (
    <SocketContext.Provider value={ socketContextInterface }>
      { children }
    </SocketContext.Provider>
  );
}