import React, { Component, useEffect, useState } from "react";
import { Move, SquareGrid , argmax} from "./utility.js";
import { LocalHumanPlayer, BasicAI, RandomPlayer, WeakAI } from "./players.js";
import { GameStateContextReducer, gameStateContext } from "./GameContext.js";

const MAX_BOARD_SIZE = 30;

const mouseEvents = Object.freeze({
	DOWN:		Symbol("down"),
	UP:			Symbol("up"),
	ENTER:	Symbol("enter"),
	LEAVE:	Symbol("leave")
});

// TODO: Does this beelong here?  Seems like something that belongs in App.js and is then passed down to the GameComponent, because it may be used elsewhere.
export const mouseTracker = {
	// We need to know of the current mouse state for some functionalities
	mouseButtonDown : false,
	onUp() { this.mouseButtonDown = false; },
	onDown() { this.mouseButtonDown = true; },
	isMouseButtonDown() { return this.mouseButtonDown; }
};

export function Game(props) {	
	const [gameState, gameStateDispatch] = useReducer(gameStateContextReducer);

	useEffect(() => {
		gameStateDispatch({type: 'setUpGame', settings: {boardHeight: 5, boardWidth: 5, playerName1: "Tamie", playerName2: "CPU", gameType: "CPU", cpuDifficulty: "weak" }});
	}, []);

	useEffect(() => {
		gameState.players[gameState.currentPlayer].endTurn();

		const pointsScored = gameState.players.reduce((totalScore, score) => score + totalScore, 0);
		const maxPointsPossible = (gameState.gameBoardState.nRows - 1) * (gameState.gameBoardState.nColumns - 1)
		if (pointsScored == maxPointsPossible) {
			const winners = argmax(gameState.players.map((player) => player.score));
			if (winners.length == 1) {
				// TODO: set score support!
				// Do something... a player won!
				// Ask if another match is desired
				// TEMPORARY PLACEHOLDER CODE:
				setTimeout(() => {
					alert(`Player ${gameState.players[winners[0]]._name} won the game`)
				});
			} else {
				// There's a ${winners.length}-way tie!
				setTimeout(() => {
					alert(`The set of players ${winners.map((winner) => gameState.players[winner]._name)} have won the game`);j
				})
			}
		} else {
			gameState.players[gameState.currentPlayer].startTurn();
		}
	})

	return (
		<div className="row game-div">
			<div className="col col-sm-auto">
				<GameStateContext.Provider value={{gameState, gameStateDispatch}}>
					<GameBoard
						key={gameState.matchNumber}
					/>
				</GameStateContext.Provider>
			</div>
		</div>
	);
}

class GameBoard extends Component {
	static contextType = GameStateContext;

		state = {
			/** Object.  The selected coordinate. */
			selectedCoord: null,
			/** Move.  Highlighted next potential move, usually showed on mouseover. */
			highlightedPotentialMove: null
		};

	handleMouseEvent(event, row, column) {
		if (this.state.selectedCoord == null) {
			switch (event) {
				case mouseEvents.DOWN:
					this.highlightDot(row, column);
					this.setState({ selectedCoord: { "column": column, "row": row } });
					break;
				case mouseEvents.UP:
					break;
				case mouseEvents.ENTER:
					this.highlightDot(row, column);
					break;
				case mouseEvents.LEAVE:
					this.unHighlightDot(row, column);
					break;
			}
		} else {
			const selRow = this.state.selectedCoord.row;
			const selColumn = this.state.selectedCoord.column;

			const isAdjacent = ((Math.abs(selColumn - column) + Math.abs(selRow - row)) == 1);
			switch (event) {
				case mouseEvents.DOWN:
					this.unHighlightPossibleMove();
					this.setState({ selectedCoord: { "column": column, "row": row } });
					break;
				case mouseEvents.UP:
					if (isAdjacent) {
						this.attemptMove(row, column);
						this.unHighlightPossibleMove();
					}
					this.setState({ selectedCoord: null });
					break;
				case mouseEvents.ENTER:
					if (!mouseTracker.isMouseButtonDown()) {
						// happens when mouse is released outside of a selection circle
						this.setState({ selectedCoord: null });
						break;
					}
					this.highlightDot(row, column);
					if (isAdjacent) {
						this.highlightPossibleMove(row, column);
					}
					break;
				case mouseEvents.LEAVE:
					if (isAdjacent) {
						this.unHighlightPossibleMove();
					}
					if (selRow != row || selColumn != column) {
						this.unHighlightDot(row, column);
					}
					break;
			}
		}
	}

	render() {
		const gameBoardState = this.context;

		const boardSize = Math.min(gameBoardState.nColumns, gameBoardState.nRows);
		const renderedRows = gameBoardState.squares.map((squareRow, index) => {
			return (<GameBoardRow
				key={index}
				row={index}
				highlightedPotentialMove={this.state.highlightedPotentialMove}
				handleMouseEvent={this.handleMouseEvent.bind(this)}
				ownershipGridRow={this.props.ownershipGrid[index]} />);
		});
		return (
			<div className="gameBoard jumbotron" style={{ fontSize: determineScalingFactor(boardSize) }}>
				{renderedRows}
			</div>
		);
	}(move) 

	attemptMove(row, column) {
		const gameBoardState = this.context;
		const move = new Move(
			Math.min(row, this.state.selectedCoord.row),
			Math.min(column, this.state.selectedCoord.column),
			isHorizontalLine(this.state.selectedCoord, { "row": row, "column": column }) ? "h" : "v"
		);

		if (gameBoardState.isMovePossible(move))  this.props.onValidGameMove(move);		
		w t
		return;
	}

