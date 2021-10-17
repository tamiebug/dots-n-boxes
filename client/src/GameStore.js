import { createStore } from "./createStore";
import { useStore } from "./useStore";
import { GameEngine } from "./GameEngine";
import { Move, MoveHistory, SquareGrid, TaggedGrid } from "./utility";
import { playerTypes, Player } from "./player";
import { CPUTypes } from "./CPU";

// Useful constants extracted here for easy changing
export const NUMBER_PLAYERS = 2;
export const MAX_BOARD_SIZE = 30;
export const MIN_BOARD_SIZE = 3;
export const ALLOWED_GAME_TYPES = ['CPU', 'local', 'online'];
export const ALLOWED_DIFFICULTIES = ['random', 'weak', 'basic'];

export const appStates = Object.freeze({
  PRE_MATCH:    Symbol("pre-game"),
  MATCH:        Symbol("match"),
  PAUSED:       Symbol("pause"),
  DISCONNECTED: Symbol("disconnected"),
  POST_GAME:    Symbol("post-game"),
});

const initialGameStoreState = {
  'matchNumber': 0,                   // int
  'players': [],                      // Player
  'currentPlayer': null,              // int
  'moveHistory': null,                // MoveHistory
  'gameBoardState': null,             // SquareGrid
  'taggedGrid': null,                 // TaggedGrid
  'appState': appStates.PRE_MATCH,    // appState
  'gameSettings': {},                 // object
  'appSettings' : {},                 // object
};

export const gameStore = createStore( gameStateReducer, () => initialGameStoreState );
export const useGameStore = () => useStore( gameStore );
const gameEngine = new GameEngine( gameStore );  // eslint-disable-line no-unused-vars

