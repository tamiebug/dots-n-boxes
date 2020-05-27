import React, {Component} from "react";
import {hot} from "react-hot-loader"
import "./App.css";

const mEvents = Object.freeze({
	DOWN:		Symbol("down"),
	UP:			Symbol("up"),
	ENTER:	Symbol("enter"),
	LEAVE:	Symbol("leave")
});

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
		const row = this.props.row;
		const column = this.props.column;
		let squareChildren = [
				<SelectionCircle key={3}
					handleMouseEvent={(event) => this.props.handleMouseEvent(event, row, column)}
			/>,
			<div key={0} className="dot"/ >
		];

		/*TODO: Find more elegant way of doing this... possibly default invisible but made visible? */
		if ("horizLine" in this.props.square) { 
			squareChildren.push(<div key={4} className="horizLine" />)}
		if ("vertLine" in this.props.square) {
			squareChildren.push(<div key={5} className="vertLine" />)}
		if ("greyedHorizLine" in this.props.square) {
			squareChildren.push(<div key={6} className="greyedHorizLine" />)}
		if ("greyedVertLine" in this.props.square) {
			squareChildren.push(<div key={7} className="greyedVertLine" />)}
		
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
		/*TODO: Make mouseUp events outside of selectedCoordCircle(s) reset selectedCoord
		 *TODO: Make mouseDown events outside of them do the same */
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
			/*TODO: Refactor functions to use already-calculated variables here?
			 * Lots of duplicated work between this section and this.makeMove */
			const selRow = this.state.selectedCoord.row;
			const selColumn = this.state.selectedCoord.column;

			const isAdjacent = ((Math.abs(selColumn - column) + Math.abs(selRow - row)) == 1);
			const lineOrientation = (selRow - row) == 0 ? "horizLine" : "vertLine";

			const topLeft = {"row": Math.min(selRow, row), "column": Math.min(selColumn, column)};
			const currSquare = {...this.state.squares[topLeft.row][topLeft.column]};

			switch(event) {
				case mEvents.DOWN:
					break;
				case mEvents.UP:
					if (isAdjacent && !(lineOrientation in currSquare)) {
						this.makeMove(row, column);
					}
					this.setState({selectedCoord : null});
					break;
				case mEvents.ENTER:
					this.highlightDot(row, column);
					if (isAdjacent && !(lineOrientation in currSquare)) {
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
			<div className="gameBoard">
			{renderedRows}
		</div>
	)}

	makeMove(row, column){
		const moveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column) 
		};
		const newSquare = {...this.state.squares[moveCoords.row][moveCoords.column]};	
		if (isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column})) {
			newSquare["horizLine"] = true;
		} else {
			newSquare["vertLine"] = true;
		}
		this.updateBoardSquare(newSquare, moveCoords.row, moveCoords.column);	
		return;
	}

	highlightPossibleMove(row, column) {
		const possibleMoveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column)
		};
		const newSquare = {...this.state.squares[possibleMoveCoords.row][possibleMoveCoords.column]};
		if (isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column})) {
			newSquare["greyedHorizLine"] = true;
		} else {
			newSquare["greyedVertLine"] = true;
		}
		this.updateBoardSquare(newSquare, possibleMoveCoords.row, possibleMoveCoords.column);
		return;
	}

	
	unHighlightPossibleMove(row, column) {
		const possibleMoveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column)
		};
		const newSquare = {...this.state.squares[possibleMoveCoords.row][possibleMoveCoords.column]};
		if (isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column})) {
			delete newSquare["greyedHorizLine"];
		} else {
			delete newSquare["greyedVertLine"];
		}
		this.updateBoardSquare(newSquare, possibleMoveCoords.row, possibleMoveCoords.column);
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


	updateBoardSquare(newSquare, row, column){
		// Map through rows and columns to find desired element location to mutate
		this.setState({squares: 
			this.state.squares.map((squareRow, j) => {
				return squareRow.map((square, i) => {
					if(i == column && j == row) {
						return newSquare;
					} else {
						return square;
					}
				})
			})
		});
	}
	
}

class App extends Component {
	render(){
		return (
			<div className="App">
				<h1> Hello, World! </h1>
				<GameBoard 
					boardWidth={5}
					boardHeight={5}
				/>
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

export default hot(module)(App);
