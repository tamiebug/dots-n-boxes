import React, { useState, useContext, useEffect } from "react";
import { GameStateContext, ALLOWED_DIFFICULTIES, MIN_BOARD_SIZE, MAX_BOARD_SIZE } from "./GameContext.js";
import { GameMenu, GameMenuItem } from './GameMenu.js'
import { playerEvents } from "./players.js";
import { Move } from "./utility.js";

export const DEFAULT_SETTINGS =  { boardHeight: 5, boardWidth: 5, playerNames: ["Player 1", "Player 2"], gameType: "local", cpuDifficulty: "random" };

export function ControlPanel() {
  const { gameState, gameStateDispatch } = useContext(GameStateContext);
  const { players, currentPlayer, gameActive, gameBoardState } = gameState;
  const [ player1, player2 ] = players; // Currently this code does not allow for more than two players -- future change?
  const [ showStartMenu, setShowStartMenu ] = useState(true);
  function onUndoClick() {
    // TODO: Implement Undo functionality [currently disabled]
  };

  function onNewGame() {
    gameStateDispatch({type: 'endCurrentTurn'});
    gameState.players.forEach((_, player) => gameStateDispatch({type: 'registerPlayerCallback', player: player, callback: () => {}}));
    setShowStartMenu(true);
  };

  useEffect(() => {
    applySettings(gameStateDispatch, DEFAULT_SETTINGS);
  }, [ ]);

  useEffect(() => {
    if (gameBoardState == null) return;
    const maxPointsPossible = (gameBoardState.nRows - 1) * (gameBoardState.nColumns - 1)
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
      if (window.confirm(`Would you like to play again?`)) {
        onNewGame();
      } 
    }
  }, [ gameActive ]);

	if (gameState.gameBoardState == null) return null;

  return (
    <div className="col-sm-auto d-flex flex-column gameControlPanel jumbotron">
      {showStartMenu == true && <GameStartPanelMenu name="GameMenu" menuKiller={() => setShowStartMenu(false)}/>}
      <div className="row">
        <div className="col" id="playerNameDisplay">
          <h1 className="player-1">{player1._name}[{player1.score}]</h1>
          <h1>vs</h1>
          <h1 className="player-2">{player2._name}[{player2.score}]</h1>
          <h2 className="who-goes">{players[currentPlayer]._name} goes</h2>
        </div>
      </div>
      <div className="row flex-grow-1 justify-content-center">
        <div className="buttons-column flex-column d-flex">
          <div className="row">
            <div className="col-sm-auto">
              <PanelButton
                onMouseClick={() => this.onUndoClick()} 
                bootstrapType="primary"
                text="Undo Move"
              />
            </div>
          </div>
          <div className="row">
            <div className="col-sm-auto">
              <PanelButton
                onMouseClick={() => onNewGame()}
                bootstrapType="danger"
                text="New Game"
              />
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
      { props.text }
    </button>
  );
}

function GameStartPanelMenu(props) {
  const { gameStateDispatch } = useContext(GameStateContext);

  useEffect(() => {
    const boardSizeSelectElement = document.getElementById('boardSizeSelect');
    boardSizeSelectElement && populateBoardSizeSelect(boardSizeSelectElement, MIN_BOARD_SIZE, MAX_BOARD_SIZE);
    const aiDifficultySelectElement = document.getElementById('aiDifficultySelect');
    aiDifficultySelectElement && populateAiDifficultyList(aiDifficultySelectElement, ALLOWED_DIFFICULTIES);
  }, []);

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
      case 'boardSizeSubmit':
        applySettings(gameStateDispatch, {
          boardHeight: parseInt(formData.boardSize || formData.boardHeight),
          boardWidth: parseInt(formData.boardSize || formData.boardWidth),
          playerNames: [...formData.playerNames],
          gameType: formData.gameType,
          cpuDifficulty: formData.cpuDifficulty,
        });
        event.preventDefault();
        props.menuKiller();
        break;
      case 'aiDifficultyChange':
        setFormData({...formData, cpuDifficulty: event.target.value });
        break;
      case 'aiDifficultySubmit':
        setFormData({...formData, gameType: 'CPU' });
        linkTo("Choose Player Name");
        event.preventDefault();
        break;
    }
  }

  return (
    <GameMenu name="GameMenu" startingItemName="Home Page" defaultFormSettings={DEFAULT_SETTINGS} items={(gameMenuContext) => { 
      const { formData, linkTo } = gameMenuContext;
      return (<>
        <GameMenuItem pageName="Home Page">
          <a href="javascript:undefined" onClick={(event) => linkTo("Choose Opponent Type")}>
            <h3> Play Locally </h3>
          </a>
          <a href="javascript:undefined" onClick={(event) => linkTo(2)}>
            <h3> Play Over Network </h3>
          </a>
        </GameMenuItem>
        <GameMenuItem pageName="Choose Opponent Type">
          <a href="javascript:undefined" onClick={(event) => linkTo("AI Difficulty")} >
            <h3> Vs AI? </h3>
          </a>
          <a href="javascript:undefined" onClick={(event) => linkTo("Choose Player Name")} >
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
  )
}

function populateBoardSizeSelect(selectElement, min, max) {
  const defaultSize = DEFAULT_SETTINGS.boardHeight;
  for (let i=min; i<max; i++) {
    const optionElement = document.createElement("option");
    optionElement.textContent = `${i} x ${i}`;
    optionElement.value = i;
    if (i==defaultSize) optionElement.selected = 'selected';
    selectElement.appendChild(optionElement); 
  }
}

function populateAiDifficultyList(selectElement, allowedTypes) {
  for (const type of allowedTypes) {
    const optionElement = document.createElement("option");
    optionElement.textContent = type;
    selectElement.appendChild(optionElement);
  }
}

function applySettings(gameStateDispatch, settings) {
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
                gameStateDispatch({ 
                  type: 'attemptMove', 
                  move: coms.move,
                  player: playerNumber,
                });
              }
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