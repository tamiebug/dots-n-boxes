import React, {Component} from "react";
import {hot} from "react-hot-loader"
import "./App.css";

const mEvents = Object.freeze({
	DOWN:		Symbol("down"),
	UP:			Symbol("up"),
	ENTER:	Symbol("enter"),
	LEAVE:	Symbol("leave")
});

const MAX_BOARD_SIZE = 30;

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
	render() {
		let className = "gameBoardSquare";
		if (this.props.column == (this.props.boardWidth - 1)) {
			className += " rightBorder";
		}
		if (this.props.row == (this.props.boardHeight - 1)) {
			className += " bottomBorder";	
		}

		let squareChildren = [
			<SelectionCircle key={3}
				handleMouseEvent={(event) => this.props.handleMouseEvent(
				event, this.props.row, this.props.column)}
			/>,
			<div key={0} className="dot" />
		];

		const lineClasses = ["horizLine", "vertLine", "greyedHorizLine", "greyedVertLine"];
		let counter = 4;
		for (let [lineClass, renderValue] of Object.entries(this.props.square)) {
			if (renderValue && lineClasses.includes(lineClass)) {
				squareChildren.push(<div key={counter} className={lineClass} />);
				counter++;
			}
		}

		if ("takenBy" in this.props.square) {
			squareChildren.push(<div key={8} className="boxLabel" align="center"> {this.props.square.takenBy} </div>);}

		return (
			<div className={className} >
				{squareChildren}
			</div>
		)
	} 
}

class GameBoardRow extends Component {
		render() {
			const renderedSquares = this.props.squares.map((square, index) => {
				return (<GameBoardSquare
					key={index}
					boardWidth={this.props.boardWidth}
					boardHeight={this.props.boardHeight}
					column={index}
					row={this.props.row}
					square={square}
					handleMouseEvent={this.props.handleMouseEvent}
				/>)}
			);	
		return (
			<div key={this.props.row} className="gameBoardRow" >
			{renderedSquares}
		</div>

	)}
}

