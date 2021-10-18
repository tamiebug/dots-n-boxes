import React from "react";
import { hot } from "react-hot-loader";
import "./App.css";
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import { useGameStore } from "./GameStore.js";
import { GameBoard } from "./GameBoard.js";
import { ControlPanel } from "./ControlPanel.js";


export function App() {
  const [ gameState ] = useGameStore();

  return (
    <div className="row game-div App">
      <div className="col col-sm-auto">
        <GameBoard key={ gameState.matchNumber + 1 } />
      </div>
      <div className="col col-sm-auto">
        <ControlPanel key={ 0 } />
      </div>
    </div>
  );
}

export default hot(module)(App);
