import React, { useState } from "react";
import { AppSettingsMenu } from "./AppSettingsMenu.js";
import { appStates, useGameStore } from "./GameStore.js";
import { GameStartPanelMenu } from "./GameStartPanelMenu.js";
import { printObjectToJSON, MoveHistory } from "./utility.js";

export function ControlPanel() {
  const [ gameState, gameStateDispatch ] = useGameStore();
  const [ showAppSettingsMenu, setShowAppSettingsMenu ] = useState(false);

  const { appSettings, appState, players, currentPlayer, gameSettings, moveHistory, gameBoardState } = gameState;

  function onNewGame() {
    gameStateDispatch({ type: 'returnToStartMenu' });
  }

  function loadGameStateFromJSON() {
    const inputElement = document.getElementById("loadGameStateFromJSONHiddenInput");

    inputElement.onchange = (event) => {
      const fileList = event.target.files;
      const reader = new FileReader();

      reader.onload = readerEvent => {
        const currentGameStateJSON = readerEvent.target.result;
        const { settings: newSettings, moveHistory: newMoveHistoryJSON } = JSON.parse(currentGameStateJSON);

        gameStateDispatch({ type: "__runBatchedActions", batchedActions: [
          { type: 'setUpGame', settings: newSettings },
          { type: 'loadGame', moveHistory: MoveHistory.fromJSON(newMoveHistoryJSON) },
        ]});
      };
      reader.readAsText(fileList[0]);
    };
    inputElement.click();
  }

  return gameBoardState == null ? null : (
    <div className="col-sm-auto d-flex flex-column gameControlPanel jumbotron">
      <GameStartPanelMenu name="GameMenu"/>
      {showAppSettingsMenu == true && appState !== appStates.PRE_MATCH && <AppSettingsMenu
        name="AppSettingsMenu"
        setAppSettingsAndKillMenu= { appSettings => { setShowAppSettingsMenu(false); gameStateDispatch({ type: 'changeAppSettings', appSettings }); }}
      />}
      <div className="row">
        <div className="col" id="playerNameDisplay">
          <h1 className="player-1">{ players[0].name }[{ players[0].score }]</h1>
          <h1>vs</h1>
          <h1 className="player-2">{ players[1].name }[{ players[1].score }]</h1>
          <h2 className="who-goes">{ players[currentPlayer].name } goes</h2>
          <div className="row">
            <PanelButton
              onMouseClick={() => { if ( appState !== appStates.PRE_MATCH ) setShowAppSettingsMenu(true); }}
              bootstrapType="secondary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-gear" viewBox="0 0 16 16">
                <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
              </svg>
              Settings
            </PanelButton>
          </div>
          { appSettings.debugMode && <>
            <div className="row">
              <PanelButton
                onMouseClick={ () => printObjectToJSON(gameState.moveHistory) }
                bootstrapType="warning"
              >
                Show Move History JSON
              </PanelButton>
            </div>
            <div className="row">
              <PanelButton
                onMouseClick={ () => loadGameStateFromJSON() }
                bootstrapType="warning"
              >
                Load Game State from JSON
              </PanelButton>
              <input type="file" id="loadGameStateFromJSONHiddenInput" style={{display: "none"}} accept=".json"/>
            </div>
            <div className="row">
              <PanelButton
                onMouseClick={ () => printObjectToJSON({ settings: gameSettings, moveHistory }) }
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
                onMouseClick={ () => gameStateDispatch({type: 'attemptMoveTakeback'}) }
                bootstrapType="primary"
              >Undo Move</PanelButton>
            </div>
          </div>
          <div className="row">
            <div className="col-sm-auto">
              <PanelButton
                onMouseClick={ () => onNewGame() }
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
    <button type="button" className={`btn btn-${props.bootstrapType}`} onClick={ () => props.onMouseClick() }>
      { props.children }
    </button>
  );
}