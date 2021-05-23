import React, { useEffect, useState } from "react";
import { ALLOWED_DIFFICULTIES, MIN_BOARD_SIZE, MAX_BOARD_SIZE } from "./GameContext.js";
import { SocketContext, lobbyEvents, lobbyCommands } from "./SocketContext.js";
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
      case 'onlineNameChange':
        setFormData({...formData, onlineName: event.target.value});
        break;
      case 'onlinePlayerNameSelected':
        const { name } = event.target;
        setFormData({...formData, onlineName: name });
        console.log(formData);
        linkTo("Available Games List");
        break;
      case 'onlineGameSelected':
        const { hostName, boardWidth, boardHeight } = event.target;
        setFormData({...formData, isHost: false, playerNames: [hostName, formData.onlineName], boardHeight, boardWidth });
        linkTo("Game Lobby");
        break;
      case 'gameDescriptionChange':
        setFormData({...formData, gameLobbyDescription: event.target.value });
        break;
      case 'hostGameLobbySubmit':
        console.log(`Hosting w/ name: ${formData.onlineName}, size: ${formData.boardSize} and description: ${formData.gameLobbyDescription}`);
        setFormData({...formData, isHost: true });
        linkTo("Game Lobby");
        break;
      case 'gameLobbyClose':
        if ( e.target.action == "GO_BACK" ) {
          console.log("Going back from Game Lobby");
          if ( formData.isHost ) {
            linkTo("Host Game Lobby");
          } else {
            linkTo("Available Games List");
          }
        } else if ( e.target.action == "START_GAME" ) {
          console.log("Starting Game");
          props.setGameSettingsAndKillMenu({
            boardHeight: event.target.settings.boardHeight,
            boardWidth: event.target.settings.boardWidth,
            playerNames: event.target.settings.playerNames,
            gameType: "online",
          });
        }
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
          <button className="gameMenuButton" onClick={ e => linkTo("Choose Online Name") }>
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
        "Choose Online Name": <GameMenuItem>
          <OnlineNameSelector defaultValue={ formData.onlineName } nameChosenCallback={ e => handleFormEvent(e, "onlinePlayerNameSelected", gameMenuContext )} />
        </GameMenuItem>,
        "Available Games List": <GameMenuItem>
          <OnlineGamesTable gameSelectedCallback={ settings => handleFormEvent( { target: settings }, "onlineGameSelected", gameMenuContext ) }/>
        </GameMenuItem>,
        "Board Size": <GameMenuItem>
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
        "Host Game Lobby": <GameMenuItem>
          <form onSubmtit={ e => handleFormEvent(e, 'hostGameLobbySubmit', gameMenuContext) } >
            <fieldset>
              <label>
                Choose Board Size:
                { boardSizeSelectElement(gameMenuContext) }
              </label>
              <label>
                Choose Game Description: 
                <input type="text" name="game" value={ gameMenuContext.formData.gameLobbyDescription || ""}
                  onChange={ e => handleFormEvent(e, "gameDescriptionChange", gameMenuContext) } />
              </label>
              <input type="submit" value="Host" />
            </fieldset>
          </form>
        </GameMenuItem>,
        "Game Lobby": <GameMenuItem>
          <GameLobbyComponent { ...formData } gameLobbyCallback={ e => handleFormEvent( e, "gameLobbyClose", gameMenuContext ) }/>
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
  const { getOpenGamesList, joinLobby } = useContext(SocketContext);

  const [ data, setData ] = useState([]);
  const [ selectedRow, setSelectedRow ] = useState(-1);

  const DATA_FETCH_TIMEOUT = 8000;

  useEffect(() => {
    getOpenGamesList(gamesList => {
      setData([...gamesList]);
    });

    const fetchInterval = setInterval(() => {
      getOpenGamesList(gamesList => {
        setData([...gamesList]);
      });
    }, DATA_FETCH_TIMEOUT);

    return function cleanup() { clearInterval(fetchInterval) };
  }, []);

  const tabulatedData = data.map( entry => ({
    key: entry.gameID,
    cells: [
      entry.hostName,
      `${entry.dimensions.boardWidth} x ${entry.dimensions.boardHeight}`,
      entry.description,
    ],
  }));

  const joinOnClick = e => {
    e.preventDefault();
    const dataRow = data[selectedRow];
    const requestResponseCallback = response => {
      if (response.success == true) {
        props.gameSelectedCallback({
          hostName: response.settings.hostName,
          boardWidth: response.settings.dimensions.boardWidth,
          boardHeight: response.settings.dimensions.boardHeight,
        });
      } else {
        console.log(`Game Join request failure.  Reason ${response.reason}`);
        getOpenGamesList(gamesList => {
          setData([...gamesList]);
        });
      }
    };
    joinLobby(dataRow.hostName, requestResponseCallback);
  }

  return data.length == 0 ? null : (
    <div className="onlineGamesTable">
      <SelectableTable
        columnLengths={[3, 2, 7]}
        columnNames={[
          "Name",
          "Size",
          "Comments"
        ]}
        data={ tabulatedData } 
        selectedRow={ selectedRow }
        setSelectedRow={ row => setSelectedRow(row) }
      />
      <div className="tableButtons">
        <button> Host Game </button>
        <button onclick={ joinOnClick } > Join Selected Game </button>
      </div>
    </div>
  );
}

