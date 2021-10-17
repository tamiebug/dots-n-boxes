import io from "socket.io-client";
import { serverApi as sApi, clientApi as cApi } from "../../api.js";
import { Move } from "./utility.js";

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

export const lobbyCommands = Object.freeze({
  LEAVE_LOBBY: Symbol("Leave lobby"),
  GUEST_IS_READY: Symbol("Guest is ready"),
  GUEST_IS_NOT_READY: Symbol("Guest is not ready"),
  KICK_GUEST: Symbol("Kick guest"),
  HOST_IS_READY: Symbol("Host is ready"),
  HOST_IS_NOT_READY: Symbol("Host is not ready"),
});

export const socket = {
  /* Wrapping the io.socket object in order to enable lazy initialization.
   * Once a request (using socket.emit) is first made, that is when the socket connection will first be established,
   * And this is when all of the listeners (socket.on) will be attached.
   */
  socket: null,
  connectSocket() {
    if (!this.socket) this.socket = io(SOCKET_SERVER);
    setUpSocketListeners();
  },
  emit( ...args ) {
    this.connectSocket();
    this.socket.emit( ...args );
  },
  on( ...args ) { this.socket.on( ...args ); },
};

let lobbyEventsBacklog = [];
let lobbyCallback = null;
let gameStarted = false;
let onlineMoveCallback = null;

function sendLobbyEvent( event ) {
  if (lobbyCallback !== null) {
    lobbyCallback(event);
  } else {
    lobbyEventsBacklog.push( event );
  }
}

function setUpSocketListeners() {
  socket.on(cApi.GuestJoined, data => {
    if ( data.playerName ) sendLobbyEvent({ type: lobbyEvents.GUEST_JOINED , playerName: data.playerName });
    else throw new Error(`Received PLAYER_JOINED update from server with no data.playerName`);
  });

  socket.on(cApi.GuestLeft, () => sendLobbyEvent({ type: lobbyEvents.GUEST_LEFT }));
  socket.on(cApi.GuestReady, () => sendLobbyEvent({ type: lobbyEvents.GUEST_READY }));
  socket.on(cApi.GuestNotReady, () => sendLobbyEvent({ type: lobbyEvents.GUEST_NOT_READY }));

  socket.on(cApi.HostLeft, () => sendLobbyEvent({ type: lobbyEvents.HOST_LEFT }));
  socket.on(cApi.HostKicked, () => sendLobbyEvent({ type: lobbyEvents.GUEST_KICKED }));
  socket.on(cApi.HostReady, () => sendLobbyEvent({ type: lobbyEvents.HOST_READY }));
  socket.on(cApi.HostNotReady, () => sendLobbyEvent({ type: lobbyEvents.HOST_NOT_READY }));

  socket.on(cApi.StartGame, ({ settings }) => {
    gameStarted = true;
    sendLobbyEvent({ type: lobbyEvents.START_GAME, settings });
  });

  socket.on(cApi.MoveAttempted, ({ move }) => {
    console.log("Move attempted");
    if (onlineMoveCallback) onlineMoveCallback( Move.fromJSON(move) );
  });
}

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

export function requestLobby({ boardSize, gameLobbyDescription }, callback) {
  console.log(`REQUEST: ${JSON.stringify({ settings: { dimensions: { boardWidth: boardSize, boardHeight: boardSize }, description: gameLobbyDescription }})}`);
  socket.emit(sApi.CreateLobby, { settings: { dimensions: { boardWidth: parseInt(boardSize), boardHeight: parseInt(boardSize) }, description: gameLobbyDescription }},  response => {
    callback(response);
  });
}

export function registerLobbyCallback (callback) {
  lobbyCallback = callback;
  //console.log(`registered lobby callback ${callback}`);
  if (lobbyEventsBacklog.length > 0 && lobbyCallback) {
    lobbyEventsBacklog.forEach(entry => lobbyCallback(entry));
  }
  // TODO: If the game hasn't started yet, and callback is being set to null... inform server to cancel game.
  if ( !gameStarted && (callback == null) ) {
    socket.emit(sApi.LeaveLobby);
  }
}

export function registerOnlineMoveCallback (callback) {
  onlineMoveCallback = callback;
}

export function attemptOnlineMove ( move ) {
  socket.emit(sApi.AttemptMove, { move }, response => {
    if (!response.success) {
      console.log(`Move attempt with move ${move.toString()} failed because of ${response.reason}`);
    }
  });
}

export function joinLobby( hostName, callback ) {
  socket.emit(sApi.JoinLobby, { userName: hostName }, response => {
    callback(response);
  });
}

export function performLobbyCommand (command) {
  switch (command) {
  case lobbyCommands.LEAVE_LOBBY:
    socket.emit(sApi.LeaveLobby);
    break;
  case lobbyCommands.GUEST_IS_READY:
    socket.emit(sApi.PlayerStatusChange, { ready : true });
    break;
  case lobbyCommands.GUEST_IS_NOT_READY:
    socket.emit(sApi.PlayerStatusChange, { ready : false });
    break;
  case lobbyCommands.KICK_GUEST:
    socket.emit(sApi.KickPlayer);
    break;
  case lobbyCommands.HOST_IS_READY:
    socket.emit(sApi.PlayerStatusChange, { ready : true });
    break;
  case lobbyCommands.HOST_IS_NOT_READY:
    socket.emit(sApi.PlayerStatusChange, { ready: false });
    break;
  default:
    throw new Error(`Unrecognized lobby command ${command}`);
  }
}
