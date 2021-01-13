import React, { Component } from "react";
import { Move, SquareGrid } from "./utility.js";
import { LocalHumanPlayer, BasicAI, RandomPlayer, RemotePlayer, WeakAI } from "./players.js";

const MAX_BOARD_SIZE = 30;
const GameStateContext = React.createContext(null);

const mouseEvents = Object.freeze({
	DOWN:		Symbol("down"),
	UP:			Symbol("up"),
	ENTER:	Symbol("enter"),
	LEAVE:	Symbol("leave")
});

export const mouseTracker = {
	// We need to know of the current mouse state for some functionalities
	mouseButtonDown : false,
	onUp() { this.mouseButtonDown = false; },
	onDown() { this.mouseButtonDown = true; },
	isMouseButtonDown() { return this.mouseButtonDown; }
};

export class Game extends Component {
		state = {
			/** Integer.  Current number of match played, starts at zero.  Serves as key for game board component */
			matchNumber: 0,
			/** Array[Player].  Currently active players */
			players: [],
			/** Player. Current Player */
			currentPlayer: null,
			/** SquareGrid.  Contains and manages current game state */
			gameBoardState: null,
			/** TODO: Maybe ownershipGrid can be folded into the gameBoardState object? */
			/** OwnershipGrid.  Contains additional game information: whom owns a given location:  */
			ownershipGrid: null,
			/** Function.  Callback used to communicate local actions to Players */
			localGameBoardInputCallback: null
		};

	constructor(props) {
		super(props);
	}

	componentDidMount() {
		// TODO: For the record, we don't want the game to set itself up.
		this.setUpGame({boardHeight: 5, boardWidth: 5, playerName1: "CPU", playerName2: "CPU", gameType: "CPU", cpuDifficulty: "weak" });
	}


	render() {
		if (this.state.players.length < 2) return null;

		return (
			<div className="row game-div">
				<div className="col col-sm-auto">
					<GameStateContext.Provider value={this.state.gameBoardState}>
						<GameBoard
							key={this.state.matchNumber}
							onValidGameMove={this.onValidGameMove.bind(this)}
							currentPlayerInitials={this.currentPlayerInitials.bind(this)}
							ownershipGrid={this.state.ownershipGrid.board} />
					</GameStateContext.Provider>
				</div>
			</div>
		);
	}

	onValidGameMove(move) {
		if (this.state.localGameBoardInputCallback) {
			this.state.localGameBoardInputCallback(move);
		}
	}

	nextTurn() {
		if (this.state.players.length < 2) return;
		if ((this.state.players[0].score + this.state.players[1].score) == ((this.state.gameBoardState.nRows - 1) * (this.state.gameBoardState.nColumns - 1))) {
			this.setState({ localGameBoardInputCallback: null });
			// TODO: I will want this functionality to eventually be hoisted out of t
			this.determineWinner();
			return;
		}

		const moveAttemptCallback = (move) => {
			this.setState(state => {
				const currPlayer = state.players[state.currentPlayer];
				const newState = {};

				if (!state.gameBoardState.isMovePossible(move)) throw `nextTurn(), player ${currPlayer.name} emitted invalid move ${move})`;

				newState.gameBoardState = state.gameBoardState.update(move);
				
				const boxesCompleted = state.gameBoardState.boxesCompletedBy(move);
				newState.ownershipGrid = state.ownershipGrid.update(
					boxesCompleted.map(box => ({
						value: this.currentPlayerInitials(state),
						row: box[0],
						column: box[1]
					})
					)
				);

				newState.players = state.players.map((player, index) => { return index == state.currentPlayer ? currPlayer.addScore(boxesCompleted.length) : player; });

				// If no boxes were completed, the next player gets to play
				if (boxesCompleted.length == 0) {
					newState.currentPlayer = (state.currentPlayer == 0) ? 1 : 0;
				}

				return newState;
		
			}, () => this.nextTurn());
		};

		this.setState(state => ({
			localGameBoardInputCallback: state.players[state.currentPlayer].updatePlayerState(
				this.state.gameBoardState, moveAttemptCallback)
		}), () => {
			this.state.players[this.state.currentPlayer].generateNextMove();
		});
	}

