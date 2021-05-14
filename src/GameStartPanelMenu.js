import React, { useEffect } from "react";
import { ALLOWED_DIFFICULTIES, MIN_BOARD_SIZE, MAX_BOARD_SIZE } from "./GameContext.js";
import { GameMenu, GameMenuItem } from './GameMenu.js';

export function GameStartPanelMenu(props) {
  useEffect(() => {
    const boardSizeSelectElement = document.getElementById('boardSizeSelect');
    boardSizeSelectElement && populateBoardSizeSelect(boardSizeSelectElement, MIN_BOARD_SIZE, MAX_BOARD_SIZE, props.previousSettings.boardHeight);
    const aiDifficultySelectElement = document.getElementById('aiDifficultySelect');
    aiDifficultySelectElement && populateAiDifficultyList(aiDifficultySelectElement, ALLOWED_DIFFICULTIES, props.previousSettings.cpuDifficulty);
  }, []);

  function handleFormEvent(event, type, gameMenuContext) {
    if (gameMenuContext === undefined)
      throw new Error("handleFormEvent not given gameMenuContext");
    const { formData, setFormData, linkTo } = gameMenuContext;
    switch (type) {
      case 'playerName1Change':
        setFormData({ ...formData, playerNames: formData.playerNames.map((name, i) => i == 0 ? event.target.value : name) });
        break;
      case 'playerName2Change':
        setFormData({ ...formData, playerNames: formData.playerNames.map((name, i) => i == 1 ? event.target.value : name) });
        break;
      case 'boardSizeChange':
        setFormData({ ...formData, boardSize: event.target.value });
        break;
      case 'playerNamesSubmit':
        linkTo("Board Size");
        event.preventDefault();
        break;
      case 'localPlayerGame':
        setFormData({ ...formData, gameType: "local" });
        linkTo("Choose Player Name");
        break;
      case 'aiPlayerGame':
        setFormData({ ...formData, gameType: "CPU" });
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
        setFormData({ ...formData, cpuDifficulty: event.target.value });
        break;
      case 'aiDifficultySubmit':
        linkTo("Choose Player Name");
        event.preventDefault();
        break;
    }
  }

  return (
    <GameMenu name="GameMenu" startingItemName="Home Page" defaultFormSettings={props.previousSettings} items={(gameMenuContext) => {
      const { formData, linkTo } = gameMenuContext;
      return (<>
        <GameMenuItem pageName="Home Page">
          <a href="#" onClick={(event) => { event.preventDefault(); linkTo("Choose Opponent Type"); }}>
            <h3> Play Locally </h3>
          </a>
          <a href="#" onClick={(event) => { event.preventDefault(); linkTo(2); }}>
            <h3> Play Over Network </h3>
          </a>
          <a href="#" onClick={(event) => { event.preventDefault(); handleFormEvent(event, 'useSavedSettings', gameMenuContext); }}>
            <h3> Use {props.appSettings.savePreviousMatchSettings ? "Saved" : "Default"} Settings </h3>
          </a>

        </GameMenuItem>
        <GameMenuItem pageName="Choose Opponent Type">
          <a href="#" onClick={(event) => { event.preventDefault(); handleFormEvent(event, 'aiPlayerGame', gameMenuContext); }}>
            <h3> Vs AI? </h3>
          </a>
          <a href="#" onClick={(event) => { event.preventDefault(); handleFormEvent(event, 'localPlayerGame', gameMenuContext); }}>
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
                <select name="boardSize" id="boardSizeSelect" onChange={(event) => handleFormEvent(event, 'boardSizeChange', gameMenuContext)} />
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
              <input type="submit" value="Enter" />
            </fieldset>
          </form>
        </GameMenuItem>
        <GameMenuItem pageName="AI Difficulty">
          <form onSubmit={(event) => handleFormEvent(event, 'aiDifficultySubmit', gameMenuContext)}>
            <fieldset>
              <legend>AI Difficulty:</legend>
              <label>
                Choose AI level:
                <select name="aiDifficulty" id="aiDifficultySelect" onChange={(event) => handleFormEvent(event, 'aiDifficultyChange', gameMenuContext)} />
              </label>
              <input type="submit" value="Select" />
            </fieldset>
          </form>
        </GameMenuItem>
      </>);
    }} />
  );
}

function populateBoardSizeSelect(selectElement, min, max, defaultValue) {
  for (let i = min; i < max; i++) {
    const optionElement = document.createElement("option");
    optionElement.textContent = `${i} x ${i}`;
    optionElement.value = i;
    if (i == defaultValue)
      optionElement.selected = 'selected';
    selectElement.appendChild(optionElement);
  }
}

function populateAiDifficultyList(selectElement, allowedTypes, defaultValue) {
  for (const type of allowedTypes) {
    const optionElement = document.createElement("option");
    optionElement.textContent = type;
    if (type == defaultValue)
      optionElement.selected = true;
    selectElement.appendChild(optionElement);
  }
}
