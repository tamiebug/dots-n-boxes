import io from "socket.io-client";
import { serverApi as sApi } from "../../api.js";
import { GameLobbyHandler } from "./GameLobbyHandler.js";

const SOCKET_SERVER = "http://localhost:1950";

export const lobbyEvents = Object.freeze({
  HOST_LEFT: Symbol("Host left"),
  HOST_READY: Symbol("Host ready"),
  HOST_NOT_READY: Symbol("Host not ready"),
  GUEST_KICKED: Symbol("Guest has been kicked"),
  GUEST_JOINED: Symbol("Guest joined"),
  GUEST_LEFT: Symbol("Guest left"),
  GUEST_READY: Symbol("Guest ready"),
  GUEST_NOT_READY: Symbol("Guest not ready"),
  START_GAME: Symbol("Start Game")
});

let gameLobbyHandler = null;

export const socket = {
  /* Wrapping the io.socket object in order to enable lazy initialization.
   * Once a request (using socket.emit) is first made, that is when the socket connection will first be established,
   * And this is when all of the listeners (socket.on) will be attached.
   */
  socket: null,
  connectSocket() {
    if (!this.socket) {
      this.socket = io(SOCKET_SERVER);
      gameLobbyHandler = new GameLobbyHandler({ socket });
    }
  },
  emit( ...args ) {
    this.connectSocket();
    this.socket.emit( ...args );
  },
  on( ...args ) { this.socket.on( ...args ); },
  onAny( ...args ) { this.socket.onAny( ...args ); },
};

export function reserveName(name, callback)  {
  socket.emit(sApi.ReserveName, { name }, response => {
    console.log(`RESERVE_NAME result: ${response}`);
    callback(response);
  });
}

export function getOpenGamesList (callback) {
  socket.emit(sApi.GetOpenGamesList, response => {
    callback(response);
    console.log("Games List Fetch Successful");
  });
  console.log("Games List Fetch Initiated");
}

export function startLobby({ boardSize, gameLobbyDescription }, name, successCallback ) {
  function onSuccess() {
    gameLobbyHandler.createHostLobby({ name });
    successCallback( true );
  }

  socket.emit(sApi.CreateLobby, { settings: { dimensions: { boardWidth: parseInt(boardSize), boardHeight: parseInt(boardSize) }, description: gameLobbyDescription }},  response => {
    if ( response.success ) {
      onSuccess();
    } else {
      successCallback( false );
    }
  });
}

export function joinLobby( name, hostName, successCallback ) {
  function onSuccess() {
    gameLobbyHandler.createGuestLobby({ name, hostName });
    successCallback( true );
  }

  socket.emit(sApi.JoinLobby, { userName: hostName }, response => {
    if ( response.success ) {
      onSuccess();
    } else {
      successCallback( false );
    }
  });
}

export function getGameLobbyHandler() {
  return gameLobbyHandler;
}

export function attemptOnlineMove ( move ) {
  socket.emit(sApi.AttemptMove, { move }, response => {
    if (!response.success) {
      console.log(`Move attempt with move ${move.toString()} failed because of ${response.reason}`);
    }
  });
}