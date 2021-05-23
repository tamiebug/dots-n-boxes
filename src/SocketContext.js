import React, { createContext } from "react";
import io from "socket.io-client";
import { MIN_BOARD_SIZE } from "./GameContext";

const SOCKET_SERVER = "http://localhost:950";
export const SocketContext = createContext(null);

export const lobbyEvents = Object.freeze({
  HOST_LEFT: Symbol("Host left"),
  HOST_READY: Symbol("Host ready"),
  HOST_NOT_READY: Symbol("Host not ready"),
  GUEST_JOINED: Symbol("Guest joined"),
  GUEST_LEFT: Symbol("Guest left"),
  GUEST_READY: Symbol("Guest ready"),
  GUEST_NOT_READY: Symbol("Guest not ready"),
  START_GAME: Symbol("Start Game")
});

export const lobbyCommands = Object.freeze({
  LEAVE_LOBBY: Symbol("Leave lobby"),
  GUEST_IS_READY: Symbol("Guest is ready"),
  GUEST_IS_NOT_READY: Symbol("Guest is not ready"),
  KICK_GUEST: Symbol("Kick guest"),
  HOST_IS_READY: Symbol("Host is ready"),
  HOST_IS_NOT_READY: Symbol("Host is not ready"),
});

export function SocketProvider({ children }) {
  let socket;
  let socketContextInterface;
  let lobbyEventsBacklog = [];
  let lobbyCallback = null;
  let gameStarted = false;

  function sendLobbyEvent( event ) {
    if (lobbyCallback !== null) {
      lobbyCallback(event);
    } else {
      lobbyEventsBacklog.push( event );
    }
  }

  const reserveName = (name, callback) => {
    socket.emit("RESERVE_NAME", { name }, response => {
      console.log(`RESERVE_NAME result: ${response}`);
      callback(response);
    })
  };

  const getOpenGamesList = callback => {
    socket.emit("GET_OPEN_GAMES_LIST", response => {
      callback(response);
      console.log("Games List Fetch Successful");
    });
    console.log("Games List Fetch Initiated");
  }

  // TODO: Don't forget to somehow handle disconnects, etc.
  const requestLobby = ({ boardSize, gameLobbyDescription }, callback) => {
    socket.emit("CREATE_LOBBY", { dimensions: { boardWidth: boardSize, boardHeight: boardSize }, description: gameLobbyDescription },  response => {
      callback(response);
    });
  }

  const registerLobbyCallback = callback => {
    lobbyCallback = callback;
    if (lobbyEventsBacklog.length > 0 && lobbyCallback) {
      lobbyEventsBacklog.forEach(entry => lobbyCallback(entry));
    }
    // TODO: If the game hasn't started yet, and callback is being set to null... inform server to cancel game.
    if ( !gameStarted && (callback == null) ) {
      socket.emit("LEAVE_GAME");
    }
  };

  const joinLobby = (hostName, callback) => {
    socket.emit("JOIN_LOBBY", hostName, response => {
      callback(response);
    });
  };

  const performLobbyCommand = command => {
    switch (command.type) {
      case lobbyCommands.LEAVE_LOBBY:
        socket.emit("LEAVE_LOBBY");
        break;
      case lobbyCommands.GUEST_IS_READY:
        socket.emit("PLAYER_STATUS_CHANGE", { ready : true });
        break;
      case lobbyCommands.GUEST_IS_NOT_READY:
        socket.emit("PLAYER_STATUS_CHANGE", { ready : false });
        break;
      case lobbyCommands.KICK_GUEST:
        socket.emit("KICK_PLAYER");
        break;
      case lobbyCommands.HOST_IS_READY:
        socket.emit("PLAYER_STATUS_CHANGE", { ready : true });
        break;
      case lobbyCommands.HOST_IS_NOT_READY:
        socket.emit("PLAYER_STATUS_CHANGE", { ready: false });
        break;
      default:
        throw new Error(`Unrecognized lobby command ${command}`);
    }
  }

  if (!socket) {
    socket = io(SOCKET_SERVER);

    socket.on("LOBBY_GUEST_CHANGE", data => {
      if ( data.playerName ) sendLobbyEvent({ type: lobbyEvents.GUEST_JOINED , playerName: data.playerName });
      else sendLobbyEvent({ type: lobbyEvents.GUEST_LEFT });
    });

    socket.on("GUEST_STATUS_UPDATE", data => {
      switch( data.update ) {
        case "PLAYER_JOINED":
          if ( data.playerName ) {
            sendLobbyEvent({ type: lobbyEvents.GUEST_JOINED, playerName: data.playerName });
            break;
          } else {
            throw new Error(`Received PLAYER_JOINED update from server with no data.playerName`);
          }
        case "PLAYER_LEFT":
          sendLobbyEvent({ type: lobbyEvents.GUEST_LEFT });
          break;
        case "PLAYER_READY":
          sendLobbyEvent({ type: lobbyEvents.GUEST_READY });
          break;
        case "PLAYER_NOT_READY":
          sendLobbyEvent({ type: lobbyEvents.GUEST_NOT_READY }); 
          break;
        default:
          throw new Error(`Received invalid GUEST_STATUS_UPDATE from server: ${data.update}`);
      }
    });

    socket.on("HOST_STATUS_UPDATE", data => {
      switch( data.update ) {
        case "HOST_READY":
          sendLobbyEvent({ type: lobbyEvents.HOST_READY });
          break;
        case "HOST_NOT_READY":
          sendLobbyEvent({ type: lobbyEvents.HOST_NOT_READY });
          break;
        case "HOST_LEFT":
          sendLobbyEvent({ type: lobbyEvents.HOST_LEFT });
          break;
        default:
          throw new Error(`Received invalid HOST_STATUS_UPDATE from serve: ${data.update}`);
      }
    });

    socket.on("START_GAME",  settings => {
      gameStarted = true;
      sendLobbyEvent({ type: lobbyEvents.START_GAME, settings });
    });
  }
  lobbyCommands
  socketContextInterface = {
    socket: socket,
    getOpenGamesList,
    reserveName,
    requestLobby,
    registerLobbyCallback,
    joinLobby,
    performLobbyCommand,
  };

  return (
    <SocketContext.Provider value={ socketContextInterface }>
      { children }
    </SocketContext.Provider>
  )

}