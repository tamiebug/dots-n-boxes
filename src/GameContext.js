import { createContext } from "react";
import { Move, SquareGrid , OwnershipGrid } from "./utility.js";
import { Player, LocalHumanPlayer, BasicAI, RandomPlayer, WeakAI } from "./players.js";

// Useful constants extracted here for easy changing
export const NUMBER_PLAYERS = 2;
export const MAX_BOARD_SIZE = 30;
export const MIN_BOARD_SIZE = 2;
export const ALLOWED_GAME_TYPES = ['CPU', 'local'];
export const ALLOWED_DIFFICULTIES = ['random', 'weak', 'basic'];

export const GameStateContext = createContext();

export const initialGameState = {
	'matchNumber': 0,						// int
	'players': [],							// [ Player ]
	'playerActionCallbacks': [],// [ function ]
	'currentPlayer': null,			// int
	'gameBoardState': null,			// SquareGrid
	'ownershipGrid': null,			// OwnershipGrid
	'gameActive': false,				// boolean
};

export const gameStateReducer = function(state, action) {
	const { matchNumber, players, playerActionCallbacks, currentPlayer, gameBoardState, ownershipGrid, gameActive } = state;
	// console.log(`action: ${Object.entries(action)}`);
	switch(action.type) {
		case '__runBatchedActions':
			validateAction(action, [{ key: 'batchedActions', 'instanceOf': Array }]);
			return action.batchedActions.reduce(gameStateReducer, {...state});

		case 'incrementMatchNumber':
			return {...state, 'matchNumber': matchNumber + 1};

		case 'registerPlayerCallback':
			validateAction(action, [{ key: 'player', typeOf: 'number' }, { key: 'callback', typeOf: 'function' }]);
			players[action.player].registerCallback(action.callback);
			return {...state,
				playerActionCallbacks: playerActionCallbacks.map((callback, _index) => { return (_index == action.player) ? action.callback : callback })}	

		case 'addScore':
			validateAction(action, [{ key: 'player', typeOf: 'number' }, { key: 'points', typeOf: 'number' }]);
			if (action.player > players.length || action.player < 0) throw `gameStateReducer dispatch failure: 'addScore' called on player number ${action.player}`;
			if (action.points == 0) return {...state};
			return {...state, players: players.map((_player, index) => {
				return (index == action.player) ? _player.addScore(action.points).registerCallback(playerActionCallbacks[action.player]) : _player
			})};

		case 'updatePlayers':
			validateAction(action, [{ key: 'samePlayerGoes', typeOf: 'boolean' }]);
			players.forEach((player) =>	player.updatePlayerState(gameBoardState));
			return {...state, 
				currentPlayer: (currentPlayer + (action.samePlayerGoes ? 0 : 1)) % NUMBER_PLAYERS,
			}

		case 'updateOwnershipGrid':
			validateAction(action, [{ key: 'completedBoxes', 'instanceOf': Array }, { key: 'initials', typeOf: 'string' }]);
				return {...state,
				'ownershipGrid': ownershipGrid.update(
					action.completedBoxes.map(box => ({
						'value': players[currentPlayer].getNameInitials(),
						'row': box[0],
						'column': box[1]
					}))
				),
			};

		case 'updateBoardState':
			validateAction(action, [{ key: 'move', 'instanceOf': Move }]);
			return {...state, gameBoardState: gameBoardState.update(action.move)}

		case 'endCurrentTurn':
			players[currentPlayer].endTurn();
			return {...state};

		case 'startNextTurnIfAble':
			validateAction(action, [{ key: 'samePlayerGoes', typeOf:  'boolean' }]);
			
			// Are we able to start the next turn?  We know this if score is correct.
			const maxPointsPossible = (gameBoardState.nRows - 1) * (gameBoardState.nColumns - 1)
			const pointsScored = players.reduce((totalScore, player) => player.score + totalScore, 0);
			
			if (pointsScored == maxPointsPossible) {
				// TODO: potentially change some other state variable indicating winner in future?
				return gameStateReducer({...state}, { type: 'deactivateGame' })
			} // else
			players[currentPlayer].startTurn();
			return {...state};

		case 'attemptMove':
			validateAction(action, [{ key: 'player', typeOf: 'number' }, { key: 'move', 'instanceOf': Move }]);
			if (!gameBoardState.isMovePossible(action.move)) throw `gameStateReducer dispatch failure:  'attemptMove' was called on invalid move ${action.move.toString()}`;
			if (currentPlayer !== action.player) throw `gameStateReducer dispatch failed: 'attemptMove' was called on by player ${action.player} during opponent's turn`;

			const boxesCompletedByMove = gameBoardState.boxesCompletedBy(action.move);

			return gameStateReducer({...state}, { type: '__runBatchedActions', batchedActions: [
				{ type: 'updateOwnershipGrid', completedBoxes: boxesCompletedByMove, initials: players[currentPlayer].getNameInitials()},
				{ type: 'updateBoardState', move: action.move },
				{ type: 'addScore', player: currentPlayer, points: boxesCompletedByMove.length },
				{ type: 'endCurrentTurn' },
				{ type: 'updatePlayers', samePlayerGoes: boxesCompletedByMove.length > 0 },
				{ type: 'startNextTurnIfAble', samePlayerGoes: boxesCompletedByMove.length > 0 },
			]});

		case 'attemptMoveTakeback':
			validateAction(action, [{ key: 'player', typeOf: 'number' }]);
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
			throw `gameStateReducer received an invalid action type ${action.type}`;
			break;
	}
};

