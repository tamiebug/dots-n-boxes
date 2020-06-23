import React, {Component} from "react";
import {hot} from "react-hot-loader"
import "./App.css";
import { Move, SquareGrid } from "./utility.js";

const mEvents = Object.freeze({
	DOWN:		Symbol("down"),
	UP:			Symbol("up"),
	ENTER:	Symbol("enter"),
	LEAVE:	Symbol("leave")
});

const MAX_BOARD_SIZE = 30;

const GameStateContext = React.createContext(new SquareGrid(2,2));

export const mouseTracker = {
	// We need to know of the current mouse state for some functionalities
	mouseButtonDown : false,
	onUp() { this.mouseButtonDown = false; 	},
	onDown() { this.mouseButtonDown = true;  },
	isMouseButtonDown() { return this.mouseButtonDown; }
};

class SelectionCircle extends Component {
	render() {return (
		<div className="selectedCoordCircle"
			onMouseDown={() => this.props.handleMouseEvent(mEvents.DOWN)}
			onMouseUp={() => this.props.handleMouseEvent(mEvents.UP)}
			onMouseEnter={() => this.props.handleMouseEvent(mEvents.ENTER)}
			onMouseLeave={() => this.props.handleMouseEvent(mEvents.LEAVE)}
		/>
	)}
}

class GameBoardSquare extends Component {
	static contextType = GameStateContext;
	render() {
		let className = "gameBoardSquare";
		if (this.props.column == (this.context.nColumns - 1)) className += " rightBorder";
		if (this.props.row == (this.context.nRows - 1)) className += " bottomBorder";

		let squareChildren = [
			<SelectionCircle key={3}
				handleMouseEvent={(event) => this.props.handleMouseEvent(
				event, this.props.row, this.props.column)}
			/>,
			<div key={0} className="dot" />
		];

		if (this.context.hasLineDown(this.props.row, this.props.column)) {
			squareChildren.push(<div key={4} className="vertLine" />);
		}

		if (this.context.hasLineToRight(this.props.row, this.props.column)) {
			squareChildren.push(<div key={5} className="horizLine" />);
		}

		if (this.props.potentialHorizMove) {
			squareChildren.push(<div key={6} className="greyedHorizLine" />);
		}

		if (this.props.potentialVertMove) {
			squareChildren.push(<div key={7} className="greyedVertLine" />);
		}

		if (this.props.takenBy) {
			squareChildren.push(<div key={8} className="boxLabel" align="center"> {this.props.takenBy} </div>);
		}

		return (
			<div className={className} >
				{squareChildren}
			</div>
		)
	}
}

class GameBoardRow extends Component {
	static contextType = GameStateContext;

	render() {
		let renderedSquares = [];
		for (let index = 0; index < this.context.nColumns; index++) {
			renderedSquares.push(
			<GameBoardSquare
				key={index}
				column={index}
				row={this.props.row}
				potentialVertMove={
					this.props.potentialMove !== null &&
					this.props.potentialMove.r == this.props.row &&
					this.props.potentialMove.c == index &&
					this.props.potentialMove.isVertical()
				}
				potentialHorizMove={
					this.props.potentialMove !== null &&
					this.props.potentialMove.r == this.props.row &&
					this.props.potentialMove.c == index &&
					this.props.potentialMove.isHorizontal()
				}
				handleMouseEvent={this.props.handleMouseEvent}
				takenBy={this.props.ownershipGridRow[index]}
			/>)
		}
	return (
		<div key={this.props.row} className="gameBoardRow" >
			{renderedSquares}
		</div>
	)}
}

class GameBoard extends Component {
	static contextType = GameStateContext;
	constructor(props) {
		super(props);
		this.state = {
			selectedCoord: null,
			potentialMove: null
		};
	}

