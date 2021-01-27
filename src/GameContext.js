import { createContext } from "react";
import { Move, SquareGrid , OwnershipGrid } from "./utility.js";
import { LocalHumanPlayer, BasicAI, RandomPlayer, WeakAI } from "./players.js";

// Useful constants extracted here for easy changing
const NUMBER_PLAYERS = 2;
const MAX_BOARD_SIZE = 30;
const ALLOWED_GAME_TYPES = ['CPU', 'local'];
const ALLOWED_DIFFICULTIES = ['random', 'weak', 'basic'];

export const GameStateContext = createContext({
	'matchNumber': 0,
	'players': [],
	'currentPlayer': null,
	'gameBoardState': null,
	'ownershipGrid': null,
});

export const gameStateContextReducer = function(state, action) {
	const { matchNumber, players, currentPlayer, gameBoardState, ownershipGrid } = state;
	switch(action.type) {
		// Meant for gameStateContextReducer internal code reuse puposes only
		case '__runBatchedActions':
			validateAction(action, [{ key: 'batchedActions', instanceOf: Array }]);
			return action.batchedActions.reduce(gameStateContextReducer, {...state});
		case 'incrementMatchNumber':
			return {...state, 'matchNumber': matchNumber + 1};
		case 'addScore':
			validateAction(action, [{ key: 'player', instanceOf: Number }, { key: 'points', instanceOf: Number}]);
			if (action.player > players.length || action.player < 0) throw `gameStateContextReducer dispatch failure: 'incrementScore' called on player ${action.player}`;
			return {...state, 'players': players.map((_player, index) => { 
				return (index == action.player) ? _player.addScore(action.points) : _player
			})};
		case 'attemptMove':
			validateAction(action, [{ key: 'player', typeOf: 'number' }, { key: 'move', instanceOf: Move }]);
			if (!gameBoardState.isMovePossible(action.move)) throw `gameStateContextReducer dispatch failure:  'attemptMove' was called on invalid move ${action.move}`;
			if (players[currentPlayer] !== action.player) throw `gameStateContextReducer dispatch failed: 'attemptMove' was called on by player ${action.player} during opponent's turn`;

			const boxesCompletedByMove = gameBoardState.boxesCompletedBy(move);
			return {
				'boardState': gameBoardState.update(move),
				'ownershipGrid': ownershipGrid.update(
					boxesCompletedByMove.map(box => ({
						'value': player.getNameInitials(),
						'row': box[0],
						'column': box[1]}))),
				'players': players.map((player, index) => { return index == currentPlayer ? players[currentPlayer].addScore(boxesCompleted.length) : player; }),
				'currentPlayer': (currentPlayer + ((boxesCompleted.length == 0) ? 0 : 1)) % NUMBER_PLAYERS
			}
		case 'attemptMoveTakeback':
			validateAction(action, [{ key: 'player', typeOf: 'number' }]);
			// TODO:
			// STEPS:
			// 1. Authenticate player calling 'attemptMoveTakeback'.  Needs to be the player that went last turn (currentPlayer - 1?)
			// 2. Check whether a previous has even been done [we may be on turn 0]
			// 3. Attempt to call state.gameState.remove(lastMove), where move is from above.  If returns a non-null, this is a valid state and continue
			// 4. Call boxesCompletedBy(lastMove) on this new board, and proceed to call state.ownershipGrid.update on these moves
			// 5. run AddScore(-boxesCompleted.length)
			// 6. Set currentPlayer to the previous player, same logic as 'attemptMove', except where you _subtract_ instead of add [VERY IMPORTANT]
			//
			// Extra note: It may be useful to factor the player authentication code out, because it might be called in the future in remote play sessions to let them know if a takeback is allowed.
			// Extra note II: We might want to refactor code shared with attemptMove into a third, internal-use-exclusive reducer action (like __updateStuff)
			break;
		case 'setUpGame':
			validateAction(action, [{key: 'settings', typeOf: 'object'}]);
			validateSettings(action.settings);
			return setUpGame(action.settings, state);
		case 'activateGame':
			return {...state, 'gameActive': true};
		case 'deactivateGame':
			return {...state, 'gameActive': false};
		
		default:
			throw `gameStateContextReducer received an invalid action type ${action.type}`;
			break;
	}
};