	highlightPossibleMove(row, column) {
		const move = new Move (
			Math.min(row, this.state.selectedCoord.row),
			Math.min(column, this.state.selectedCoord.column),
			isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column}) ? "h" : "v"
		);
		this.setState({ highlightedPotentialMove: move});
		return;
	}

	unHighlightPossibleMove() {
		this.setState({ highlightedPotentialMove: null });
		return;
	}

	highlightDot(row, column) {
		//TODO: Implement highlightDot & unHighlightDot
		return;
	}

	unHighlightDot(row, column) {
		//TODO: Implement highlightDot & unHighlightDot
		return;
	}
}

class GameBoardRow extends Component {
	static contextType = GameStateContext;

	render() {
		const gameBoardState = this.context;
		let renderedSquares = [];
		for (let index = 0; index < gameBoardState.nColumns; index++) {
			renderedSquares.push(
				<GameBoardSquare
					key={index}
					column={index}
					row={this.props.row}
					highlightPotentialVertMove={this.props.highlightedPotentialMove !== null &&
						this.props.highlightedPotentialMove.r == this.props.row &&
						this.props.highlightedPotentialMove.c == index &&
						this.props.highlightedPotentialMove.isVertical()}
					highlightPotentialHorizMove={this.props.highlightedPotentialMove !== null &&
						this.props.highlightedPotentialMove.r == this.props.row &&
						this.props.highlightedPotentialMove.c == index &&
						this.props.highlightedPotentialMove.isHorizontal()}
					handleMouseEvent={this.props.handleMouseEvent}
					owningPlayerInitials={this.props.ownershipGridRow[index]} />);
		}
		return (
			<div key={this.props.row} className="gameBoardRow">
				{renderedSquares}
			</div>
		);
	}
}

class GameBoardSquare extends Component {
	static contextType = GameStateContext;
	render() {
		const gameBoardState = this.context;

		let className = "gameBoardSquare";
		const squareIsLastInRow = this.props.column == (gameBoardState.nColumns - 1);
		const squareIsLastInColumn = this.props.row == (gameBoardState.nRows - 1);

		if (squareIsLastInRow)
			className += " rightBorder";
		if (squareIsLastInColumn)
			className += " bottomBorder";

		const children = [
			<SelectionCircle key={3}
				handleMouseEvent={(event) => this.props.handleMouseEvent(
					event, this.props.row, this.props.column)} />,
			<div key={0} className="dot" />
		];

		if (gameBoardState.hasLineDownFrom(this.props.row, this.props.column)) {
			children.push(<div key={4} className="vertLine" />);
		}

		if (gameBoardState.hasLineToRightOf(this.props.row, this.props.column)) {
			children.push(<div key={5} className="horizLine" />);
		}

		if (this.props.highlightPotentialHorizMove) {
			children.push(<div key={6} className="greyedHorizLine" />);
		}

		if (this.props.highlightPotentialVertMove) {
			children.push(<div key={7} className="greyedVertLine" />);
		}

		if (this.props.owningPlayerInitials) {
			children.push(<div key={8} className="boxLabel" align="center"> {this.props.owningPlayerInitials} </div>);
		}

		return (
			<div className={className}>
				{children}
			</div>
		);
	}
}

class SelectionCircle extends Component {
	/* Component representing a selectable position on the dots and boxes grid
	 * Click and enter/leave events used to either trigger a move attempt
	 * or to highlight a possible move.
	 */
	render() {
		return (
			<div className="selectedCoordCircle"
				onMouseDown={() => this.props.handleMouseEvent(mouseEvents.DOWN)}
				onMouseUp={() => this.props.handleMouseEvent(mouseEvents.UP)}
				onMouseEnter={() => this.props.handleMouseEvent(mouseEvents.ENTER)}
				onMouseLeave={() => this.props.handleMouseEvent(mouseEvents.LEAVE)} />
		);
	}
}

class OwnershipGrid {
	constructor(rows, columns, _givenBoard) {
		if (_givenBoard) {
			this.board = _givenBoard;
		} else {
			this.board = [];
			for (let r = 0; r < rows; r++) {
				let row = [];
				for (let c = 0; c < columns; c++)
					row.push(null);
				this.board.push(row);
			}
		}
	}

	update(valuesWithCoordinates) {
		// Returns a new OwnershipGrid object on change as to play nice with React state
		if (valuesWithCoordinates.length == 0)
			return this;
		const newBoard = this.board.map((boardRow, r) => {
			return boardRow.map((boardElement, c) => {
				for (const v of valuesWithCoordinates) {
					if (v.column == c && v.row == r)
						return v.value;
				}
				return boardElement;
			});
		}
		);
		return new OwnershipGrid(null, null, newBoard);
	}
}

function isHorizontalLine(firstCoord, secondCoord) {
	if ((firstCoord.row == secondCoord.row) && (firstCoord.column != secondCoord.column)) {
		return true;
	} else {
		return false;
	}
}

function determineScalingFactor(boardSize) {
	const fractionOfScreenTaken = .8;
	const maxPxScaleFactor = 32;

	const numPxInViewport = (Math.min(
		document.documentElement.clientWidth, document.documentElement.clientHeight));
	const boardSizeInPx = 6 * (boardSize - 1) + 1;
	const pxScaleFactor = numPxInViewport * fractionOfScreenTaken / boardSizeInPx;
	return Math.min(pxScaleFactor, maxPxScaleFactor);
}