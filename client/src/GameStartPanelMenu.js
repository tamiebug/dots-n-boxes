import React, { useEffect, useState, useContext, useRef } from "react";
import { ALLOWED_DIFFICULTIES, MIN_BOARD_SIZE, MAX_BOARD_SIZE } from "./GameContext.js";
import { SocketContext, lobbyEvents, lobbyCommands } from "./SocketContext.js";
import { GameMenu } from './GameMenu.js';
import { SelectableTable } from "./SelectableTable.js";

export function GameStartPanelMenu({ previousSettings, setGameSettingsAndKillMenu, appSettings }) {

  const boardSizeSelectElement = ({ formData, setFormData }) => createSelect(
    [...Array(MAX_BOARD_SIZE - MIN_BOARD_SIZE)].map((_, index) => `${index + MIN_BOARD_SIZE} x ${index + MIN_BOARD_SIZE}`),
    `${previousSettings.boardWidth} x ${previousSettings.boardHeight}`,
    { name: "boardSize", id: "boardSizeSelect", onChange: e => setFormData({...formData, boardSize: e.target.value })}
  );

  const aiDifficultySelectElement = ({ formData, setFormData }) => createSelect(
    ALLOWED_DIFFICULTIES,
    previousSettings.cpuDifficulty,
    { name: "aiDifficulty", id: "aiDifficultySelect", onChange: e => setFormData({...formData, cpuDifficulty: e.target.value })}
  );

  const menuItems = {
    "Home Page": ({ linkTo, formData }) => {
      function useSavedSettings(event) {
        event.preventDefault();
        setGameSettingsAndKillMenu({
          boardHeight: parseInt(formData.boardSize || formData.boardHeight),
          boardWidth: parseInt(formData.boardSize || formData.boardWidth),
          playerNames: [...formData.playerNames],
          gameType: formData.gameType,
          cpuDifficulty: formData.cpuDifficulty,
        });
      }

      return (
        <>
          <button className="gameMenuButton" onClick={ () => linkTo("Choose Opponent Type") }>
            Play Locally
          </button>
          <button className="gameMenuButton" onClick={ () => linkTo("Choose Online Name") }>
            Play Over Network
          </button>
          <button className="gameMenuButton" onClick={ useSavedSettings }>
              Use {appSettings.savePreviousMatchSettings ? "Saved" : "Default"} Settings
          </button>
        </>
      );
    }, 
    
    "Choose Opponent Type": ({ linkTo, formData, setFormData }) => {
      function aiMatchOnClick( event ) {
        event.preventDefault();
        setFormData({ ...formData, gameType: "CPU" });
        linkTo("AI Difficulty");
      }

      function localMatchOnClick( event ) {
        event.preventDefault();
        setFormData({ ...formData, gameType: "local" });
        linkTo("Choose Player Name");
      }

      return (
        <>
          <button className="gameMenuButton" onClick={ aiMatchOnClick }>
            vs AI?
          </button>
          <button className="gameMenuButton" onClick={ localMatchOnClick }>
            vs Local Player?
          </button>
        </>
      );
    }, 
    
    "Choose Online Name": ({ linkTo, formData, setFormData }) => <ChooseOnlineNameComponent { ...{ linkTo, formData, setFormData }} />, 
    
    "Available Games List": ({ linkTo, formData, setFormData }) => <AvailableGamesListComponent {...{ linkTo, formData, setFormData }} />, 
    
    "Board Size": ({ formData, setFormData }) => {
      function onFormSubmit( event ) {
        event.preventDefault();
        setGameSettingsAndKillMenu({
          boardHeight: parseInt(formData.boardSize || formData.boardHeight),
          boardWidth: parseInt(formData.boardSize || formData.boardWidth),
          playerNames: [...formData.playerNames],
          gameType: formData.gameType,
          cpuDifficulty: formData.cpuDifficulty,
        });
      }

      return <form onSubmit={ onFormSubmit }>
        <fieldset>
          <legend>Board Size</legend>
          <label>
            choose Board Size:
            { boardSizeSelectElement({ formData, setFormData }) }
          </label>
          <input type="submit" value="go" />
        </fieldset>
      </form>;
    }, 
    
    "Host Game Lobby": ({ linkTo, formData, setFormData }) => <HostGameLobbyComponent {...{ previousSettings, linkTo, formData, setFormData }}/>, 
    
    "Game Lobby": ({ linkTo, formData }) => <GameLobbyComponent { ...{ linkTo, formData, setGameSettingsAndKillMenu } } />, 
    
    "Choose Player Name": ({ linkTo, formData, setFormData }) => {
      function onSubmit( event ) { 
        event.preventDefault();
        linkTo("Board Size");
      }
      
      function onFirstPlayerChange( event ) {
        setFormData({ ...formData, playerNames: formData.playerNames.map((name, i) => i == 0 ? event.target.value : name) });
      }

      function onSecondPlayerChange( event ) {
        setFormData({ ...formData, playerNames: formData.playerNames.map((name, i) => i == 1 ? event.target.value : name) });
      }

      return <form onSubmit={ onSubmit }>
      <fieldset>
        <legend>Player Names</legend>
        <label>
          First Player:
          <input type="text" name="firstPlayer" value={ formData.playerNames[0] } onChange={ onFirstPlayerChange } />
        </label>
        <label>
          Second Player:
          <input type="text" name="secondPlayer" value={ formData.playerNames[1] } onChange={ onSecondPlayerChange } />
        </label>
        <input type="submit" value="enter" />
      </fieldset>
    </form>;
    }, 
    
    "AI Difficulty": ({ linkTo, formData, setFormData }) => { 
      function onSubmit( event ) {
				event.preventDefault();
        linkTo("Choose Player Name");
      }

      return <form onSubmit={ onSubmit }>
        <fieldset>
          <legend>AI Difficulty:</legend>
          <label>
            Choose Ai Level: { aiDifficultySelectElement({ formData, setFormData }) }
          </label>
          <input type="submit" value="select" />
        </fieldset>
      </form>;
    }
  }; // end menuItems

  return <GameMenu name="GameMenu" startingItemName="Home Page" defaultFormSettings={ previousSettings } menuItems={ menuItems } />;
} // end gameStartPanelMenu

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

