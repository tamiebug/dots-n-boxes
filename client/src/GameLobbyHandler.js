import { clientApi as cApi, serverApi as sApi } from "../../api.js";
import { gameStore } from "./GameStore";
import { Move } from "./utility";
import { DEFAULT_GAME_SETTINGS } from "./GameEngine";

export function GameLobbyHandler({ socket }) {
  this.playerNames = {
    guest: null,
    host: null,
  };
  this.readyStatus = {
    guest: null,
    host: null
  };
  this.isHost = null;
  this.socket = socket;
  this.changeListener = null;
  this.gameActive = false;
  this.setUpSocketListeners();
}

GameLobbyHandler.prototype.createHostLobby = function createLobby({ name }) {
  this.isHost = true;
  this.playerNames = { guest: null, host: name };
  this.readyStatus = { guest: false, host: false };
  this.changeListener = null;
  this.gameActive = false;
};

GameLobbyHandler.prototype.createGuestLobby = function joinLobby({ name, hostName }) {
  this.isHost = false;
  this.playerNames = { guest: name, host: hostName };
  // TODO: How do we know if the host is ready upon joining... ?
  this.readyStatus = { guest: false, host: false };
  this.changeListener = null;
  this.gameActive = false;
};

GameLobbyHandler.prototype.setChangeListener = function setChangeListener( callback ) {
  this.changeListener = callback;
};

GameLobbyHandler.prototype.getLobbyState = function getLobbyState() {
  return {
    playerNames: this.playerNames,
    readyStatus: this.readyStatus,
    isHost: this.isHost,
    isValidLobby: this.playerNames.host !== null,
  };
};

GameLobbyHandler.prototype.callListener = function callListener() {
  if( this.changeListener ) {
    this.changeListener( this.getLobbyState() );
  }
};

GameLobbyHandler.prototype.setUpGame = function setUpGame({ settings }) {
  this.gameActive = true;
  gameStore.dispatch({ type: 'setUpGame', settings: DEFAULT_GAME_SETTINGS });
  gameStore.dispatch({ type: 'setUpGame', settings: {
    gameType: 'online',
    playerNames: [ this.playerNames.guest, this.playerNames.host ],
    isHost: this.isHost,
    boardWidth: settings.dimensions.boardWidth,
    boardHeight: settings.dimensions.boardHeight,
  }});
  this.readyStatus = { guest: false, host: false };
  this.callListener();
};

GameLobbyHandler.prototype.setUpSocketListeners = function setUpSocketListeners() {
  const socket = this.socket;
  socket.onAny( () => this.callListener() );
  socket.on(cApi.GuestJoined, data => {
    if ( data.playerName ) {
      this.playerNames = { ...this.playerNames, guest: data.playerName };
      this.readyStatus = { ...this.readyStatus, guest: false };
    } else throw new Error(`Received PLAYER_JOINED update with no data.playerName`);
  });
  socket.on(cApi.GuestLeft, () => {
    this.playerNames = { ...this.playerNames, guest: null };
    this.readyStatus = { ...this.readyStatus, guest: null };
  });
  socket.on(cApi.GuestReady, () => this.readyStatus = { ...this.readyStatus, guest: true });
  socket.on(cApi.GuestNotReady, () =>  this.readyStatus = { ...this.readyStatus, guest: false });
  socket.on(cApi.HostLeft, () => {
    this.playerNames = { ...this.playerNames, host: null };
    this.readyStatus = { ...this.readyStatus, host: null };
    this.isHost = null;
  });
  socket.on(cApi.HostKicked, () => {
    this.playerNames = { guest: null, host: null };
    this.readyStatus = { guest: null, host: null };
    this.isHost = null;
  });
  socket.on(cApi.HostReady, () =>  this.readyStatus = { ...this.readyStatus, host: true });
  socket.on(cApi.HostNotReady, () => this.readyStatus = { ...this.readyStatus, host: false });
  socket.on(cApi.StartGame, ({ settings }) => {
    this.setUpGame({ settings });
  });
  socket.on(cApi.MoveAttempted, ({ move }) => {
    if ( this.gameActive ) gameStore.dispatch({ type: 'onlineMoveAttempt', move: Move.fromJSON(move) });
  });
};

GameLobbyHandler.prototype.switchReadyStatus = function switchReadyStatus() {
  if ( this.isHost ) {
    this.readyStatus = { ...this.readyStatus, host: !this.readyStatus.host };
    this.socket.emit( sApi.PlayerStatusChange, { ready: this.readyStatus.host });
    this.callListener();
  } else {
    this.readyStatus = { ...this.readyStatus, guest: !this.readyStatus.guest };
    this.socket.emit( sApi.PlayerStatusChange, { ready: this.readyStatus.guest });
    this.callListener();
  }
};

GameLobbyHandler.prototype.kickGuest = function kickGuest() {
  if ( this.isHost ) {
    this.socket.emit( sApi.KickPlayer );
    this.playerNames.guest = null;
    this.readyStatus.guest = null;
    this.callListener();
  }
};

GameLobbyHandler.prototype.leaveLobby = function leaveLobby() {
  this.socket.emit( sApi.LeaveLobby );
  this.playerNames = { guest: null, host: null };
  this.readyStatus = { guest: null, host: null };
  this.isHost = null;
  this.callListener();
};