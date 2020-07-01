export class SquareGrid {
  /* SquareGrid is a representation of the current Dots and Boxes
   * board game state along with various helper methods.  Contains constructor,
   * copy constructor, and "update" constructor that returns a new SquareGrid
   * with move added to it ("mutation" of immutable object).  Is also an iterable
   * object, iteration iterates through its this.square entries
   */

  constructor(nRows, nColumns) {
    this.nRows = nRows;
    this.nColumns = nColumns;
    this.squares = [];
    this.moveHistory = [];
    for (let r = 0; r < nRows; r++) {
      let row = [];
      for (let c = 0; c < nColumns; c++) {
        row.push([false, false]);
      }
      this.squares.push(row);
    }
  }

  copy() {
    // deep copy
    let newGrid = Object.create(this);
    newGrid.squares = this.squares.map((row) => row.map((square) => [...square]));
    newGrid.nRows = this.nRows;
    newGrid.nColumns = this.nColumns;
    return newGrid;
  }

  update(move) {
    if (this.isMovePossible(move)) {
      let newGrid = Object.create(this);
      newGrid.nRows = this.nRows;
      newGrid.nColumns = this.nColumns;
      newGrid.squares = this.squares.map((row) => row.map((square) => [...square]));
      newGrid.moveHistory = [...this.moveHistory, move];
      newGrid.squares[move.r][move.c][move.isHorizontal() ? 0 : 1] = true;
      return newGrid;
    } else {
      return null;
    }
  }

  remove(move) {
    if (this.hasMoveBeenDone(move)) {
      let newGrid = Object.create(this);
      newGrid.nRows = this.nRows;
      newGrid.nColumns = this.nColumns;
      newGrid.squares = this.squares.map((row) => row.map((square) => [...square]));
      newGrid.squares[move.r][move.c][move.isHorizontal() ? 0 : 1] = false;
      newGrid.moveHistory = this.moveHistory.slice(0, -1);
      return newGrid;
    } else {
      return null;
    }
  }

  [Symbol.iterator]() {
    return this.squares;
  }

  findSquareCompletingMoves(moveSet = this.allPossibleMoves()) {
  // Find all possible current moves that complete a square
  //        |---                           |---|
  // e.g.   |    <-- moving here to create |   |
  //        |---                           |---|
  let foundMoves = [];
  for (const move of moveSet) {
    if (this.moveCompletesBoxAbove(move) ||
        this.moveCompletesBoxBelow(move) ||
        this.moveCompletesBoxToRight(move) ||
        this.moveCompletesBoxToLeft(move)) {
      foundMoves.push(move);
      }
    }
    return foundMoves;
  }

  adjacentBoxMoves(move) {
    // This function should return all the possible moves on the
    // boundary of the two boxes adjacent to a given move
    // i.e. for a horizontal line move, moves part of the box above
    // and below
    if (!this.isMovePossible(move)) return null;
    if (move.isHorizontal()) {
      return [
        // moves in above box
        new Move(move.r - 1, move.c,     "v"),
        new Move(move.r - 1, move.c,     "h"),
        new Move(move.r - 1, move.c + 1, "v"),
        // moves in box below
        new Move(move.r    , move.c,     "v"),
        new Move(move.r + 1, move.c,     "h"),
        new Move(move.r    , move.c + 1, "v")
      ].filter(move => this.isMoveWithinBounds(move));
    } else {
      //move.isVertical() == true;
      return [
        // moves in box to right
        new Move(move.r    , move.c    , "h"),
        new Move(move.r    , move.c + 1, "v"),
        new Move(move.r + 1, move.c    , "h"),
        // moves in box to the left
        new Move(move.r    , move.c - 1, "h"),
        new Move(move.r    , move.c - 1, "v"),
        new Move(move.r - 1, move.c - 1, "h")
      ].filter(move => this.isMoveWithinBounds(move));
    }
  }

  allPossibleMoves() {
    const moves = [];
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nColumns; c++) {
        let hMove = new Move(r, c, "h");
        let vMove = new Move(r, c, "v");
        if (this.isMovePossible(hMove)) moves.push(hMove);
        if (this.isMovePossible(vMove)) moves.push(vMove);
      }
    }
    return moves;
  }

  returnLastMove() {
    if (this.moveHistory.length > 0) {
      return this.moveHistory[this.moveHistory.length - 1];
    } else {
      return null;
    }
  }

  boxesCompletedBy(move) {
    let boxes = [];
    if (this.moveCompletesBoxAbove(move)) {
      boxes.push([move.r - 1, move.c]);
    }
    if (this.moveCompletesBoxBelow(move)) {
      boxes.push([move.r, move.c]);
    }
    if (this.moveCompletesBoxToRight(move)) {
      boxes.push([move.r, move.c]);
    }
    if (this.moveCompletesBoxToLeft(move)) {
      boxes.push([move.r, move.c - 1]);
    }
    return boxes;
  }

  moveCompletesBoxAbove(move) {
    if (move.isHorizontal() &&
        this.hasLineUp(move.r, move.c) &&
        this.hasLineToRight(move.r - 1, move.c) &&
        this.hasLineDown(move.r - 1, move.c + 1)) {
      return true;
    } else {
      return false;
    }
  }

  moveCompletesBoxBelow(move) {
    if (move.isHorizontal() &&
        this.hasLineDown(move.r, move.c + 1) &&
        this.hasLineToLeft(move.r + 1, move.c + 1) &&
        this.hasLineUp(move.r + 1, move.c)) {
      return true;
    } else {
      return false;
    }
  }

  moveCompletesBoxToRight(move) {
    if (move.isVertical() &&
        this.hasLineToRight(move.r, move.c) &&
        this.hasLineDown(move.r, move.c + 1) &&
        this.hasLineToLeft(move.r + 1, move.c + 1)) {
      return true;
    } else {
      return false;
    }
  }

  moveCompletesBoxToLeft(move) {
    if (move.isVertical() &&
        this.hasLineToLeft(move.r, move.c) &&
        this.hasLineDown(move.r, move.c - 1) &&
        this.hasLineToRight(move.r + 1, move.c -1)) {
      return true;
    } else {
      return false;
    }
  }

  hasLineToRight(r, c) {
    if (!this.isWithinBounds(r, c)) return false;
    return this.squares[r][c][0];
  }

  hasLineToLeft(r, c) {
    if(!this.isWithinBounds(r, c-1)) return false;
    return this.squares[r][c-1][0];
  }

  hasLineUp(r, c) {
    if(!this.isWithinBounds(r-1, c)) return false;
    return this.squares[r-1][c][1];
  }

  hasLineDown(r, c) {
    if(!this.isWithinBounds(r, c)) return false;
    return this.squares[r][c][1];
  }

  isWithinBounds(r, c) {
    return (r >= 0) && (r < this.nRows) && (c >= 0) && (c < this.nColumns);
  }

  isMoveWithinBounds(move) {
    if (this.isWithinBounds(move.r, move.c)) {
      if (move.r == (this.nRows - 1) && move.isVertical()) return false;
      if (move.c == (this.nColumns - 1) && move.isHorizontal()) return false;
      return true;
    }
    return false;
  }

  hasMoveBeenDone(move) {
    return this.squares[move.r][move.c][move.isHorizontal() ? 0 : 1];
  }

  isMovePossible(move) {
    return this.isMoveWithinBounds(move) && !this.hasMoveBeenDone(move);
  }
}

export class Move {
  constructor(r, c, orientation) {
    this.r = r;
    this.c = c;
    if (orientation == "horiz" ||
        orientation == "horizontal" ||
        orientation === true ||
        orientation == "h") {
      this._isHoriz = true;
    } else {
      // Should we not assume vertical in else?
      this._isHoriz = false;
    }
    Object.freeze(this);
  }

  isHorizontal() {
    return this._isHoriz;
  }

  isVertical() {
    return !this._isHoriz;
  }

  equals(move) {
    return (
      this.r == move.r &&
      this.c == move.c &&
      this._isHoriz == move._isHoriz
    );
  }

	toString() {
		return "(" + move.r + ", " + move.c + ", " + move.isHorizontal()? "h)" : "v)";
	}
}

function deepFreeze(object) {
  /* Take caution when using -- there can be no cyclical references within
   * object to be frozen, and no objects within the chain of freezing that
   * you don't want to freeze
   */
  var props = Object.getOwnPropertyNames(object);
  for (let name of props) {
    let value = object[name];
    if (value && typeof value == "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