function AvailableGamesListComponent({ linkTo, formData, setFormData }) {
  const { getOpenGamesList, joinLobby } = useContext(SocketContext);

  const [ data, setData ] = useState([]);
  const [ selectedRow, setSelectedRow ] = useState(-1);

  const data_fetch_timeout = 8000;

  useEffect(() => {
    getOpenGamesList(gamesList => {
      setData([...gamesList]);
    });

    const fetchInterval = setInterval(() => {
      getOpenGamesList(gamesList => {
        setData([...gamesList]);
      });
    }, data_fetch_timeout);

    return function cleanup() { clearInterval(fetchInterval); };
  }, []);

  function gameSelectedCallback( hostName ) {
    setFormData({...formData, isHost: false, hostName });
    linkTo("Game Lobby");
  }

  const tabulatedData = data.map( entry => ({
    key: entry.gameId,
    cells: [
      entry.hostName,
      `${entry.dimensions.boardWidth} x ${entry.dimensions.boardHeight}`,
      entry.description,
    ],
  }));

  const joinOnClick = e => {
    e.preventDefault();
    // TODO: Should we inform the user that they need to select an active game?
    if (selectedRow == -1) return;
    const dataRow = data[selectedRow];
    const requestResponseCallback = response => {
      if (response.success == true) {
        gameSelectedCallback(dataRow.hostName);
      } else {
        console.log(`game join request failure.  reason ${response.reason}`);
        getOpenGamesList(gamesList => {
          setData([...gamesList]);
        });
      }
    };
    joinLobby(dataRow.hostName, requestResponseCallback);
  };

  return (
    <div className="onlineGamesTable">
      <SelectableTable
        columnLengths={[3, 2, 7]}
        columnNames={[
          "User Name",
          "Size",
          "Comments"
        ]}
        data={ tabulatedData } 
        selectedRow={ selectedRow }
        setSelectedRow={ setSelectedRow }
      />
      <div className="tableButtons">
        <button onClick={ () => linkTo("Host Game Lobby") }> Host Game </button>
        <button onClick={ joinOnClick } > Join Selected Game </button>
      </div>
    </div>
  );
}

function ChooseOnlineNameComponent({ linkTo, formData, setFormData }) {
  const { reserveName } = useContext(SocketContext);

  const [ currentName, setCurrentName ] = useState( formData.onlineName || "");
  const [ nameValid, setNameValid ] = useState(false);
  const inputRef = useRef(null);

  useEffect( () => {
    inputRef.current.focus();
  }, []);

  function onSubmit( event ) {
    event.preventDefault();
    // isHost set to false in case a "true" value was stored
    setFormData({...formData, onlineName: currentName, isHost: false });
    linkTo("Available Games List");
  }

  const handleKey = e => {
    if (e.keyCode == 13) {
      e.preventDefault();
      if (!nameValid) checkForAvailability(e);
      else { /*(nameValid) */
        setFormData({...formData, onlineName: currentName, isHost: false });
        linkTo("Available Games List");
      }
    }
  };

  const nameInput = <input className={`${nameValid ? "validatedNameInput" : ""}`}
    type="text" name="onlineName" value={ currentName } 
    onChange={ e => {setCurrentName(e.target.value); setNameValid(false);}}
    onKeyDown={ e => handleKey(e) }
    ref={ inputRef }
    />;

  function checkForAvailability( event ) {
    event.preventDefault();
    reserveName(currentName, response => {
      if (response.available || response.pairAlreadyExists ) {
        setNameValid(true);
      } else {
        inputRef.current.setCustomValidity(`${currentName} is not available`);
        inputRef.current.reportValidity();
        console.log(`${currentName} is not available`);
        setNameValid(false);
      }
    });
  }

  return (
    <form onSubmit={ event => onSubmit( event ) }>
      <fieldset>
        <legend> choose name </legend>
        { nameInput }
        <input type="submit" value="Check If Available" disabled={ nameValid } onClick={ checkForAvailability } />
      </fieldset>
      <input type="submit" value="Select Name" disabled={ !nameValid }/>
    </form>
  );
}

