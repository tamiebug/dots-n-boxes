import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ALLOWED_DIFFICULTIES, MIN_BOARD_SIZE, MAX_BOARD_SIZE } from "./GameContext.js";
import { GameMenu, GameMenuItem } from './GameMenu.js';
import { SelectableTable } from "./SelectableTable.js";

export function GameStartPanelMenu(props) {

  const boardSizeSelectElement = context => createSelect(
    [...Array(MAX_BOARD_SIZE - MIN_BOARD_SIZE)].map((_, index) => `${index + MIN_BOARD_SIZE} x ${index + MIN_BOARD_SIZE}`),
    `${props.previousSettings.boardWidth} x ${props.previousSettings.boardHeight}`,
    { name: "boardSize", id: "boardSizeSelect", onChange: e => handleFormEvent(e, 'boardSizeChange', context)}
  );

  const aiDifficultySelectElement = context => createSelect(
    ALLOWED_DIFFICULTIES,
    props.previousSettings.cpuDifficulty,
    { name: "aiDifficulty", id: "aiDifficultySelect", onChange: e => handleFormEvent(e, 'aiDifficultyChange', context)}
  );

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
    <GameMenu name="GameMenu" startingItemName="Home Page" defaultFormSettings={props.previousSettings} items={ gameMenuContext => {
      const { formData, linkTo } = gameMenuContext;
      return ({
        "Home Page" : <GameMenuItem>
          <button className="gameMenuButton" onClick={ e => linkTo("Choose Opponent Type") }>
            Play Locally
          </button>
          <button className="gameMenuButton" onClick={ e => linkTo("Choose Player Name") }>
            Play Over Network
          </button>
          <button className="gameMenuButton" onClick={ e => { e.preventDefault(); handleFormEvent(e, 'useSavedSettings', gameMenuContext); } }>
             Use {props.appSettings.savePreviousMatchSettings ? "Saved" : "Default"} Settings
          </button>
        </GameMenuItem>,
        "Choose Opponent Type" : <GameMenuItem>
          <button className="gameMenuButton" onClick={ e => { e.preventDefault(); handleFormEvent(e, 'aiPlayerGame', gameMenuContext); }}>
            Vs AI?
          </button>
          <button className="gameMenuButton" onClick={ e => { e.preventDefault(); handleFormEvent(e, 'localPlayerGame', gameMenuContext); }}>
            Vs Local Player?
          </button>
        </GameMenuItem>,
        "Board Size" : <GameMenuItem>
          <form onSubmit={ e => handleFormEvent(e, 'boardSizeSubmit', gameMenuContext) }>
            <fieldset>
              <legend>Board Size</legend>
              <label>
                Choose Board Size:
                { boardSizeSelectElement(gameMenuContext) }
              </label>
              <input type="submit" value="Go" />
            </fieldset>
          </form>
        </GameMenuItem>,
        "Choose Player Name" : <GameMenuItem>
          <form onSubmit={ e => handleFormEvent(e, 'playerNamesSubmit', gameMenuContext) }>
            <fieldset>
              <legend>Player Names</legend>
              <label>
                First Player:
                <input type="text" name="firstPlayer" value={gameMenuContext.formData.playerNames[0]} onChange={ e => handleFormEvent(e, 'playerName1Change', gameMenuContext) } />
              </label>
              <label>
                Second Player:
                <input type="text" name="secondPlayer" value={gameMenuContext.formData.playerNames[1]} onChange={ e => handleFormEvent(e, 'playerName2Change', gameMenuContext) } />
              </label>
              <input type="submit" value="Enter" />
            </fieldset>
          </form>
        </GameMenuItem>,
        "AI Difficulty" : <GameMenuItem>
          <form onSubmit={ e => handleFormEvent(e, 'aiDifficultySubmit', gameMenuContext)}>
            <fieldset>
              <legend>AI Difficulty:</legend>
              <label>
                Choose AI level: { aiDifficultySelectElement(gameMenuContext) }
              </label>
              <input type="submit" value="Select" />
            </fieldset>
          </form>
        </GameMenuItem>
      });
    }}/>
  );
}

function createSelect(entries, defaultValue, { name, id, onChange, className={}}) {
  return (
    <select {...{className, name, id, onChange, defaultValue}}>
      {
        entries.map((entry, index) => (
          <option key={ index } value={ entry }>{ entry }</option>
        ))
      }
    </select>
  );
}

function OnlineGamesTable(props) {
  const [ data, setData ] = useState([]);
  const [ selectedRow, setSelectedRow ] = useState(-1);

  useEffect(() => {
    let mounted = true;
    const socket = io("http://localhost:950");
    setIoSocket(socket);
    socket.emit("GET_DATA");
    socket.on("SEND_DATA", serverData => {
      if (mounted) setData([...serverData.testData]);
    });
    return () => { mounted = false; };
  }, []);

  return data.length == 0 ? null : (
    <SelectableTable
      columnLengths={[3, 2, 7]}
      columnNames={[
        "Name",
        "size",
        "Comments"
      ]}
      data={ data }
      selectedRow={ selectedRow }
      setSelectedRow={ row => setSelectedRow(row) }
    />
  );
}