function setUpGame(settings, state) {
	// TODO: This code path does not support non-two player games.  May need change
	let player1, player2;
	switch (settings.gameType) {
		case "local":
			player1 = new LocalHumanPlayer(settings.playerName1);
			player2 = new LocalHumanPlayer(settings.playerName2);
			break;
			case "CPU":
			player1 = new LocalHumanPlayer(settings.playerName1);
			switch (settings.cpuDifficulty) {
				case "random":
					player2 = new RandomPlayer(settings.playerName2);
					break;
				case "weak":
					player2 = new WeakAI(settings.playerName2);
					break;
				case "basic":
					player2 = new BasicAI(settings.playerName2);
					break;
				default:
					throw `Incorrect settings.cpuDifficulty value: ${settings.cpuDifficulty}`;
			}
			break;
		default:
			throw `incorrect settings.gameType value: ${settings.gameType}`;
	}

	return {...state,
		'players': [player1, player2],
		'currentPlayer': 0,
		'matchNumber': state.matchNumber + 1,
		'gameBoardState': new SquareGrid(settings.boardWidth, settings.boardHeight),
		'ownershipGrid': new OwnershipGrid(settings.boardWidth, settings.boardHeight),
		'gameActive': true,
	}
}

function validateSettings(settings) {	
	if (!settings.playerNames || settings.playerNames.length !== NUMBER_PLAYERS) {
		throw `validateSettings: invalid number of player names in settings.playerNames, or nonexistent player name array; given array is ${settings.playerNames}`
	}
	if (ALLOWED_GAME_TYPES.indexOf(settings.gameType == -1)) {
		throw `validateSettings: invalid gameType, only allowed types are ${ALLOWED_GAME_TYPES}, received ${settings.gameType}`;
	}	
	if (settings.gameType == "CPU" && ALLOWED_DIFFICULTIES.indexOf(settings.cpuDifficulty)) {
		throw `validateSettings: invalid cpuDifficulty, only allowed types are ${ALLOWED_DIFFICULTIES}`;
	}	
	if (!Number.isInteger(settings.boardWidth) || settings.boardWidth < 2 || settings.boardWidth > MAX_BOARD_SIZE) { 
		throw `validateSettings: invalid boardWidth, value ${settings.boardWith} passed in`;
	}
	if (!Number.isInteger(settings.boardHeight) || settings.boardHeight < 2 || settings.boardHeight > MAX_BOARD_SIZE) {
		throw `validateSettings: invalid boardHeight, value ${settings.boardHeight} passed in`;
	}
	return;
}

function validateAction(action, expectations) {
	if (!Array.isArray(expectations)) {
		throw `gameStateContextReducer action validator failure: expecations list not array`;
	}
	expectations.forEach((expectation) => {
		if (typeof expectation.key !== 'string') { 
			throw `gameStateContextReducer expectation format failure: Expectation object ${expectation} does not contain necessary 'key' field to describe desired action fields`;
		} else if (!!expectation.typeOf && ((typeof action[expectation.key]) !== expectation.typeOf)) {
			throw `gameStateContetReducer action validation error: Given action ${action} has invalid field value type -- ${expectation.key} is not of type ${typeof action[expectation.key]}`;
		} else if ((expectation.instanceOf !== undefined) && !(action[expectation.key] instanceof expectation.instanceOf)) {
			throw `gameStateContextReducer action validation error: Given action ${action} has invalid field value type -- ${expectation.key} is not an instance of ${expectation.instanceOf}`;
		} 
	});
	return;
};