function HostGameLobbyComponent({ previousSettings, linkTo, formData, setFormData }) {
  const { requestLobby } = useContext(SocketContext);
  const [ localFormData, setLocalFormData ] = useState({ boardSize: previousSettings.boardWidth, gameLobbyDescription: "" });
  
  const boardSizeSelect = createSelect(
    [...Array(MAX_BOARD_SIZE - MIN_BOARD_SIZE)].map((_, index) => `${index + MIN_BOARD_SIZE} x ${index + MIN_BOARD_SIZE}`),
    `${previousSettings.boardWidth} x ${previousSettings.boardHeight}`,
    { name: "boardSize", id: "hostGameBoardSizeSelect", onChange: e => setLocalFormData({...localFormData, boardSize: e.target.value }) }
  );

  const onFormSubmit = e => {
    e.preventDefault();
    const cb = response => {
      if (response?.success === true ) {
        console.log(`Hosting w/ name: ${formData.onlineName}, size: ${localFormData.boardSize} and description: ${localFormData.gameLobbyDescription}`);
        setFormData({...formData, isHost: true, ...localFormData});
        linkTo("Game Lobby");
      } else {
        console.log(`Hosting failed because ${response.reason}`);
      }
    };
    requestLobby({ ...localFormData }, cb);
  };

  return (
    <form onSubmit={ onFormSubmit } >
      <fieldset>
        <label>
          Choose Board Size:
          { boardSizeSelect }
        </label>
        <label>
          Choose Game Description: 
          <input type="text" name="game" value={ localFormData.gameLobbyDescription }
            onChange={ e => setLocalFormData({...localFormData, gameLobbyDescription: e.target.value }) } />
        </label>
        <input type="submit" value="Host" />
      </fieldset>
    </form>
  );
}

function GameLobbyComponent({ setGameSettingsAndKillMenu, linkTo, formData }) {
  const { registerLobbyCallback, performLobbyCommand } = useContext(SocketContext);
  const [ hostReady, setHostReady ] = useState(false);
  const [ guestReady, setGuestReady ] = useState(false);
  
  const [ { hostName, guestName }, setPlayers ] = useState(() => {
    if ( formData.isHost ) return { hostName: formData.onlineName, guestName: null };
    else return { hostName: formData.hostName, guestName: formData.onlineName };
  });

  const resetLobby = () => {
    setPlayers({ hostName: null, guestName: null });
    setHostReady(false);
    setGuestReady(false);
  };

  function goBack() {
    if ( formData.isHost ) {
        linkTo("Host Game Lobby");
    } else {
      linkTo("Available Games List");
    }
  }

  useEffect(() => {
    const lobbyEventCallback = event => {
      switch ( event.type ) {
        case lobbyEvents.HOST_LEFT:
          resetLobby();
          goBack();
          break;
        case lobbyEvents.HOST_READY:
          setHostReady(true);
          break;
        case lobbyEvents.HOST_NOT_READY:
          setHostReady(false);
          break;
        case lobbyEvents.GUEST_KICKED:
          resetLobby();
          alert("You have been kicked from lobby");
          goBack();
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
          console.log("starting game");
          setGameSettingsAndKillMenu({
            boardHeight: event.settings.dimensions.boardHeight,
            boardWidth: event.settings.dimensions.boardWidth,
            playerNames: [ hostName, guestName ],
            gameType: "online",
            isHost: formData.isHost
          });
          break;
      }
    };
    registerLobbyCallback( lobbyEventCallback );
  });

  useEffect(() => {
    return function cleanup() {
      registerLobbyCallback( null );
    };
  }, []);

  const dialogString = () => {
    if ( formData.isHost ) {
      if ( guestName ) {
        if ( hostReady ) {
          return `Waiting for guest ${guestName} to press the Ready button...`;
        } else {
          return `Press the 'Start Game' button to proceed with match against ${guestName}`;
        } 
      } else {
        return `Waiting for a player to join Game Lobby...`;
      }
    } else { // !formData.isHost
      if ( guestReady ) {
        return `Waiting for host ${hostName} to start game`;
      } else {
        return `Press Ready to begin`;
      }
    }
  };

  const startGameOnClick = () => {
    if (!hostReady) {
      performLobbyCommand(lobbyCommands.HOST_IS_READY);
      setHostReady(true);
    } else {
      performLobbyCommand(lobbyCommands.HOST_IS_NOT_READY);
      setHostReady(false);
    }
  };

  const readyOnClick = () => {
    if (!guestReady) {
      performLobbyCommand(lobbyCommands.GUEST_IS_READY);
      setGuestReady(true);
    } else {
      performLobbyCommand(lobbyCommands.GUEST_IS_NOT_READY);
      setGuestReady(false);
    }
  };

  const leftButton = formData.isHost ? 
    <button onClick={ () => performLobbyCommand(lobbyCommands.KICK_GUEST) }>Kick Player</button> :
    <button onClick={ () => performLobbyCommand(lobbyCommands.LEAVE_LOBBY) }>Leave Lobby</button>;
  
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