function gameStateReducer(state, action) {
  const { matchNumber, players, currentPlayer, gameBoardState, taggedGrid , moveHistory, appState } = state;
  switch(action.type) {
  case '__runBatchedActions':
    validateAction(action, [{ key: 'batchedActions', 'instanceOf': Array }]);
    return action.batchedActions.reduce(gameStateReducer, {...state});

  case 'incrementMatchNumber':
    return {...state, 'matchNumber': matchNumber + 1};

  case 'addScore':
    validateAction(action, [{ key: 'player', typeOf: 'number' }, { key: 'points', typeOf: 'number' }]);
    if (action.player > players.length || action.player < 0) throw `gameStateReducer dispatch failure: 'addScore' called on player number ${action.player}`;
    if (action.points == 0) return {...state};
    return {...state, players: players.map( (player, index) => index==action.player ? player.addScore( action.points ) : player )};

  case 'updateOwnershipGrid':
    validateAction(action, [{ key: 'completedBoxes', 'instanceOf': Array }, { key: 'initials', typeOf: 'string' }]);
    return {...state,
      'taggedGrid': taggedGrid.update(
        action.completedBoxes.map(box => ({
          'values': { initials: action.initials },
          'row': box[0],
          'column': box[1]
        }))
      ),
    };

  case 'updateBoardState':
    validateAction(action, [{ key: 'move', 'instanceOf': Move }]);
    return {...state, gameBoardState: gameBoardState.update(action.move)};

  case 'startNextTurnIfAble': {
    validateAction(action, [{ key: 'samePlayerGoes', typeOf:  'boolean' }]);
    return {...state, currentPlayer: (currentPlayer + (action.samePlayerGoes ? 0 : 1)) % NUMBER_PLAYERS };
  }

  case 'localMoveAttempt': {
    validateAction( action, [{ key: 'move', 'instanceOf': Move }]);
    if ( players[currentPlayer].isLocal() ) {
      return gameStateReducer({...state}, { type: 'attemptMove', move: action.move, player: currentPlayer });
    } else {
      return {...state};
    }
  }

  case 'onlineMoveAttempt': {
    validateAction( action, [{ key: 'move', 'instanceOf': Move }]);
    if ( players[currentPlayer].isRemote() ) {
      return gameStateReducer({...state}, { type: 'attemptMove', move: action.move, player: currentPlayer });
    } else {
      // ignore the move, it's not the remote player's turn.
      return {...state};
    }
  }

  case 'attemptMove': {
    validateAction(action, [{ key: 'move', 'instanceOf': Move }]);
    if (appState !== appStates.MATCH) return {...state};
    if (!gameBoardState.isMovePossible(action.move)) throw `gameStateReducer dispatch failure:  'attemptMove' was called on invalid move ${action.move.toString()}`;

    const boxesCompletedByMove = gameBoardState.boxesCompletedBy(action.move);
    return gameStateReducer({...state}, { type: '__runBatchedActions', batchedActions: [
      { type: 'addMoveToHistory', move: action.move, range: action.range, player: currentPlayer },
      { type: 'updateOwnershipGrid', completedBoxes: boxesCompletedByMove, initials: players[currentPlayer].getNameInitials()},
      { type: 'updateBoardState', move: action.move },
      { type: 'addScore', player: currentPlayer, points: boxesCompletedByMove.length },
      { type: 'startNextTurnIfAble', samePlayerGoes: boxesCompletedByMove.length > 0 },
    ]});
  }

  case 'addMoveToHistory':
    validateAction(action, [{ key: 'player', typeOf: 'number'}, { key: 'move', 'instanceOf': Move }]);
    return {...state, moveHistory: moveHistory.update(action.move, action.player, action.range)};

  case 'attemptMoveTakeback': {
    if ( moveHistory.length < 1 ) throw new Error(`attemptMoveTakeback run with insufficient moves in history: ${moveHistory.length}`);
    let { move: lastMove, player: lastPlayer, newMoveHistory } = moveHistory.popUpdate();
    let revertedGameBoardState = gameBoardState.copy();

    if ( players[lastPlayer].isLocal() ) {
      revertedGameBoardState = revertedGameBoardState.remove( lastMove );
      const boxesCompletedByMove = revertedGameBoardState.boxesCompletedBy( lastMove );

      return gameStateReducer({...state, moveHistory: newMoveHistory, gameBoardState: revertedGameBoardState},
        { type: '__runBatchedActions', batchedActions: [
          { type: 'updateOwnershipGrid', completedBoxes: boxesCompletedByMove, initials: ""},
          { type: 'addScore', player: lastPlayer, points: boxesCompletedByMove.length * -1 },
          { type: 'startNextTurnIfAble', samePlayerGoes: boxesCompletedByMove.length > 0},
        ]}
      );
    } else if ( players[lastPlayer].isCPU() ){
      let boxesCompletedByLastMove = 0;
      const reducerActions = [];

      // Undo all of the AI's moves that went after your move.
      while ( players[lastPlayer].isCPU() ) {
        revertedGameBoardState = revertedGameBoardState.remove(lastMove);
        boxesCompletedByLastMove = revertedGameBoardState.boxesCompletedBy(lastMove);

        reducerActions.push({ type: 'updateOwnershipGrid', completedBoxes: boxesCompletedByLastMove, initials: ""});
        reducerActions.push({ type: 'addScore', player: lastPlayer, points: boxesCompletedByLastMove.length * -1});

        ({ move: lastMove, player: lastPlayer, newMoveHistory: newMoveHistory } = newMoveHistory.popUpdate());
      }

      // Undo your move (since the AI went after you, you didn't complete boxes that turn, we can skip that step)
      revertedGameBoardState = revertedGameBoardState.remove(lastMove);
      boxesCompletedByLastMove = revertedGameBoardState.boxesCompletedBy(lastMove);

      reducerActions.push({ type: 'startNextTurnIfAble', samePlayerGoes: true });

      return gameStateReducer({...state, moveHistory: newMoveHistory, gameBoardState: revertedGameBoardState},
        {type: '__runBatchedActions', batchedActions: reducerActions});
    } else {
      throw new Error(`attemptMoveTakeback not supported for players of type ${players[(action.player + 1) % 2].constructor.name}`);
    }
  }

  case 'setUpGame':
    validateAction(action, [{ key: 'settings', typeOf: 'object' }, { key: 'appSettings', typeOf: 'object' }]);
    validateSettings(action.settings);
    return setUpGame(action.settings, state, action.appSettings);

  case 'loadGame': {
    validateAction(action, [{ key: 'moveHistory', "instanceOf": MoveHistory }]);

    // We want to deactivate the game before applying moves to avoid AI agents attempting to make moves, reactivate before last applied move.
    const moveReducerActions = [ { type: 'deactivateGame' } ];
    const { move: lastMove, player: lastPlayer, range: lastRange, newMoveHistory } = action.moveHistory.popUpdate();

    for (let moveAction of newMoveHistory.getRawHistory()) {
      moveReducerActions.push({
        type: "attemptMove",
        player: moveAction.player,
        move: moveAction.move,
        range: moveAction.range,
      });
    }

    moveReducerActions.push({ type: 'activateGame' });
    moveReducerActions.push({
      type: "attemptMove",
      player: lastPlayer,
      move: lastMove,
      range: lastRange,
    });

    return gameStateReducer({...state}, { type: '__runBatchedActions', batchedActions: moveReducerActions });
  }
  case 'activateGame':
    return {...state, appState: appStates.MATCH };

  case 'deactivateGame':
    console.log("GAME DEACTIVATED");
    return {...state, appState: appStates.PAUSED };

  case 'showChains': {
    validateAction(action, [{ key: 'chains', 'instanceOf': Array}]);
    const boxTags = renderBoxChainsIntoTags(action.chains);
    return {...state, taggedGrid: taggedGrid.clearTagForAll("taggedChain").update(boxTags)};
  }
  case 'hideChains':
    // set the CSS rule somehow... maybe we don't need this and it happens as part of round end/start?   Idk, tbd.
    return {...state};

  default:
    throw `gameStateReducer received an invalid action type ${action.type}`;
  }
}