function OnlineNameSelector(props) {
  const { reserveName } = useContext(SocketContext);

  const [ currentName, setCurrentName ] = useState(props.defaultValue || "");
  const [ nameValid, setNameValid ] = useState(false);

  const nameInput = <input className={`${nameValid ? "validatedNameInput" : ""}`}
    type="text" name="onlineName" value={ currentName } 
    onChange={ e => {setCurrentName(e.target.value); setNameValid(false)} } />;

  function checkForAvailability() {
    reserveName(currentName, response => {
      if (response.available === true) {
        console.log("Got Good Response");
        setNameValid(true);
      } else {
        nameInput.setCustomValidity(`${currentName} is not available`);
      }
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    props.nameChosenCallback({ target: { name: currentName }});
  }

  return (
    <form onSubmit={ e => onSubmit(e) }>
      <fieldset>
        <legend> Choose Name </legend>
        { nameInput }
        <input type="submit" value="Check If Available" onClick={ e => { e.preventDefault(); checkForAvailability() }} />
      </fieldset>
      <input type="submit" value="Select Name" disabled={ !nameValid }/>
    </form>
  );
}

function GameLobbyComponent({ formData , gameLobbyCallback }) {
  const { registerLobbyCallback, performLobbyCommands } = useContext(SocketContext);
  const [ hostReady, setHostReady ] = useState(false);
  const [ guestReady, setGuestReady ] = useState(false);

  const [ { hostName, guestName }, setPlayers ] = useState(() => {
    if ( formData.isHost ) return { hostName: formData.hostname, guestName: null };
    else return { hostName: formData.hostName, guestName: formData.onlineName };
  });

  useEffect(() => {
    const lobbyEventCallback = event => {
      switch ( event.type ) {
        case lobbyEvents.HOST_LEFT:
          gameLobbyCallback({ target : { action: "GO_BACK" }});
          break;
        case lobbyEvents.HOST_READY:
          setHostReady(true);
          break;
        case lobbyEvents.HOST_NOT_READY:
          setHostReady(false);
          break;
        case lobbyEvents.GUEST_JOINED:
          setPlayers({ hostName, guestName: event.playerName });
          break;
        case lobbyEvents.GUEST_LEFT:
          setPlayers({ hostName, guestName: null });
          break;
        case lobbyEvents.GUEST_READY:
          setGuestReady(true);
          break;
        case lobbyEvents.GUEST_NOT_READY:
          setGuestReady(false);
          break;
        case lobbyEvents.START_GAME:
          // TODO: apply settings!!
          gameLobbyCallback({ target: {
            action: "START_GAME",
            settings: {
              ...event.settings,
              playerNames: [ hostName, guestName ]
            }
          }});
          break;
      }
    };
    registerLobbyCallback( lobbyEventCallback );

    return function cleanup() { 
      registerLobbyCallback( null );
    }
  }, []);

  const dialogString = () => {
    if ( formData.isHost ) {
      if ( formData.guestName ) {
        if ( ready ) {
          return `Waiting for guest ${guestName} to press the Ready button...`;
        } else {
          return `Press the 'Start Game' button to proceed with match against ${guestName}`;
        } 
      } else {
        return `Waiting for a player to join game lobby...`;
      }
    } else { // !formData.isHost
      if ( ready ) {
        return `Waiting for host ${hostName} to start game`
      } else {
        return `Press Ready to begin`
      }
    }
  };

  const startGameOnClick = () => {
    if (!ready) {
      performLobbyCommands(lobbyCommands.HOST_IS_READY);
      setReady(true);
    } else {
      performLobbyCommands(lobbyCommands.HOST_IS_NOT_READY);
      setReady(false);
    }
  };

  const readyOnClick = () => {
    if (!ready) {
      performLobbyCommands(lobbyCommands.GUEST_IS_READY);
      setReady(true);
    } else {
      performLobbyCommands(lobbyCommands.GUEST_IS_NOT_READY);
      setReady(false);
    }
  };

  const leftButton = formData.isHost ? 
    <button onClick={ performLobbyCommands(lobbyCommands.KICK_GUEST) }>Kick Player</button> :
    <button onClick={ performLobbyCommands(lobbyCommands.LEAVE_LOBBY) }>Leave Lobby</button>;
  
  const rightButton = formData.isHost ? 
    <button className={`${hostReady?"ready":""}`} onClick={ startGameOnClick }>Start Game</button> :
    <button className={`${guestReady?"ready":""}`}onClick={ readyOnClick } >Ready</button>;

  return (
    <div className="gameLobbyDiv">
      <p> { dialogString() } </p>
      <div className="buttonsDiv">
        { leftButton } { rightButton }
      </div>
    </div>
  );
}