class GameBoard extends Component {
	constructor(props) {
		super(props);
		this.state = {
			selectedCoord: null,
			squares: createEmptyBoard(this.props.boardHeight, this.props.boardWidth)
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
					// We should actually never arrive here, because mEvents.UP happens first
					// and sets self.state.selectedCoord to null
					break;
				case mEvents.UP:
					if (isAdjacent) {
						this.makeMove(row, column);
					}
					this.setState({selectedCoord : null});
					break;
				case mEvents.ENTER:
					this.highlightDot(row, column);
					if (isAdjacent) {
						this.highlightPossibleMove(row, column);
					}
					break;
				case mEvents.LEAVE:
					if (isAdjacent) {
						this.unHighlightPossibleMove(row, column);
					}
					if (selRow != row || selColumn != column) {
						this.unHighlightDot(row, column);
					}
				break;
			}
		}
	}

	render() {
		const boardSize = Math.min(this.props.boardWidth, this.props.boardHeight);
		const renderedRows = this.state.squares.map((squareRow, index) => {
			return (<GameBoardRow
				key={index}
				row={index}
				boardWidth={this.props.boardWidth}
				boardHeight={this.props.boardHeight}
				squares={squareRow}
				handleMouseEvent={this.handleMouseEvent.bind(this)}
			/>)});
		return (
			<div className="gameBoard" style={{fontSize : determineScalingFactor(boardSize)}}> 
				{renderedRows}
			</div>
	)}

	makeMove(row, column){
		const moveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column) 
		};
		const isHorizontal = isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column});
		const newSquareVals = {};
		
		// makeMove triggers several functions, doesn't just modify display.  Thus, we
		// must check whether this truly is a new move before calling numberBoxesMadeByMove
		const currentSquare = this.state.squares[moveCoords.row][moveCoords.column];
		if (isHorizontal) {
			if (currentSquare["horizline"]) return;
			newSquareVals["horizLine"] = true;
		} else {
			if (currentSquare["vertLine"]) return;
			newSquareVals["vertLine"] = true;
		}

		const numberBoxes = this.numberBoxesMadeByMove(moveCoords.row, moveCoords.column, isHorizontal);
		this.updateBoardSquare(newSquareVals, moveCoords.row, moveCoords.column);	
		this.props.onGameMove(numberBoxes);
		return;
	}

	highlightPossibleMove(row, column) {
		const possibleMoveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column)
		};
		const newSquareVals = {};
		if (isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column})) {
			newSquareVals["greyedHorizLine"] = true;
		} else {
			newSquareVals["greyedVertLine"] = true;
		}
		this.updateBoardSquare(newSquareVals, possibleMoveCoords.row, possibleMoveCoords.column);
		return;
	}

	
	unHighlightPossibleMove(row, column) {
		const possibleMoveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column)
		};
		const newSquareVals = {};
		if (isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column})) {
			newSquareVals["greyedHorizLine"] = false;
		} else {
			newSquareVals["greyedVertLine"] = false;
		}
		this.updateBoardSquare(newSquareVals, possibleMoveCoords.row, possibleMoveCoords.column);
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

	numberBoxesMadeByMove(moveRow, moveColumn, isHorizontal) {
		let numberBoxesMade = 0;
		if (isHorizontal) {
			// Completes box above?
			if (((moveRow - 1) >= 0) && 
					("vertLine" in this.state.squares[moveRow-1][moveColumn]) &&
					("horizLine" in this.state.squares[moveRow-1][moveColumn]) &&
					("vertLine" in this.state.squares[moveRow-1][moveColumn+1])) {
				numberBoxesMade++;
				this.labelBox(moveRow-1, moveColumn);
			}
			// Completes box below?
			if (((moveRow + 1) < this.props.boardHeight) &&
					("vertLine" in this.state.squares[moveRow][moveColumn]) &&
					("horizLine" in this.state.squares[moveRow+1][moveColumn]) &&
					("vertLine" in this.state.squares[moveRow][moveColumn+1])) {
				numberBoxesMade++;
				this.labelBox(moveRow, moveColumn);
			}
		} else { // Is vertical
			// Completes box to the right?
			if (((moveColumn + 1) < this.props.boardWidth) &&
					("horizLine" in this.state.squares[moveRow][moveColumn]) &&
					("vertLine" in this.state.squares[moveRow][moveColumn+1]) &&
					("horizLine" in this.state.squares[moveRow+1][moveColumn])) {
				numberBoxesMade++;
				this.labelBox(moveRow, moveColumn);
			}
			// Completes box to the left
			if (((moveColumn - 1) >= 0) &&
					("horizLine" in this.state.squares[moveRow][moveColumn-1]) &&
					("vertLine" in this.state.squares[moveRow][moveColumn-1]) &&
					("horizLine" in this.state.squares[moveRow+1][moveColumn-1])) {
				numberBoxesMade++;
				this.labelBox(moveRow, moveColumn-1);
			}
		}
		return numberBoxesMade;
	}		

	labelBox(boxRow, boxColumn) {
		this.updateBoardSquare({takenBy: this.props.currentPlayerInitials()}, boxRow, boxColumn);
		return;
	}

	updateBoardSquare(newSquareVals, row, column) {
		// Map through rows and columns to find desired element location to mutate
		this.setState((state, props) => ({squares: 
			state.squares.map((squareRow, j) => {
				return squareRow.map((square, i) => {
					if(i == column && j == row) {
						return Object.assign({...square}, newSquareVals);
					} else {
						return square;
					}
				})
			})
		}));
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
			boardWidth: 0,
			boardHeight: 0,
			firstPlayerGoes: true,
			setupComplete: false
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
			boardWidth: boardSize,
			boardHeight: boardSize,
			setupComplete: true
		});
		return;
	}

	componentWillUnmount() {
		// Currently empty, may not be needed.
	}

	componentDidUpdate() {
		//TODO: Find a way to do this that updates all UI before ending game
		if ((this.state.score1 + this.state.score2) == ((this.state.boardHeight - 1) * (this.state.boardWidth - 1))) {
			this.determineWinner();
		}
		return;
	}

	onGameMove(numberBoxesCompleted) {
		if (numberBoxesCompleted > 0) {
			let whichScore = null;
			// Do this with a ?: conditional statement?
			if (this.state.firstPlayerGoes) {
				whichScore = "score1";
			} else {
				whichScore = "score2";
			}
			// Player goes again after completing a box
			this.setState((state, props) => (
				{[whichScore]: state[whichScore] + numberBoxesCompleted}));
		} else {
			this.setState((state, props) => ({firstPlayerGoes: !state.firstPlayerGoes}));
		}
		return;
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
			this.setState({boardWidth: boardSize, boardHeight: boardSize});
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
		if (!this.state.setupComplete) {return null;}
		// Setup is complete
		// TODO: Should score be stored elsewhere?  Maybe state changes cause unnecessary GameBoard re-renderings?  Look into it.
		return (
 			<div>
				<h1>{this.state.playerName1}[{this.state.score1}] vs {this.state.playerName2}[{this.state.score2}]</h1>
					<h2>Current player is {this.state.firstPlayerGoes? this.state.playerName1 : this.state.playerName2}</h2>
				<GameBoard
					boardWidth={this.state.boardWidth}
					boardHeight={this.state.boardHeight}
					onGameMove={this.onGameMove.bind(this)}
					currentPlayerInitials={this.currentPlayerInitials.bind(this)}
				/>
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
	let row = [];
	for (var i = 0; i < columns; i++) {
		row.push({});
	}
	let board = [];
	for (var j = 0; j < rows; j++) {
		board.push(row.map(a => Object.assign({})));
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

export default hot(module)(App);
