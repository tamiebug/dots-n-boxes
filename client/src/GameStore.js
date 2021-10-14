import { useEffect, useContext } from "react";
import { createStore } from "./createStore";
import { useStore } from "./useStore";
import { Move, MoveHistory, SquareGrid, TaggedGrid, printObjectToJSON } from "./utility";
import { LocalHumanPlayer, BasicAI, RandomPlayer, WeakAI, RemotePlayer } from "./players";
import { SocketContext } from "./SocketContext";

// Useful constants extracted here for easy changing
export const NUMBER_PLAYERS = 2;
export const MAX_BOARD_SIZE = 30;
export const MIN_BOARD_SIZE = 3;
export const ALLOWED_GAME_TYPES = ['CPU', 'local', 'online'];
export const ALLOWED_DIFFICULTIES = ['random', 'weak', 'basic'];

const initialGameStoreState = {
  'matchNumber': 0,           // int
  'players': [],              // [ Player ]
  'playerScores': [],         // [ int ]
  'currentPlayer': null,      // int
  'numberMovesCompleted': -1, // int
  'moveHistory': null,        // MoveHistory
  'gameBoardState': null,     // SquareGrid
  'taggedGrid': null,         // TaggedGrid
  'gameActive': false,        // boolean
  'gameSettings': {}          // object
};

export const gameStore = createStore( gameStateReducer, () => initialGameStoreState );
export const useGameStore = () => useStore( gameStore );

export function useGameStateStore(appSettings) {
	const [ gameState, gameStateDispatch ] = useStore( gameStore ); 
  const { players, playerScores, gameBoardState } = gameState;
  const { registerOnlineMoveCallback, attemptOnlineMove } = useContext(SocketContext);

  useEffect(() => {
    if (gameState.numberMovesCompleted > -1) {
      gameState.players[gameState.currentPlayer].startTurn();
    }
  }, [gameState.numberMovesCompleted]);

  useEffect(() => {
    registerOnlineMoveCallback( incomingMoveCallback );
    players.forEach( player => {
      if (player instanceof RemotePlayer) {
        player.registerOutgoingMoveCallback(attemptOnlineMove);
      }
    });
  }, [ players ]);

  useEffect(() => {
    if (gameBoardState == null) return;
    const maxPointsPossible = (gameBoardState.nRows - 1) * (gameBoardState.nColumns - 1);
    const pointsScored = playerScores.reduce((totalScore, playerScore) => playerScore + totalScore, 0);
    
    if (pointsScored == maxPointsPossible) {
      const gameIsTied = playerScores[0] == playerScores[1];
      const playerOneWon = playerScores[0] > playerScores[1];
      if ( gameIsTied ) {
        window.alert(`The game was a tie!`);
      } else if ( playerOneWon ) {
        window.alert(`${players[0]._name} has won!`);
      } else /* player two won */ {
        window.alert(`${players[1]._name} has won!`);
      }
      if (appSettings.debugMode && window.confirm(`Would you like to show JSON of last match's moves?`)) printObjectToJSON(gameState.moveHistory);
    }
  }, [ gameState.gameActive ]);

  function incomingMoveCallback( move ) {
    players.forEach( player => {
      if (player instanceof RemotePlayer) {
        player.onOnlineMoveAttempt( move );
      }
    });
  }

  return { gameState, gameStateDispatch };
}