function setUpGame( settings, state, appSettings ) {
  let player1, player2;
  switch (settings.gameType) {
  case "local":
    player1 = new Player(settings.playerNames[0], playerTypes.LOCAL);
    player2 = new Player(settings.playerNames[1], playerTypes.LOCAL);
    break;
  case "CPU": {
    player1 = new Player(settings.playerNames[0], playerTypes.LOCAL);

    let cpuType = {
      "random": CPUTypes.RANDOM,
      "weak": CPUTypes.WEAK,
      "basic": CPUTypes.BASIC,
    }[settings.cpuDifficulty];
    if (cpuType === undefined) throw `Incorrect settings.cpuDifficulty value: ${settings.cpuDifficulty}`;

    player2 = new Player(settings.playerNames[1], playerTypes.CPU, cpuType );
    break;
  } case "online":
    player1 = new Player(settings.playerNames[0], settings.isHost ? playerTypes.LOCAL : playerTypes.REMOTE );
    player2 = new Player(settings.playerNames[1], !settings.isHost ? playerTypes.LOCAL : playerTypes.REMOTE );
    break;
  default:
    throw `incorrect settings.gameType value: ${settings.gameType}`;
  }
  return {...state,
    'players': [player1, player2],
    'currentPlayer': 0,
    'moveHistory': new MoveHistory(),
    'matchNumber': state.matchNumber + 1,
    'gameBoardState': new SquareGrid(settings.boardWidth, settings.boardHeight),
    'taggedGrid': new TaggedGrid(settings.boardWidth, settings.boardHeight),
    'appState': appStates.MATCH,
    'gameSettings': settings,
    'appSettings': {...appSettings},
  };
}

function validateSettings(settings) {
  if (!settings.playerNames || settings.playerNames.length !== NUMBER_PLAYERS) {
    throw `validateSettings: invalid number of player names in settings.playerNames, or nonexistent player name array; given array is ${settings.playerNames}`;
  }
  if (ALLOWED_GAME_TYPES.indexOf(settings.gameType) == -1) {
    throw `validateSettings: invalid gameType, only allowed types are ${ALLOWED_GAME_TYPES}, received ${settings.gameType}`;
  }
  if (settings.gameType == "CPU" && (ALLOWED_DIFFICULTIES.indexOf(settings.cpuDifficulty) == -1)) {
    throw `validateSettings: invalid cpuDifficulty, only allowed types are ${ALLOWED_DIFFICULTIES}, ${settings.cpuDifficulty} was selected.`;
  }
  if (!Number.isInteger(settings.boardWidth) || settings.boardWidth < 2 || settings.boardWidth > MAX_BOARD_SIZE) {
    throw `validateSettings: invalid boardWidth, value ${settings.boardWidth} passed in`;
  }
  if (!Number.isInteger(settings.boardHeight) || settings.boardHeight < 2 || settings.boardHeight > MAX_BOARD_SIZE) {
    throw `validateSettings: invalid boardHeight, value ${settings.boardHeight} passed in`;
  }
  return;
}

function renderBoxChainsIntoTags(boxChains) {
  const tags = [];

  let currentHue = 360 * Math.random();
  const hueStep = 360 / boxChains.length;

  for (const boxChain of boxChains) {
    currentHue = (currentHue + hueStep) % 360;
    for (const box of boxChain) {
      tags.push({ column: box[0], row: box[1], values: { taggedChain: { color: `hsl(${currentHue}, 50%, 50%)` }}});
    }
  }
  return tags;
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
}
