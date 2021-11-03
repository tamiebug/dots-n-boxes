import { attemptOnlineMove } from "./Socket";
import { appStates } from "./GameStore";
import { printObjectToJSON } from "./utility";

// TODO: Not entirely sure whether GameEngine.js or GameStore.js will be responsible for initializing the gameStore
//export const gameStore = createStore( gameStateReducer, () => initialGameStoreState );
//export const useGameStore = () => useStore( gameStore );

export const DEFAULT_APP_SETTINGS = { debugMode: false, savePreviousMatchSettings: true };
export const DEFAULT_GAME_SETTINGS =  { boardHeight: 5, boardWidth: 5, playerNames: ["Player 1", "Player 2"], gameType: "local", cpuDifficulty: "random" };

const changeHandlers = new Map(Object.entries({
  'moveHistory': moveHistoryChangeHandler,
}));

export function GameEngine( store ) {
  this.store = store;
  store.subscribe( this.onStateBroadcast.bind( this ) );
  loadAppSettingsFromBrowser( store.dispatch );
  applyDefaultGameSettings( store.dispatch );
  store.dispatch({ type: 'returnToStartMenu' });
}

GameEngine.prototype.onStateBroadcast = function onStateBroadcast( state, oldState ) {
  for ( const key of Object.keys(state) ) {
    if ( oldState[key] !== state[key] ) {
      if (changeHandlers.has( key )) {
        changeHandlers.get( key )( oldState, state, this.store.dispatch );
      }
    }
  }
  this.oldState = {...state};
};

function moveHistoryChangeHandler( oldState, newState, dispatch ) {
  if ( oldState.moveHistory && newState.moveHistory.length == oldState.moveHistory.length + 1 ) {
    updateRemotePlayers( newState );
    if ( didSomeoneWin( oldState, newState ) && newState.appState == appStates.MATCH ) {
      dispatch({ type: 'deactivateGame' });
      handleVictory( oldState, newState, dispatch );
    } else if ( newState.appState == appStates.MATCH ) {
      makeCpuGo( newState, dispatch );
    }
  }
}

function didSomeoneWin( _, state ) {
  return state.players.reduce((sum, p) => p.score + sum, 0) == state.gameBoardState.getMaximumPointsPossible();
}

function makeCpuGo( state, dispatch ) {
  const currentPlayerObject = state.players[state.currentPlayer];
  if ( currentPlayerObject.isCPU() ) {
    if ( state.appSettings.debugMode ) {
      // Show chains
      const { chains, movePromise } = currentPlayerObject.getCPUMovePromise( state );
      dispatch({ type: 'showChains', chains });
      movePromise.then( move => dispatch( { type: 'attemptMove', move }));
    } else {
      currentPlayerObject.getCPUMovePromise( state ).then( move => dispatch( { type: 'attemptMove', move }));
    }
  }
}

function handleVictory( _, state ) {
  const gameIsTied = state.players[0].score == state.players[1].score;
  const playerOneWon = state.players[0].score > state.players[1].score;
  if ( gameIsTied ) {
    window.alert(`The game was a tie!`);
  } else if ( playerOneWon ) {
    window.alert(`${state.players[0].name} has won!`);
  } else {
    window.alert(`${state.players[1].name} has won!`);
  }
  if ( state.appSettings && state.appSettings.debugMode && window.confirm(`Would you like to show JSON of last match's moves?`)) {
    printObjectToJSON(state.gameBoardState.moveHistory);
  }
}

function updateRemotePlayers( state ) {
  const history = state.moveHistory.getRawHistory();
  const { move: lastMove, player: lastPlayer } = history[history.length - 1];

  if ( !state.players[lastPlayer].isRemote() && state.players.some( player => player.isRemote() )) {
    // TODO: Do we want to raise an error if this attempt fails?  Most likely.
    attemptOnlineMove( lastMove );
  }
}

function loadAppSettingsFromBrowser( dispatch ) {
  const localSettings = JSON.parse( window.localStorage.getItem('App Settings') );
  if (localSettings) {
    dispatch({ type: 'changeAppSettings', appSettings: {...DEFAULT_APP_SETTINGS, ...localSettings }});
  }
}

function applyDefaultGameSettings( dispatch ) {
  dispatch({ type: 'setUpGame', settings: DEFAULT_GAME_SETTINGS });
}