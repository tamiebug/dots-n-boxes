import React, {Component} from "react";
import {hot} from "react-hot-loader"
import "./App.css";

class App extends Component {
	render(){
		return (
			<div className="App">
				<h1> Hello, World! </h1>
				<div class="gameBoard">
					<div class="gameBoardRow">
						<div class="gameBoardSquare">
							<div class="dot" />
							<div class="vertLine" />
							<div class="horizLine" />
						</div>
						<div class="gameBoardSquare"> 
							<div class="dot" />
						</div>
						<div class="gameBoardSquare rightBorder">
							<div class="dot" />
						</div>
					</div>
					<div class="gameBoardRow">
						<div class="gameBoardSquare">
							<div class="dot" />
						</div>
						<div class="gameBoardSquare">
							<div class="dot" />
						</div>
						<div class="gameBoardSquare rightBorder">
							<div class="dot" />
						</div>
					</div>
					<div class="gameBoardRow">
						<div class="gameBoardSquare bottomBorder">
							<div class="dot" />
						</div>
						<div class="gameBoardSquare bottomBorder"> 
							<div class="dot" />
						</div>
						<div class="gameBoardSquare rightBorder bottomBorder">
							<div class="dot" />
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default hot(module)(App);