function setUpGame(settings, state) {
	// TODO: This code path does not support non-two player games.  May need change
	let player1, player2;
	switch (settings.gameType) {
		case "local":
			player1 = new LocalHumanPlayer(settings.playerNames[0]);
			player2 = new LocalHumanPlayer(settings.playerNames[1]);
			break;
			case "CPU":
			player1 = new LocalHumanPlayer(settings.playerNames[0]);
			switch (settings.cpuDifficulty) {
				case "random":
					player2 = new RandomPlayer(settings.playerNames[1]);
					break;
				case "weak":
					player2 = new WeakAI(settings.playerNames[1]);
					break;
				case "basic":
					player2 = new BasicAI(settings.playerName[1]);
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
		'playerActionCallbacks': [() => {}, () => {}],
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
	if (ALLOWED_GAME_TYPES.indexOf(settings.gameType) == -1) {
		throw `validateSettings: invalid gameType, only allowed types are ${ALLOWED_GAME_TYPES}, received ${settings.gameType}`;
	}	
	if (settings.gameType == "CPU" && (ALLOWED_DIFFICULTIES.indexOf(settings.cpuDifficulty) == -1)) {
		throw `validateSettings: invalid cpuDifficulty, only allowed types are ${ALLOWED_DIFFICULTIES}, ${settings.cpuDifficulty} was selected.`;
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
		throw `gameStateReducer action validator failure: expecations list not array`;
	}
	expectations.forEach((expectation) => {
		// TODO:  Does it matter that validateAction doesn't properly work on instanceof expectations if checking across frames and execution contexts?  Highly doubt it does, should check then delete this comment if not.
		if (typeof expectation.key !== 'string') { 
			throw `gameStateReducer expectation format failure: Expectation object ${expectation} does not contain necessary 'key' field to describe desired action fields`;
		} else if (!!expectation.typeOf && ((typeof action[expectation.key]) !== expectation.typeOf)) {
			throw `gameStateReducer action validation error: Given action ${action.type} has invalid field value type -- ${expectation.key} is not of type ${expectation.typeOf}, it is instead a ${typeof action[expectation.key]}`;
		} else if ((expectation.instanceOf !== undefined) && !(action[expectation.key] instanceof expectation.instanceOf)) {
			throw `gameStateReducer action validation error: Given action ${action.type} has invalid field value type -- ${expectation.key} is not an instance of ${expectation.instanceOf}`;
		} 
	});
	return;
};