	removeLastMove() {
		/* TODO: This will need a refactor */
		this.setState(state => {
			const currPlayer = state.players[state.currentPlayer];
			const newState = {};

			// Only allow move removal for matches between local players (for now)
			if (state.players[0] instanceof LocalHumanPlayer && state.players[1] instanceof LocalHumanPlayer) {
				return;
			}

			const lastMove = state.gameBoardState.returnLastMove();
			if (lastMove === null)
				return;
			newState.gameBoardState = state.gameBoardState.remove(lastMove);

			const boxesCompleted = state.gameBoardState.boxesCompletedBy(lastMove);
			newState.ownershipGrid = state.ownershipGrid.update(
				boxesCompleted.map(box => ({
					value: null,
					row: box[0],
					column: box[1]
				})
				)
			);

			newState.players = state.players.map((player, index) => { return index == state.currentPlayer ? currPlayer.addScore(-1 * boxesCompleted.length) : player; });

			if (boxesCompleted.length == 0) {
				newState.currentPlayer = (state.currentPlayer == 0) ? 1 : 0;
			} else {
				newState.currentPlayer = state.currentPlayer;
			}

			return newState;
		}, () => this.nextTurn());
	}

	determineWinner() {
		// TODO: Should this be moved out?  [Or, we could refactor this maybe..]
		// Assumes only two players for now
		const alertThenAskToPlayAgain = (text) => {
			setTimeout(() => {
				alert(text);
				if (confirm("Would you like to play again?"))
					this.setUpGame();
			}, 0);
		};

		if (this.props.players[0].score == this.props.players[1].score) {
			alertThenAskToPlayAgain("The Match was a tie!!");
		} else if (this.props.players[0].score > this.props.players[1].score) {
			alertThenAskToPlayAgain(`${this.props.players[0]._name} is the winner, ${this.props.players[0].score} to ${this.props.players[1].score}!`);
		} else {
			alertThenAskToPlayAgain(`${this.props.players[1]._name} is the winner, ${this.props.players[1].score} to ${this.props.players[0].score}!`);
		}
	}

	setUpGame(settings) {
		let player1, player2;
		switch (settings.gameType) {
			case "local":
				player1 = new LocalHumanPlayer(settings.playerName1);
				player2 = new LocalHumanPlayer(settings.playerName2);
				break;
				case "CPU":
				player1 = new LocalHumanPlayer(settings.playerName1);
				switch (settings.cpuDifficulty) {
					case "random":
						player2 = new RandomPlayer(settings.playerName2);
						break;
					case "weak":
						player2 = new WeakAI(settings.playerName2);
						break;
					case "basic":
						player2 = new BasicAI(settings.playerName2);
						break;
					default:
						new Error(`Incorrect settings.cpuDifficulty value: ${settings.cpuDifficulty}`);
				}
				break;
			default:
				new Error(`incorrect settings.gameType value: ${settings.gameType}`);
		}

		this.setState({
			players: [player1, player2],
			currentPlayer: 0,
			gameBoardState: new SquareGrid(settings.boardWidth, settings.boardHeight),
			ownershipGrid: new OwnershipGrid(settings.boardWidth, settings.boardHeight),
		}, () => this.nextTurn());
	}

	currentPlayerInitials(state) {
		// TODO: handle multiple part names with up to three initials
		// e.g. Hillary Rodham Clinton -> HRC
		const name = state.players[state.currentPlayer]._name;
		//TODO: change this quick hacky fix to something more permanent
		if (name == "CPU") {
			return "CPU";
		} else {
			return name.charAt(0);
		}
	}
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
	}

	attemptMove(row, column) {
		const gameBoardState = this.context;
		const move = new Move(
			Math.min(row, this.state.selectedCoord.row),
			Math.min(column, this.state.selectedCoord.column),
			isHorizontalLine(this.state.selectedCoord, { "row": row, "column": column }) ? "h" : "v"
		);

		if (gameBoardState.isMovePossible(move))  this.props.onValidGameMove(move);		
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