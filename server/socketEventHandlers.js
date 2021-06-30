import { serverApi as sApi, clientApi as cApi} from "../api.js";
import { DataStore } from "./DataStore.js";
import log from "./logger.js";

export const socketEventHandlers = {
	'disconnect' : handlePlayerDisconnect,
	[sApi.ReserveName] : handleReserveName,
	[sApi.GetOpenGamesList] : getOpenGamesList,
	[sApi.CreateLobby] :  handleCreateLobby,
	[sApi.JoinLobby] : handleJoinLobby,
	[sApi.LeaveLobby] : handleLeaveLobby,
	[sApi.KickPlayer] : handleKickPlayer,
	[sApi.PlayerStatusChange] : handlePlayerStatusChange,
	[sApi.AttemptMove] : handleMoveAttempt,
};

const ds = new DataStore();

export function clearDataStore() {
	/* for testing purposes */
	ds.clearDataStore();
	return;
}

function handlePlayerDisconnect({ socket, io }) {
	const result = ds.removePlayerFromCurrentGame({ socketId: socket.id });

	if (result.wasHost && result.guestSocketId) {
		io.to( result.guestSocketId ).emit( cApi.HostLeft );
	}

	log.info(`user SOCK:${socket.id} NAME:${ds.getUserNameFromSocketId(socket.id)} disconnected`);
	ds.unRegisterPlayer({ socketId: socket.id });
	return;
}

function handleReserveName({ socket, data, callback }) {
	log.verbose(`name reserve request for name ${data.name} and socket ${socket.id}`);
	const result = ds.registerName({ userName: data.name, socketId: socket.id });
	if ( result.success ){
		log.verbose(`successfully registered ${data.name}!`);
		callback({ available: true });
	} else if ( result.pairAlreadyExists ) {
		log.verbose(`registration failure: exact pair already exists`);
		callback({ available: false, pairAlreadyExists: true });
	} else {
		log.verbose(`registration failure, name taken or invalid socketId`);
		callback({ available: false, pairAlreadyExists: false });
	}
}

function handleJoinLobby({ socket, data, callback, io }) {
	log.verbose(`${ds.getUserNameFromSocketId(socket.id)} is attempting to join ${data.userName}'s lobby`);
	const gameId = ds.joinGame({ host: { userName: data.userName }, guest: { socketId: socket.id }});
	if ( gameId === null ) {
		log.verbose(`${ds.getUserNameFromSocketId(socket.id)} could not join ${data.userName}'s lobby`);
		callback({ success: false });
		return;
	}

	log.verbose(`${ds.getUserNameFromSocketId(socket.id)} successfully joined ${JSON.stringify(ds.getGame( gameId ))}`);
	const hostSocketId = ds.getGame( gameId ).players.host.socketId;
	io.to( hostSocketId ).emit( cApi.GuestJoined , { playerName: ds.getUserNameFromSocketId( socket.id ) });
	callback({ success: true });
}

function handleCreateLobby({ socket, data, callback }) {
	if (!data.settings || !data.settings.dimensions || !data.settings.dimensions.boardWidth
				|| !data.settings.dimensions.boardHeight || !data.settings.description ) {
		log.verbose(`${ds.getUserNameFromSocketId(socket.id)} attempted to create game with invalid settings`);
		callback({ success: false, reason: "No proper settings object"});
		return;
	}

	const gameId = ds.createGame({ socketId: socket.id, dimensions: data.settings.dimensions, description: data.settings.description});
	if (gameId == null) {
		log.verbose(`Making game lobby with host ${ds.getUserNameFromSocketId( socket.id )} failed `);
		callback({ success: false, reason: "Could not make game lobby"});
		return;
	}

	log.info(`lobby successfully created with HOSTNAME: ${ds.getUserNameFromSocketId( socket.id )} and GAMEID: ${gameId}`);
	callback({ success: true });
}

