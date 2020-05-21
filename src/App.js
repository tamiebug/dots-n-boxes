import React, {Component} from "react";
import {hot} from "react-hot-loader"
import "./App.css";

class GameBoardSquare extends Component {
	render() {
		let className = "gameBoardSquare";
		if (this.props.column == (this.props.boardWidth - 1)) {
			className += " rightBorder";
		}
		if (this.props.row == (this.props.boardHeight - 1)) {
			className += " bottomBorder";	
		}

		let squareChildren = [<div key={0} className="dot" />];
		if (this.props.square.includes("horizLine")) { 
			squareChildren.push(<div key={1} className="horizLine" />)}

		if (this.props.square.includes("vertLine")) {
			squareChildren.push(<div key={2} className="vertLine" />)}

		return (
			<div className={className}>
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
				/>)}
			);	
		return (
		<div key={this.props.row} className="gameBoardRow">
			{renderedSquares}
		</div>

	)}
}
class GameBoard extends Component {
	render() {
		const renderedRows = this.props.squares.map((squareRow, index) => {
			return (<GameBoardRow
				key={index}
				row={index}
				boardWidth={this.props.boardWidth}
				boardHeight={this.props.boardHeight}
				squares={squareRow}
			/>)});
		return (
		<div className="gameBoard">
			{renderedRows}
		</div>
	)}
}

class App extends Component {
	render(){
		return (
			<div className="App">
				<h1> Hello, World! </h1>
				<GameBoard 
					boardWidth={3}
					boardHeight={3}
					squares={[[["horizLine","vertLine"],[],[]],
										[[],[],[]],
										[[],[],[]]]}
				/>
			</div>
		);
	}
}

export default hot(module)(App);