	handleMouseEvent(event, row, column){
		if (this.state.selectedCoord == null) {
			switch(event) {
				case mEvents.DOWN:
					this.highlightDot(row, column);
					this.setState({selectedCoord : {"column": column, "row": row}});
					break;
				case mEvents.UP:
					break;
				case mEvents.ENTER:
					this.highlightDot(row, column);
					break;
				case mEvents.LEAVE:
					this.unHighlightDot(row, column);
					break;
			}
		} else {
			const selRow = this.state.selectedCoord.row;
			const selColumn = this.state.selectedCoord.column;

			const isAdjacent = ((Math.abs(selColumn - column) + Math.abs(selRow - row)) == 1);
			switch(event) {
				case mEvents.DOWN:
					this.unHighlightPossibleMove();
					this.setState({selectedCoord : {"column": column, "row": row}});
					break;
				case mEvents.UP:
					if (isAdjacent) {
						this.makeMove(row, column);
						this.unHighlightPossibleMove();
					}
					this.setState({selectedCoord : null});
					break;
				case mEvents.ENTER:
					if (!mouseTracker.isMouseButtonDown()) {
						// happens when mouse is released outside of a selection circle
						this.setState({selectedCoord : null});
						break;
					}
					this.highlightDot(row, column);
					if (isAdjacent) {
						this.highlightPossibleMove(row, column);
					}
					break;
				case mEvents.LEAVE:
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
		const boardSize = Math.min(this.context.nColumns, this.context.nRows);
		const renderedRows = this.context.squares.map((squareRow, index) => {
			return (<GameBoardRow
				key={index}
				row={index}
				potentialMove={this.state.potentialMove}
				handleMouseEvent={this.handleMouseEvent.bind(this)}
				ownershipGridRow={this.props.ownershipGrid[index]}
			/>)});
		return (
			<div className="gameBoard" style={{fontSize : determineScalingFactor(boardSize)}}>
				{renderedRows}
			</div>
	)}

	makeMove(row, column) {
		const moveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column)
		};
		const isHorizontal = isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column});
		const move = new Move(moveCoords.row, moveCoords.column, isHorizontal ? "h" : "v");
		if (this.context.isMovePossible(move)) {
			this.props.onGameMove(move);
		}
		return;
	}

	highlightPossibleMove(row, column) {
		const possibleMoveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column)
		};
		if (isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column})) {
			this.setState({potentialMove:
				new Move(possibleMoveCoords.row, possibleMoveCoords.column, "h")});
		} else {
			this.setState({potentialMove:
				new Move(possibleMoveCoords.row, possibleMoveCoords.column, "v")});
		}
		return;
	}

	unHighlightPossibleMove() {
		this.setState({potentialMove: null});
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

class Game extends Component {
	constructor(props) {
		super(props);
		this.state = {
			score1: 0,
			score2: 0,
			playerName1: null,
			playerName2: null,
			firstPlayerGoes: true,
			matchNumber: 0,
			squareGrid: new SquareGrid(2,2),
			ownershipGrid: createEmptyBoard(2,2),
		};
	}

	componentDidMount() {
		const playerName1 = prompt("Player 1, please enter your name");
		const playerName2 = prompt("Player 2, please enter your name");
		let boardSize;
		while(true) {
			boardSize = parseInt(prompt("What size board would you like?"), 10);
			if (Number.isNaN(boardSize) || boardSize < 2 || boardSize > MAX_BOARD_SIZE) {
				alert("Invalid board size selected.  Must be between 2 and " + MAX_BOARD_SIZE);
			} else {
				break;
			}
		}
		this.setState({
			playerName1: playerName1,
			playerName2: playerName2,
			squareGrid: new SquareGrid(boardSize, boardSize),
			ownershipGrid: createEmptyBoard(boardSize, boardSize),
		});
		return;
	}

	componentDidUpdate() {
		//TODO: Find a way to do this that updates all UI before ending game
		if ((this.state.score1 + this.state.score2) == ((this.state.squareGrid.nRows - 1) * (this.state.squareGrid.nColumns - 1))) {
			this.determineWinner();
		}
		return;
	}

	onGameMove(move) {
		this.setState((state, props) => ({squareGrid: state.squareGrid.update(move)}));

		const boxesCompleted = this.state.squareGrid.boxesCompletedBy(move);
		for (let box of boxesCompleted) {
			this.updateMatrixState("ownershipGrid", this.currentPlayerInitials(), ...box);
		}

		if (boxesCompleted.length > 0) {
			const whichScore = this.state.firstPlayerGoes ? "score1" : "score2";
			this.setState((state, props) => (
				{[whichScore]: state[whichScore] + boxesCompleted.length}));
		} else {
			// player does not go again if they do not finish a box / are undoing a box
			this.setState((state, props) => ({firstPlayerGoes: !state.firstPlayerGoes}));
		}
		return;
	}

	removeLastMove() {
		const lastMove = this.state.squareGrid.returnLastMove();
		if (lastMove === null) return false;
		this.setState((state, props) => ({squareGrid: state.squareGrid.remove(lastMove)}));

		const boxesCompleted = this.state.squareGrid.boxesCompletedBy(lastMove);
		for (let box of boxesCompleted) {
			this.updateMatrixState("ownershipGrid", null, ...box);
		}

		if (boxesCompleted.length > 0) {
			const whichScore = this.state.firstPlayerGoes ? "score1" : "score2";
			this.setState((state, props) => (
				{[whichScore]: state[whichScore] - boxesCompleted.length}));
		} else {
			this.setState((state, props) => ({firstPlayerGoes: !state.firstPlayerGoes}));
		}
		return true;
	}

	updateMatrixState(stateVar, newValue, row, column) {
		// Map through rows and columns to find desired element location to mutate
		this.setState((state, props) => ({[stateVar]:
			state[stateVar].map((matrixRow, r) => {
				return matrixRow.map((matrixElement, c) => {
					if(c == column && r == row) {
						return newValue;
					} else {
						return matrixElement;
					}
				});
			})
		}));
	}

	determineWinner() {
		if (this.state.score1 == this.state.score2) {
			alert("The Match was a tie!!");
		} else if (this.state.score1 > this.state.score2) {
			alert(this.state.playerName1 + " is the winner");
		} else {
			alert(this.state.playerName2 + " is the winner");
		}
		if (confirm("Would you like to play again?")) {
			let boardSize;
			while(true) {
				boardSize = parseInt(prompt("What size board would you like?"), 10);
				if (Number.isNaN(boardSize) || boardSize < 2 || boardSize > MAX_BOARD_SIZE) {
					alert("Invalid board size selected.  Must be between 2 and " + MAX_BOARD_SIZE);
				} else {
					break;
				}
			}
			this.setState((state) => ({
				squareGrid: new SquareGrid(boardSize, boardSize),
				ownershipGrid: createEmptyBoard(boardSize, boardSize),
				matchNumber: state.matchNumber + 1,
				score1: 0,
				score2: 0}));
		}
	}

	currentPlayerInitials() {
		//TODO: handle multiple part names with up to three initials
		// e.g. Hillary Rodham Clinton -> HRC
		if (this.state.firstPlayerGoes) {
			return this.state.playerName1.charAt(0);
		} else {
			return this.state.playerName2.charAt(0);
		}
	}

	render() {
		// TODO: Should score be stored elsewhere?  Maybe state changes cause unnecessary GameBoard re-renderings?  Look into it.
		return (
			<div>
				<h1>{this.state.playerName1}[{this.state.score1}] vs {this.state.playerName2}[{this.state.score2}]</h1>
				<h2>Current player is {this.state.firstPlayerGoes? this.state.playerName1 : this.state.playerName2}</h2>
				<GameStateContext.Provider value={this.state.squareGrid}>
					<GameBoard
						key={this.state.matchNumber}
						onGameMove={this.onGameMove.bind(this)}
						currentPlayerInitials={this.currentPlayerInitials.bind(this)}
						ownershipGrid={this.state.ownershipGrid}
					/>
				</GameStateContext.Provider>
				<div style={{padding: "4em"}}>
				<button onClick={() => this.removeLastMove()}
					style={{width: "9em", height: "3em"}}> Undo Move </button>
				</div>
			</div>
		);
	}
}

class App extends Component {
	render(){
		return (
			<div className="App">
				<Game />
			</div>
		);
	}
}

function createEmptyBoard(rows, columns) {
	let board = [];
	for (let r = 0; r < rows; r++) {
		let row = [];
		for (let c = 0; c < columns; c++) row.push(null);
		board.push(row);
	}
	return board;
}

function isHorizontalLine(firstCoord, secondCoord){
	if ((firstCoord.row == secondCoord.row) && (firstCoord.column != secondCoord.column)){
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

function isEmpty(object) {
	for (let key in object) {
		if (object.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
}

export default hot(module)(App);
