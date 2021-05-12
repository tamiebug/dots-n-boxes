import React, { useState, useContext, useEffect } from "react";
import { GameStateContext, ALLOWED_DIFFICULTIES, MIN_BOARD_SIZE, MAX_BOARD_SIZE } from "./GameContext.js";
import { GameMenu, GameMenuItem } from './GameMenu.js';
import { playerEvents } from "./players.js";
import { Move , printObjectToJSON, MoveHistory } from "./utility.js";

const DEFAULT_GAME_SETTINGS =  { boardHeight: 5, boardWidth: 5, playerNames: ["Player 1", "Player 2"], gameType: "local", cpuDifficulty: "random" };

export function ControlPanel(props) {
  const { gameState, gameStateDispatch } = useContext(GameStateContext);
  const [ previousSettings, setPreviousSettings ] = useState(DEFAULT_GAME_SETTINGS);
  const [ showStartMenu, setShowStartMenu ] = useState(true);
  const [ showAppSettingsMenu, setShowAppSettingsMenu ] = useState(false);

  const { players, currentPlayer, gameActive, gameBoardState, gameSettings, moveHistory } = gameState;
  const [ player1, player2 ] = players;
  
  function onUndoClick() {
    gameStateDispatch({type: 'attemptMoveTakeback'});
  };

  function onNewGame() {
    gameStateDispatch({type: 'endCurrentTurn'});
    gameState.players.forEach((_, player) => gameStateDispatch({type: 'registerPlayerCallback', player: player, callback: () => {}}));
    setShowStartMenu(true);
  };

  function printMovesJSON() {
    printObjectToJSON(gameState.moveHistory);
  }

  function loadGameStateFromJSON() {
    const inputElement = document.getElementById("loadGameStateFromJSONHiddenInput");
    inputElement.onchange = (event) => {
      const fileList = event.target.files;
      const reader = new FileReader();

      reader.onload = readerEvent => {
        const currentGameStateJSON = readerEvent.target.result;
        const { settings: newSettings, moveHistory: newMoveHistoryJSON } = JSON.parse(currentGameStateJSON);
        applySettings(gameStateDispatch, newSettings, props.appSettings);
        gameStateDispatch({ type: "loadGame", moveHistory: MoveHistory.fromJSON(newMoveHistoryJSON) });
      };

      reader.readAsText(fileList[0]);
    };
    inputElement.click();
  }

  function saveGameStateToJSON() {
    printObjectToJSON({ settings: gameSettings, moveHistory });
  }

	useEffect(() => {
		if (gameState.numberMovesCompleted > -1) {
			gameState.players[gameState.currentPlayer].startTurn();
    }
	}, [gameState.numberMovesCompleted]);


  useEffect(() => {
    if (props.appSettings.savePreviousMatchSettings === true) {
      const previousGameSettingsString = window.localStorage.getItem('Previous Game Settings');
      const previousGameSettings = JSON.parse(previousGameSettingsString);
      setPreviousSettings({...DEFAULT_GAME_SETTINGS, ...previousGameSettings});
    } else {
      setPreviousSettings(DEFAULT_GAME_SETTINGS);
    }
    applySettings(gameStateDispatch, DEFAULT_GAME_SETTINGS, props.appSettings);
  }, [ ]);

  useEffect(() => {
    if (gameBoardState == null) return;
    const maxPointsPossible = (gameBoardState.nRows - 1) * (gameBoardState.nColumns - 1);
    const pointsScored = players.reduce((totalScore, player) => player.score + totalScore, 0);
    
    if (pointsScored == maxPointsPossible) {
      const gameIsTied = players[0].score == players[1].score;
      const playerOneWon = players[0].score > players[1].score;
      if ( gameIsTied ) {
        window.alert(`The game was a tie!`);
      } else if ( playerOneWon ) {
        window.alert(`${players[0]._name} has won!`);
      } else /* player two won */ {
        window.alert(`${players[1]._name} has won!`);
      }
      if (props.appSettings.debugMode && window.confirm(`Would you like to show JSON of last match's moves?`)) printMovesJSON();
      if (window.confirm(`Would you like to play again?`)) onNewGame();
    }
  }, [ gameActive ]);

	if (gameState.gameBoardState == null) return null;

  return (
    <div className="col-sm-auto d-flex flex-column gameControlPanel jumbotron">
      {showStartMenu == true && <GameStartPanelMenu 
        name="GameMenu"
        previousSettings={ previousSettings }
        appSettings={ props.appSettings }
        setGameSettingsAndKillMenu={(settings) => {
          setShowStartMenu(false);
          setPreviousSettings({...settings});
          if (props.appSettings.savePreviousMatchSettings === true) {
            const stringifiedSettings = JSON.stringify(settings);
            window.localStorage.setItem('Previous Game Settings', stringifiedSettings);
          }
          applySettings(gameStateDispatch, {...settings}, props.appSettings);
        }}
      />}
      {showAppSettingsMenu == true && <AppSettingsMenu 
        name="AppSettingsMenu"
        appSettings= {props.appSettings}
        setAppSettingsAndKillMenu= {(settings) => {
          setShowAppSettingsMenu(false);
          props.setAppSettings(settings);
        }}
      />}
      <div className="row">
        <div className="col" id="playerNameDisplay">
          <h1 className="player-1">{player1._name}[{player1.score}]</h1>
          <h1>vs</h1>
          <h1 className="player-2">{player2._name}[{player2.score}]</h1>
          <h2 className="who-goes">{players[currentPlayer]._name} goes</h2>
          <div className="row">
            <PanelButton
              onMouseClick={() => setShowAppSettingsMenu(true)}
              bootstrapType="secondary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-gear" viewBox="0 0 16 16">
                <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
              </svg>
              Settings
            </PanelButton>
          </div>
          {props.appSettings.debugMode && <>
            <div className="row"> 
              <PanelButton
                onMouseClick={() => printMovesJSON()}
                bootstrapType="warning"
              >
                Show Move History JSON
              </PanelButton>
            </div>
            <div className="row">
              <PanelButton
                onMouseClick={() => loadGameStateFromJSON()}
                bootstrapType="warning"
              >
                Load Game State from JSON
              </PanelButton>
              <input type="file" id="loadGameStateFromJSONHiddenInput" style={{display: "none"}} accept=".json"/>
            </div>
            <div className="row">
              <PanelButton
                onMouseClick={() => saveGameStateToJSON()}
                bootstrapType="warning"
              >
                Save Game State to JSON
              </PanelButton>
            </div>
          </> 
          }
        </div>
      </div>
      <div className="row flex-grow-1 justify-content-center">
        <div className="buttons-column flex-column d-flex">
          <div className="row">
            <div className="col-sm-auto">
              <PanelButton
                onMouseClick={() => onUndoClick()}
                bootstrapType="primary"
              >Undo Move</PanelButton>
            </div>
          </div>
          <div className="row">
            <div className="col-sm-auto">
              <PanelButton
                onMouseClick={() => onNewGame()}
                bootstrapType="danger"
              >New Game</PanelButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelButton(props) {
  return (
    <button type="button" className={`btn btn-${props.bootstrapType}`} onClick={() => props.onMouseClick()}>
      { props.children }
    </button>
  );
}

function AppSettingsMenu(props) {
  useEffect(() => {
    if (!props.appSettings.debugMode) document.querySelector("#AppSettingsForm input[name='Show Move Ranges']").disabled = true;
  }, [ ]);

  function handleFormEvent(event, type, gameMenuContext) {
    const { formData, setFormData } = gameMenuContext;
    switch (type) {
      case 'debugModeChanged':
        document.querySelector("#AppSettingsForm input[name='Show Move Ranges']").disabled = !!formData.debugMode;
        setFormData({...formData, debugMode: !formData.debugMode});
        break;
      case 'showMoveRangesChanged':
        setFormData({...formData, showMoveRanges: !formData.showMoveRanges});
        break;
      case 'savePreviousMatchSettingsChanged':
        setFormData({...formData, savePreviousMatchSettings: !formData.savePreviousMatchSettings});
        break;
      case 'saveAppSettings':
        event.preventDefault();
        props.setAppSettingsAndKillMenu(formData);
        break;
      default:
        throw new Error(`Invalid form event type: ${type}`);
    }
  }

  return (
    <GameMenu name="AppSettings" startingItemName="Application Settings" defaultFormSettings={ props.appSettings } items ={gameMenuContext => {
      const { formData } = gameMenuContext;
      return (<>
        <GameMenuItem pageName="Application Settings">
          <form id="AppSettingsForm" onSubmit={(event) => handleFormEvent(event, 'saveAppSettings', gameMenuContext)}>
            <fieldset>
              <legend> Debugging Settings </legend>
              <label> Debug Mode
                <input type="checkbox" value="debugMode" name="Debug Mode" checked={ formData.debugMode } 
                  onClick={ event => handleFormEvent(event, 'debugModeChanged', gameMenuContext )}/>
              </label>
              <label> Show Move Ranges
                <input type="checkbox" value="showMoveRanges" name="Show Move Ranges" checked={ formData.showMoveRanges }
                  onClick={ event => handleFormEvent(event, 'showMoveRangesChanged', gameMenuContext )}/>
              </label>
            </fieldset>
            <fieldset>
              <legend> Miscellaneous Settings </legend>
              <label> Save Previous Match Settings 
                <input type="checkbox" value="savePreviousMatchSettings" name="Save Previous Match Settings" 
                  checked= { formData.savePreviousMatchSettings } 
                  onClick={ event => handleFormEvent(event, 'savePreviousMatchSettingsChanged', gameMenuContext)} />
              </label>
            </fieldset>
            <input type="Submit" value="Save Settings"/>
          </form>
        </GameMenuItem>
      </>);
    }}/>
  );
}

function GameStartPanelMenu(props) {
  useEffect(() => {
    const boardSizeSelectElement = document.getElementById('boardSizeSelect');
    boardSizeSelectElement && populateBoardSizeSelect(boardSizeSelectElement, MIN_BOARD_SIZE, MAX_BOARD_SIZE, props.previousSettings.boardHeight);
    const aiDifficultySelectElement = document.getElementById('aiDifficultySelect');
    aiDifficultySelectElement && populateAiDifficultyList(aiDifficultySelectElement, ALLOWED_DIFFICULTIES, props.previousSettings.cpuDifficulty);
  }, [ ]);

  function handleFormEvent( event, type , gameMenuContext ) {
    if (gameMenuContext === undefined) throw new Error("handleFormEvent not given gameMenuContext");
    const { formData, setFormData, linkTo } = gameMenuContext;
    switch (type) {
      case 'playerName1Change':
        setFormData({...formData, playerNames: formData.playerNames.map((name, i) => i==0? event.target.value : name) });
        break;
      case 'playerName2Change':
        setFormData({...formData, playerNames: formData.playerNames.map((name, i) => i==1? event.target.value : name) });
        break;
      case 'boardSizeChange':
        setFormData({...formData, boardSize: event.target.value });
        break;
      case 'playerNamesSubmit':
        linkTo("Board Size");
        event.preventDefault();
        break;
      case 'localPlayerGame':
        setFormData({...formData, gameType: "local"});
        linkTo("Choose Player Name");
        break;
      case 'aiPlayerGame':
        setFormData({...formData, gameType: "CPU"});
        linkTo("AI Difficulty");
        break;
      case 'useSavedSettings':
      case 'boardSizeSubmit':
        event.preventDefault();
        props.setGameSettingsAndKillMenu({
          boardHeight: parseInt(formData.boardSize || formData.boardHeight),
          boardWidth: parseInt(formData.boardSize || formData.boardWidth),
          playerNames: [...formData.playerNames],
          gameType: formData.gameType,
          cpuDifficulty: formData.cpuDifficulty,
        });
        break;
      case 'aiDifficultyChange':
        setFormData({...formData, cpuDifficulty: event.target.value });
        break;
      case 'aiDifficultySubmit':
        linkTo("Choose Player Name");
        event.preventDefault();
        break;
    }
  }

  return (
    <GameMenu name="GameMenu" startingItemName="Home Page" defaultFormSettings={ props.previousSettings } items={(gameMenuContext) => { 
      const { formData, linkTo } = gameMenuContext;
      return (<>
        <GameMenuItem pageName="Home Page">
          <a href="javascript:undefined" onClick={(event) => linkTo("Choose Opponent Type")}>
            <h3> Play Locally </h3>
          </a>
          <a href="javascript:undefined" onClick={(event) => linkTo(2)}>
            <h3> Play Over Network </h3>
          </a>
          <a href="javascript:undefined" onClick={(event) => handleFormEvent(event, 'useSavedSettings', gameMenuContext)}>
            <h3> Use { props.appSettings.savePreviousMatchSettings ? "Saved" : "Default"} Settings </h3>
          </a>

        </GameMenuItem>
        <GameMenuItem pageName="Choose Opponent Type">
          <a href="javascript:undefined" onClick={(event) => handleFormEvent(event, 'aiPlayerGame', gameMenuContext)} >
            <h3> Vs AI? </h3>
          </a>
          <a href="javascript:undefined" onClick={(event) => handleFormEvent(event, 'localPlayerGame', gameMenuContext)} >
            <h3> Vs Local Player? </h3>
          </a>
        </GameMenuItem>
        <GameMenuItem pageName="TBD2" />
        <GameMenuItem pageName="TBD3" />
        <GameMenuItem pageName="Board Size">
          <form onSubmit={(event) => handleFormEvent(event, 'boardSizeSubmit', gameMenuContext)}>
            <fieldset>
              <legend>Board Size</legend>
              <label>
                Choose Board Size:
                <select name="boardSize" id="boardSizeSelect" onChange={(event) => handleFormEvent(event, 'boardSizeChange', gameMenuContext)}/>
              </label>
              <input type="submit" value="Go" />
            </fieldset>
          </form>
        </GameMenuItem>
        <GameMenuItem pageName='TBD5' />
        <GameMenuItem pageName="Choose Player Name">
          <form onSubmit={(event) => handleFormEvent(event, 'playerNamesSubmit', gameMenuContext)}>
            <fieldset>
              <legend>Player Names</legend>
              <label>
                First Player: 
                <input type="text" name="firstPlayer" value={gameMenuContext.formData.playerNames[0]} onChange={(event) => handleFormEvent(event, 'playerName1Change', gameMenuContext)} />
              </label>
              <label>
                Second Player: 
                <input type="text" name="secondPlayer" value={gameMenuContext.formData.playerNames[1]} onChange={(event) => handleFormEvent(event, 'playerName2Change', gameMenuContext)} />
              </label>
              <input type="submit" value="Enter"/>
            </fieldset>
          </form>
        </GameMenuItem>
        <GameMenuItem pageName="AI Difficulty">
          <form onSubmit={(event) => handleFormEvent(event, 'aiDifficultySubmit', gameMenuContext)}>
            <fieldset>
              <legend>AI Difficulty:</legend>
              <label>
                Choose AI level:
                <select name="aiDifficulty" id="aiDifficultySelect" onChange={(event) => handleFormEvent(event, 'aiDifficultyChange', gameMenuContext)}/>
              </label>
              <input type="submit" value="Select" />
            </fieldset>
          </form>
        </GameMenuItem>
      </>);
    }}/>
  );
}

function populateBoardSizeSelect(selectElement, min, max, defaultValue) {
  for (let i=min; i<max; i++) {
    const optionElement = document.createElement("option");
    optionElement.textContent = `${i} x ${i}`;
    optionElement.value = i;
    if (i==defaultValue) optionElement.selected = 'selected';
    selectElement.appendChild(optionElement); 
  }
}

function populateAiDifficultyList(selectElement, allowedTypes, defaultValue) {
  for (const type of allowedTypes) {
    const optionElement = document.createElement("option");
    optionElement.textContent = type;
    if (type==defaultValue) optionElement.selected = true;
    selectElement.appendChild(optionElement);
  }
}

function applySettings(gameStateDispatch, settings, appSettings) {
  const players = [0, 1];
  gameStateDispatch({ type: '__runBatchedActions', batchedActions: [
    { type: 'setUpGame', settings },
    { type: '__runBatchedActions', 
      batchedActions: players.map((playerNumber) => ({ 
        type: 'registerPlayerCallback', 
        player: playerNumber, 
        callback: (coms) => {
          switch (coms.type) {
            case playerEvents.SUBMIT_MOVE:
              if (coms.move.constructor.name !== Move.name) {
                throw `player coms parsing error:  move type coms with no move field`;
              } else {
                if (appSettings.showMoveRanges) {
                  gameStateDispatch({ 
                    type: 'attemptMove', 
                    move: coms.move,
                    range: coms.range,
                    player: playerNumber,
                  });
                } else {
                  gameStateDispatch({ 
                    type: 'attemptMove', 
                    move: coms.move,
                    player: playerNumber,
                  });
                }
              }
              break;
            case playerEvents.AI_SHOW_CHAINS:
              gameStateDispatch({
                type: 'showChains',
                chains: coms.chains,
              });
              break;
            case playerEvents.AI_HIDE_CHAINS:
              gameStateDispatch({
                type: 'hideChains',
              });
              break;
            default:
              throw `unrecognized player com type: ${coms.type}`;
        }},
      })),
    },
    { type: 'updatePlayers', samePlayerGoes: true },
    { type: 'startNextTurnIfAble', samePlayerGoes: true },
  ]});
}