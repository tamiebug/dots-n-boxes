import React, { useState, useContext } from "react";
import { Move , mouseTracker } from "./utility.js";
import { GameStateContext } from "./GameContext.js";

const mouseEvents = Object.freeze({
  DOWN:   Symbol("down"),
  UP:     Symbol("up"),
  ENTER:  Symbol("enter"),
  LEAVE:  Symbol("leave")
});

export function GameBoard() {
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [highlightedPotentialMove, setHighlightedPotentialMove] = useState(null);
  const { gameState } = useContext(GameStateContext);
  const { players, gameBoardState } = gameState;

  if (gameState.gameBoardState == null)
    return null;

  function render() {
    const boardSize = Math.max(...Object.values(gameBoardState.getDimensions()));
    const renderedRows = gameBoardState.squares.map((_, index) => {
      return (<GameBoardRow
        key={index}
        row={index}
        highlightedPotentialMove={highlightedPotentialMove}
        handleMouseEvent={(...args) => handleMouseEvent(...args)} />);
    });
    return (
      <div className="gameBoard jumbotron" style={{ fontSize: determineScalingFactor(boardSize) }}>
        {renderedRows}
      </div>
    );
  }

  function handleMouseEvent(event, row, column) {
    if (selectedCoordinate == null) {
      switch (event) {
        case mouseEvents.DOWN:
          highlightDot(row, column);
          setSelectedCoordinate({ row, column });
          break;
        case mouseEvents.UP:
          break;
        case mouseEvents.ENTER:
          highlightDot(row, column);
          break;
        case mouseEvents.LEAVE:
          unHighlightDot(row, column);
          break;
      }
    } else {
      const { 'row': selectedRow, 'column': selectedColumn } = selectedCoordinate;
      const isAdjacent = ((Math.abs(selectedColumn - column) + Math.abs(selectedRow - row)) == 1);
      switch (event) {
        case mouseEvents.DOWN:
          unHighlightPossibleMove();
          setSelectedCoordinate({ row, column });
          break;
        case mouseEvents.UP:
          if (isAdjacent) {
            attemptMove(row, column);
            unHighlightPossibleMove();
          }
          setSelectedCoordinate(null);
          break;
        case mouseEvents.ENTER:
          if (!mouseTracker.isMouseButtonDown()) {
            // happens when mouse is released outside of a selection circle
            setSelectedCoordinate(null);
            break;
          }
          highlightDot(row, column);
          if (isAdjacent) {
            highlightPossibleMove(row, column);
          }
          break;
        case mouseEvents.LEAVE:
          if (isAdjacent) {
            unHighlightPossibleMove();
          }
          if (selectedRow != row || selectedColumn != column) {
            unHighlightDot(row, column);
          }
          break;
      }
    }
  }

  function attemptMove(row, column) {
    const move = new Move(
      Math.min(row, selectedCoordinate.row),
      Math.min(column, selectedCoordinate.column),
      isHorizontalLine(selectedCoordinate, { row, column }) ? "h" : "v"
    );

    // TODO:  Potentially move this into the reducer, 'onLocalMoveAttempt' action maybe?
    if (gameBoardState.isMovePossible(move)) {
      players.forEach( player => player.onLocalMoveAttempt(move));
      //players[currentPlayer].onLocalMoveAttempt(move);
    }
  }

  function highlightPossibleMove(row, column) {
    const move = new Move(
      Math.min(row, selectedCoordinate.row),
      Math.min(column, selectedCoordinate.column),
      isHorizontalLine(selectedCoordinate, { row, column }) ? "h" : "v"
    );
    setHighlightedPotentialMove(move);
    return;
  }

  function unHighlightPossibleMove() {
    setHighlightedPotentialMove(null);
    return;
  }

  function highlightDot() {
    //TODO: Implement highlightDot & unHighlightDot
    return;
  }

  function unHighlightDot() {
    //TODO: Implement highlightDot & unHighlightDot
    return;
  }

  // TODO: Maybe reorganize so that we don't just call render at the end?
  // Potentially, this component deserves its own reducer?  Or maybe
  // we can factor out some functions?  We'll see.
  return render();
}
function GameBoardRow(props) {
  const { gameState } = useContext(GameStateContext);
  const { gameBoardState } = gameState;

  let renderedSquares = [];
  for (let index = 0; index < gameBoardState.nColumns; index++) {
    renderedSquares.push(
      <GameBoardSquare
        key={index}
        column={index}
        row={props.row}
        highlightPotentialVertMove={props.highlightedPotentialMove !== null &&
          props.highlightedPotentialMove.r == props.row &&
          props.highlightedPotentialMove.c == index &&
          props.highlightedPotentialMove.isVertical()}
        highlightPotentialHorizMove={props.highlightedPotentialMove !== null &&
          props.highlightedPotentialMove.r == props.row &&
          props.highlightedPotentialMove.c == index &&
          props.highlightedPotentialMove.isHorizontal()}
        handleMouseEvent={props.handleMouseEvent} />);
  }
  return (
    <div key={props.row} className="gameBoardRow">
      {renderedSquares}
    </div>
  );
}
function GameBoardSquare(props) {
  const { gameState } = useContext(GameStateContext);
  const { gameBoardState, taggedGrid } = gameState;

  let squareStyle = {};
  const isInChain = taggedGrid.at(props.row, props.column).taggedChain;
  if (isInChain) {
    squareStyle.backgroundColor = isInChain.color;
  }

  const squareOwnerInitials = taggedGrid.at(props.row, props.column).initials;
  return (
    <div className="gameBoardSquare" style={squareStyle}>
      <SelectionCircle key={3} handleMouseEvent={(event) => props.handleMouseEvent(event, props.row, props.column)} />
      <div key={0} className="dot" />
      {gameBoardState.hasLineDownFrom(props.row, props.column) && <div key={4} className="vertLine" />}
      {gameBoardState.hasLineToRightOf(props.row, props.column) && <div key={5} className="horizLine" />}
      {props.highlightPotentialHorizMove && <div key={6} className="greyedHorizLine" />}
      {props.highlightPotentialVertMove && <div key={7} className="greyedVertLine" />}
      {squareOwnerInitials && <div key={8} className="boxLabel" align="center"> {squareOwnerInitials} </div>}
    </div>
  );
}
function SelectionCircle(props) {
  /* Component representing a selectable position on the dots and boxes grid
   * Click and enter/leave events used to either trigger a move attempt
   * or to highlight a possible move.
   */
  return (
    <div className="selectedCoordCircle"
      onMouseDown={() => props.handleMouseEvent(mouseEvents.DOWN)}
      onMouseUp={() => props.handleMouseEvent(mouseEvents.UP)}
      onMouseEnter={() => props.handleMouseEvent(mouseEvents.ENTER)}
      onMouseLeave={() => props.handleMouseEvent(mouseEvents.LEAVE)} />
  );
}
function isHorizontalLine(firstCoord, secondCoord) {
  if ((firstCoord.row == secondCoord.row) && (firstCoord.column != secondCoord.column)) {
    return true;
  } else {
    return false;
  }
}
// TODO:  This is a very crude function; just takes biggest dimension
// and uses that to scale.  Should scale horiz and vert, then take the
// min of those two scalings so that it fits in viewport, instead of
// taking the max of both then using that to determine viewport.
function determineScalingFactor(boardSize) {
  const fractionOfScreenTaken = .8;
  const maxPxScaleFactor = 32;

  const numPxInViewport = (Math.min(
    document.documentElement.clientWidth, document.documentElement.clientHeight));
  const boardSizeInPx = 6 * (boardSize - 1) + 1;
  const pxScaleFactor = numPxInViewport * fractionOfScreenTaken / boardSizeInPx;
  return Math.min(pxScaleFactor, maxPxScaleFactor);
}
