import React, { useReducer, useMemo, useEffect } from "react";
import { gameStateReducer, initialGameState, GameStateContext } from "./GameContext.js";
import { ControlPanel } from "./ControlPanel.js";
import { GameBoard } from "./GameBoard.js";
import { printObjectToJSON } from "./utility.js";

export function Game(props) {
	const [ gameState, gameStateDispatch ] = useReducer(gameStateReducer, initialGameState);
	const { matchNumber, gameBoardState, players } = gameState;

	/* Precaution to avoid unneeded renders in child components on parent component rerender */
	const contextValue = useMemo(() => {
		return { gameState, gameStateDispatch };
	}, [ gameState, gameStateDispatch ]);

	useEffect(() => {
		if (gameState.numberMovesCompleted > -1) {
			gameState.players[gameState.currentPlayer].startTurn();
    }
	}, [gameState.numberMovesCompleted]);

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
      if (props.appSettings.debugMode && window.confirm(`Would you like to show JSON of last match's moves?`)) printObjectToJSON(gameState.moveHistory);
    }
  }, [ gameState.gameActive ]);

	return (
		<div className="row game-div">
			<GameStateContext.Provider value={ contextValue }>
				<div className="col col-sm-auto">
					<GameBoard key={ matchNumber + 1 } {...props}/>
				</div>
				<div className="col col-sm-auto">
					<ControlPanel key={ 0 } {...props}/>
				</div>	
			</GameStateContext.Provider>
		</div>
	);
}