function handleLeaveLobby({ socket, callback, io }) {
	const result = ds.removePlayerFromCurrentGame({ socketId: socket.id });
	if ( result.failed ) {
		callback({ success: false, reason: `Failed to remove player ${ds.getUserNameFromSocketId( socket.id )} from lobby`});
	}
	
	log.info(`player ${ds.getUserNameFromSocketId(socket.id)} has left lobby`);
	if ( result.wasHost ) {
		io.to( result.guestSocketId ).emit( cApi.HostLeft );
		callback({ success: true });
	} else { // is guest
		io.to( result.hostSocketId ).emit( cApi.GuestLeft );
		callback({ success: true });
	}
}

function handleKickPlayer({ socket, callback, io }) {
	const gameId = ds.getAssociatedGameId({ socketId: socket.id });
	if (!gameId) {
		callback({ success: false, reason: "Could not find player game ID"});
		return;
	}

	const guestSocketId = ds.getGame(gameId).players.guest?.socketId;
	if (guestSocketId && guestSocketId !== socket.id) {
		const result = ds.removePlayerFromCurrentGame(guestSocketId);
		io.to( result.guestSocketId ).emit( cApi.HostKicked );
		callback({ success: true });
	} else if (guestSocketId == socket.id) {
		callback({ success: false, reason: "Only Host can kick"});
	} else {
		callback({ success: false, reason: "Game had no one to kick"});
	}
}

function handlePlayerStatusChange({ socket, data, callback, io }) {
	const gameId = ds.getAssociatedGameId({ socketId: socket.id });
	if (!gameId) {
		callback({ success: false, reason: "Cannot find associated player gameId.  Are they in a game?"});
		return;
	}	

	const game = ds.getGame(gameId);
	const isHost = game.players.host.socketId == socket.id;
	
	const guestSocketId = game.players.guest?.socketId;
	const hostSocketId = game.players.host.socketId;

	if (isHost) {
		game.players.host.ready = !!data.ready;
		callback({ success: true });
		if (guestSocketId) {
			io.to( guestSocketId ).emit(data.ready ? cApi.HostReady : cApi.HostNotReady);
		}
	} else { // isNotHost
		game.players.guest.ready = !!data.ready;
		callback({ success: true });
		io.to( hostSocketId ).emit(data.ready ? cApi.GuestReady : cApi.GuestNotReady);
	}

	if (game.players.host.ready && game.players.guest?.ready) {
		log.info(`Starting game between ${ds.getUserNameFromSocketId(game.players.host.socketId)} and ${ds.getUserNameFromSocketId(game.players.guest.socketId)} with gameId ${gameId}`);
		io.to( hostSocketId ).emit(cApi.StartGame, { settings: { dimensions: game.dimensions }});
		io.to( guestSocketId ).emit(cApi.StartGame, { settings: { dimensions: game.dimensions }});
		callback({ success: true });
	}
}

function handleMoveAttempt({ socket, data, callback, io }) {
	log.debug(`MOVE_ATTEMPT ${JSON.stringify(data.move)} from PLAYER_NAME ${ds.getUserNameFromSocketId(socket.id)}`);
	const gameId = ds.getAssociatedGameId({ socketId: socket.id });
	if (!gameId) {
		callback({ success: false, reason: "Cannot find associated game for player.  Are you sure that they are in one?"});
	}

	const game = ds.getGame(gameId);
	const playerSockets = { host: game.players.host.socketId, guest: game.players?.guest.socketId };
	const otherPlayerSocketId = playerSockets.host == socket.id ? playerSockets.guest : playerSockets.host;

	if (!otherPlayerSocketId) {
		callback({ success: false, reason: "Internal Error:  Cannot find other player"});
	}

	io.to( otherPlayerSocketId ).emit(cApi.MoveAttempted, { move: data.move });
	log.debug(`MOVE_SENT ${JSON.stringify(data.move)} to PLAYER_NAME ${ds.getUserNameFromSocketId(otherPlayerSocketId)}`);
	callback({ success : true });
}

function getOpenGamesList({ callback }) {
	callback(ds.getGamesList());
}