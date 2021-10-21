import { v4 as uuidv4 } from 'uuid';
import log from "./logger.js";

const MIN_BOARD_DIMENSION = 3;
const MAX_BOARD_DIMENSION = 32;
const MAX_DESCRIPTION_LENGTH = 40;

export class DataStore {
  constructor() {
    // games = { gameId, game: { dimensions, description, players : { host: { socketId, ready }, guest: { socketId, ready }}}}
    this.gamesMap = new Map();

    this.socketIdsToUserNames = new Map();
    this.userNamesToSocketIds = new Map();
    this.socketIdsToGameIds = new Map();
  }

  clearDataStore() {
    this.gamesMap = new Map();
    this.socketIdsToUserNames = new Map();
    this.userNamesToSocketIds = new Map();
    this.socketIdsToGameIds = new Map();
  }

  returnSocketId({ socketId, userName }) {
    if (socketId)
      return socketId;
    else if (userName)
      return this.userNamesToSocketIds.get(userName);
    else
      log.debug(`returnSocketId not given either a socketId or userName`);
    return undefined;
  }

  createGame({ socketId, userName, dimensions, description }) {
    socketId = this.returnSocketId({ socketId, userName });
    if (socketId === undefined) {
      log.debug(`Failed to create game, could not resolve a socketId`);
    }

    if (!this.validateGameParameters({ dimensions, description })) {
      log.debug(`Failed to create game, invalid parameters`);
      return null;
    }

    // Player can only be in one game lobby at a time.  This ensures this condition
    this.removePlayerFromCurrentGame({ socketId });

    const gameId = uuidv4();
    this.gamesMap.set(gameId, { dimensions, description, players: { host: { socketId, ready: false }, guest: null } });
    this.socketIdsToGameIds.set(socketId, gameId);
    return gameId;
  }

  joinGame({ host: { socketId: hostSocketId, userName: hostUserName }, guest: { socketId: guestSocketId, userName: guestUserName } }) {
    hostSocketId = this.returnSocketId({ socketId: hostSocketId, userName: hostUserName });
    guestSocketId = this.returnSocketId({ socketId: guestSocketId, userName: guestUserName });

    if (hostSocketId === undefined) {
      log.debug(`Could not resolve socketId ${hostSocketId} and userName ${hostUserName}`);
      return null;
    } if (guestSocketId === undefined) {
      log.debug(`Could not resolve socketId ${guestSocketId} and userName ${guestUserName}`);
      return null;
    }

    const gameId = this.socketIdsToGameIds.get(hostSocketId);
    if (gameId == undefined) {
      log.debug(`Could not find gameId corresponding to socket ${hostSocketId}`);
      return null;
    }

    // Player can only be in one game lobby.  Hence they must be removed from all others
    this.removePlayerFromCurrentGame({ socketId: guestSocketId });

    const gamePlayers = this.gamesMap.get(gameId).players;
    if (gamePlayers.guest !== null) {
      log.debug(`Lobby is already full.  Could not join game`);
      return null;
    }

    gamePlayers.guest = { socketId: guestSocketId, ready: false };
    this.socketIdsToGameIds.set(guestSocketId, gameId);
    return gameId;
  }

  getGame(gameId) {
    return { ...this.gamesMap.get(gameId) };
  }

  removePlayerFromCurrentGame({ userName, socketId }) {
    socketId = this.returnSocketId({ userName, socketId });
    const gameId = this.getAssociatedGameId({ socketId });
    const game = this.gamesMap.get(gameId);
    if (game) {
      const [hostSocketId, guestSocketId] = [game.players.host.socketId, game.players.guest?.socketId];
      if (socketId == hostSocketId) {
        // dismantle lobby, host left.
        this.gamesMap.delete(gameId);
        this.socketIdsToGameIds.delete(hostSocketId);
        if (guestSocketId)
          this.socketIdsToGameIds.delete(guestSocketId);
        return { wasHost: true, hostSocketId, guestSocketId };
      }
      else // socketId == guestSocketId
        this.socketIdsToGameIds.delete(guestSocketId);
      game.players.guest = null;
      return { wasHost: false, hostSocketId };
    }
    return { failed: true };
  }

  registerName({ userName, socketId }) {
    /*
        Registers a name with a socketId pair.  If name already exists, returns { success: false }.  Else, returns { success: true }
    */
    if ( this.userNamesToSocketIds.has(userName)) {
      if ( socketId && this.userNamesToSocketIds.get(userName) == socketId ) {
        return { success: false, pairAlreadyExists: true };
      } else {
        return { success: false, pairAlreadyExists: false };
      }
    }

    if (socketId === undefined) return { success: false };

    this.userNamesToSocketIds.set(userName, socketId);
    this.socketIdsToUserNames.set(socketId, userName);
    return { success: true };
  }

  unRegisterPlayer({ userName, socketId }) {
    // This allows either userName or socketId to be provided and code to still work
    socketId = this.returnSocketId({ socketId, userName });
    userName = this.getUserNameFromSocketId( socketId );
    if (socketId === undefined || userName === undefined) return { success: false };

    this.userNamesToSocketIds.delete(userName);
    this.socketIdsToUserNames.delete(socketId);

    this.removePlayerFromCurrentGame({ socketId });
    return { success : true };
  }

  getSocketIdFromUserName(userName) {
    return this.userNamesToSocketIds.get(userName);
  }

  getUserNameFromSocketId(socketId) {
    return this.socketIdsToUserNames.get(socketId);
  }

  getAssociatedGameId({ socketId, userName }) {
    socketId = this.returnSocketId({ socketId, userName });
    if (socketId === undefined) {
      log.debug(`In getAssociatedGameId, could not resolve socketId ${socketId}, ${userName}`);
      return undefined;
    }
    return this.socketIdsToGameIds.get(socketId);
  }

  getGamesList() {
    // We do not return ready status here.  Maybe change in future?
    return Array.from(this.gamesMap).filter( ([,game]) => game.players.guest == null).map(([key, entry]) =>
      ({ hostName: this.getUserNameFromSocketId(entry.players.host.socketId), gameId: key, dimensions: entry.dimensions, description: entry.description }));
  }

  isPlayerHost({ socketId, userName }) {
    const gameId = this.getAssociatedGameId({ socketId, userName });
    const game = this.gamesMap.get(gameId);
    if (game) {
      if (game.players.host.socketId == socketId) {
        return true;
      }
    }
    return false;
  }

  validateGameParameters({ dimensions, description }) {
    if (Object.keys(dimensions).length == 2 &&
      typeof dimensions.boardWidth == "number" &&
      typeof dimensions.boardHeight == "number" &&
      dimensions.boardWidth >= MIN_BOARD_DIMENSION &&
      dimensions.boardWidth < MAX_BOARD_DIMENSION &&
      dimensions.boardHeight >= MIN_BOARD_DIMENSION &&
      dimensions.boardHeight < MAX_BOARD_DIMENSION &&
      typeof description == "string" &&
      description.length < MAX_DESCRIPTION_LENGTH ) { return true; }
    else {
      return false;
    }
  }
}