function gameStateReducer(state, action) {
  const { matchNumber, players, playerScores, currentPlayer, gameBoardState, taggedGrid , numberMovesCompleted, moveHistory, gameActive } = state;
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
      return {...state}

    case 'addScore':
      validateAction(action, [{ key: 'player', typeOf: 'number' }, { key: 'points', typeOf: 'number' }]);
      if (action.player > playerScores.length || action.player < 0) throw `gameStateReducer dispatch failure: 'addScore' called on player number ${action.player}`;
      if (action.points == 0) return {...state};
      return {...state, playerScores: playerScores.map( (score, index) => index==action.player ? (score + action.points) : score)};

    case 'updatePlayers':
      players.forEach((player) => player.updatePlayerState(gameBoardState));
      return {...state};

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

    case 'endCurrentTurn':
      players[currentPlayer].endTurn();
      return {...state};

    case 'startNextTurnIfAble': {
      validateAction(action, [{ key: 'samePlayerGoes', typeOf:  'boolean' }]);
      // Are we able to start the next turn?  We know this if score is correct.
      const maxPointsPossible = (gameBoardState.nRows - 1) * (gameBoardState.nColumns - 1);
      const pointsScored = playerScores.reduce((totalScore, playerScore) => playerScore + totalScore, 0);
    
      if (pointsScored == maxPointsPossible) {
        // TODO: potentially change some other state variable indicating winner in future?
        return gameStateReducer({...state}, { type: 'deactivateGame' });
      } else if (!gameActive) {
        // don't augment numberMovesCompleted as to not trigger player startTurn(s).  Triggering startTurn(s) is it's only real purpose.
        return {...state, currentPlayer: (currentPlayer + (action.samePlayerGoes ? 0 : 1)) % NUMBER_PLAYERS };
      } else {
        return {...state, currentPlayer: (currentPlayer + (action.samePlayerGoes ? 0 : 1)) % NUMBER_PLAYERS , numberMovesCompleted: numberMovesCompleted  + 1};
      }
    }
    case 'attemptMove': {
      validateAction(action, [{ key: 'player', typeOf: 'number' }, { key: 'move', 'instanceOf': Move }]);
      if (!gameBoardState.isMovePossible(action.move)) throw `gameStateReducer dispatch failure:  'attemptMove' was called on invalid move ${action.move.toString()}`;
      if (currentPlayer !== action.player) throw `gameStateReducer dispatch failed: 'attemptMove' was called on by player ${action.player} during opponent's turn`;

      const boxesCompletedByMove = gameBoardState.boxesCompletedBy(action.move);

      return gameStateReducer({...state}, { type: '__runBatchedActions', batchedActions: [
        { type: 'addMoveToHistory', move: action.move, range: action.range, player: action.player },
        { type: 'updateOwnershipGrid', completedBoxes: boxesCompletedByMove, initials: players[currentPlayer].getNameInitials()},
        { type: 'updateBoardState', move: action.move },
        { type: 'addScore', player: currentPlayer, points: boxesCompletedByMove.length },
        { type: 'endCurrentTurn' },
        { type: 'updatePlayers'},
        { type: 'startNextTurnIfAble', samePlayerGoes: boxesCompletedByMove.length > 0 },
      ]});
    }
    case 'addMoveToHistory':
      validateAction(action, [{ key: 'player', typeOf: 'number'}, { key: 'move', 'instanceOf': Move }]);
      return {...state, moveHistory: moveHistory.update(action.move, action.player, action.range)};

    case 'attemptMoveTakeback': {
      if (moveHistory.length < 1) throw new Error(`attemptMoveTakeback run with insufficient moves in history: ${moveHistory.length}`);
      let { move: lastMove, player: lastPlayer, newMoveHistory } = moveHistory.popUpdate();
      let revertedGameBoardState = gameBoardState.copy();

      if (players[lastPlayer] instanceof LocalHumanPlayer) {
        revertedGameBoardState = revertedGameBoardState.remove(lastMove);
        const boxesCompletedByMove = revertedGameBoardState.boxesCompletedBy(lastMove);

        return gameStateReducer({...state, moveHistory: newMoveHistory, gameBoardState: revertedGameBoardState}, 
          { type: '__runBatchedActions', batchedActions: [
            { type: 'updateOwnershipGrid', completedBoxes: boxesCompletedByMove, initials: ""},
            { type: 'addScore', player: lastPlayer, points: boxesCompletedByMove.length * -1 },
            { type: 'endCurrentTurn' },
            { type: 'updatePlayers' },
            { type: 'startNextTurnIfAble', samePlayerGoes: boxesCompletedByMove.length > 0},
          ]}
        );
      } else if ([RandomPlayer, WeakAI, BasicAI].some(CPU => players[lastPlayer] instanceof CPU)) {
        let boxesCompletedByLastMove = 0;
        const reducerActions = [];

        // Undo all of the AI's moves that went after your move.
        while ( [RandomPlayer, WeakAI, BasicAI].some(CPU => players[lastPlayer] instanceof CPU) ) {
          revertedGameBoardState = revertedGameBoardState.remove(lastMove);
          boxesCompletedByLastMove = revertedGameBoardState.boxesCompletedBy(lastMove);

          reducerActions.push({ type: 'updateOwnershipGrid', completedBoxes: boxesCompletedByLastMove, initials: ""});
          reducerActions.push({ type: 'addScore', player: lastPlayer, points: boxesCompletedByLastMove.length * -1});

          ({ move: lastMove, player: lastPlayer, newMoveHistory: newMoveHistory } = newMoveHistory.popUpdate());
        }

        // Undo your move (since the AI went after you, you didn't complete boxes that turn, we can skip that step)
        revertedGameBoardState = revertedGameBoardState.remove(lastMove);
        boxesCompletedByLastMove = revertedGameBoardState.boxesCompletedBy(lastMove);
        
        reducerActions.push({ type: 'endCurrentTurn'});
        reducerActions.push({ type: 'updatePlayers' });
        reducerActions.push({ type: 'startNextTurnIfAble', samePlayerGoes: true });

        return gameStateReducer({...state, moveHistory: newMoveHistory, gameBoardState: revertedGameBoardState},
          {type: '__runBatchedActions', batchedActions: reducerActions});
      } else {
        throw new Error(`attemptMoveTakeback not supported for players of type ${players[(action.player + 1) % 2].constructor.name}`);
      }
    }
    case 'setUpGame':
      validateAction(action, [{ key: 'settings', typeOf: 'object' }]);
      validateSettings(action.settings);
      return setUpGame(action.settings, state);

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
      return {...state, 'gameActive': true};

    case 'deactivateGame':
      return {...state, 'gameActive': false};

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
          player2 = new BasicAI(settings.playerNames[1]);
          break;
        default:
          throw `Incorrect settings.cpuDifficulty value: ${settings.cpuDifficulty}`;
      }
      break;
    case "online":
      if (settings.isHost) {
        player1 = new LocalHumanPlayer(settings.playerNames[0]);
        player2 = new RemotePlayer(settings.playerNames[1]);
      } else {
        player1 = new RemotePlayer(settings.playerNames[0]);
        player2 = new LocalHumanPlayer(settings.playerNames[1]);
      }
      break;
    default:
      throw `incorrect settings.gameType value: ${settings.gameType}`;
  }

  return {...state,
    'players': [player1, player2],
    'playerScores': [0, 0],
    'currentPlayer': 0,
    'numberMovesCompleted': state.numberMovesCompleted + 1,
    'moveHistory': new MoveHistory(),
    'matchNumber': state.matchNumber + 1,
    'gameBoardState': new SquareGrid(settings.boardWidth, settings.boardHeight),
    'taggedGrid': new TaggedGrid(settings.boardWidth, settings.boardHeight),
    'gameActive': true,
    'gameSettings': settings,
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