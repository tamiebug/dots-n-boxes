export class SquareGrid {
  /* SquareGrid is a representation of the current Dots and Boxes
   * board game state along with various helper methods.  Contains constructor,
   * copy constructor, and "update" constructor that returns a new SquareGrid
   * with move added to it ("mutation" of immutable object).  Is also an iterable
   * object, iteration iterates through its this.square entries
   */

  constructor(nRows, nColumns) {
    this.nRows = nRows || 2;
    this.nColumns = nColumns || 2;
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
        new Move(move.r + 1, move.c - 1, "h")
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
        this.hasLineUpFrom(move.r, move.c) &&
        this.hasLineToRightOf(move.r - 1, move.c) &&
        this.hasLineDownFrom(move.r - 1, move.c + 1)) {
      return true;
    } else {
      return false;
    }
  }

  moveCompletesBoxBelow(move) {
    if (move.isHorizontal() &&
        this.hasLineDownFrom(move.r, move.c + 1) &&
        this.hasLineToLeftOf(move.r + 1, move.c + 1) &&
        this.hasLineUpFrom(move.r + 1, move.c)) {
      return true;
    } else {
      return false;
    }
  }

  moveCompletesBoxToRight(move) {
    if (move.isVertical() &&
        this.hasLineToRightOf(move.r, move.c) &&
        this.hasLineDownFrom(move.r, move.c + 1) &&
        this.hasLineToLeftOf(move.r + 1, move.c + 1)) {
      return true;
    } else {
      return false;
    }
  }

  moveCompletesBoxToLeft(move) {
    if (move.isVertical() &&
        this.hasLineToLeftOf(move.r, move.c) &&
        this.hasLineDownFrom(move.r, move.c - 1) &&
        this.hasLineToRightOf(move.r + 1, move.c -1)) {
      return true;
    } else {
      return false;
    }
  }

  hasLineToRightOf(r, c) {
    if (!this.isWithinBounds(r, c)) return false;
    return this.squares[r][c][0];
  }

  hasLineToLeftOf(r, c) {
    if(!this.isWithinBounds(r, c-1)) return false;
    return this.squares[r][c-1][0];
  }

  hasLineUpFrom(r, c) {
    if(!this.isWithinBounds(r-1, c)) return false;
    return this.squares[r-1][c][1];
  }

  hasLineDownFrom(r, c) {
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

  getDimensions() {
    return { 'rows': this.nRows, 'columns': this.nColumns };
  }
}

export class Move {
  constructor(r, c, orientation) {
    this.r = r;
    this.c = c;
    if (orientation == "horiz" ||
        orientation == "horizontal" ||
        orientation === true ||
        orientation == "true" ||
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

  isAdjacentBoxMoveOf(move) {
    if (this.isHorizontal()) {
      if (move.isHorizontal()) {
        return (this.r == move.r-1 && this.c == move.c) ||
          (this.r == move.r+1 && this.c == move.c);
      } else /* move.isVertical() */ {
        return (this.r == move.r+1 && this.c == move.c) || 
          (this.r == move.r+1 && this.c == move.c-1) ||
          (this.r == move.r && this.c == move.c) ||
          (this.r == move.r && this.c == move.c-1);
      }
    } else /* this.isVertical() */ {
      if (move.isHorizontal()) {
        return (this.r == move.r && this.c == move.c) ||
          (this.r == move.r-1 && this.c == move.c) ||
          (this.r == move.r && this.c == move.c+1) ||
          (this.r == move.r-1 && this.c == move.c+1);
      } else /* move.isVertical() */ {
        return (this.r == move.r && this.c == move.c+1) ||
          (this.r == move.r && this.c == move.c-1);
      }
    }
  }

	toString() {
		return "(" + move.r + ", " + move.c + ", " + move.isHorizontal()? "h)" : "v)";
  }
  
  static fromJSON(JSON) {
    return new Move(JSON.r, JSON.c, JSON._isHoriz);
  }
}

export class OwnershipGrid {
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

export function loadTaggedChainsFromJSON(filepath) {
  const JSON = require(filepath);
  // Add prototypes to reconstitute Moves and TaggedChains
  return JSON.map(chainArray => 
    chainArray.map(chain => {
      const movesObj = { moves: chain.moves.map(moveJSON => Move.fromJSON(moveJSON)) };
      return Object.assign(new TaggedChain, chain, movesObj);
    })
  );
}

export function loadSquareGridFromJSON(filepath) {
  // Creates an array of SquareGrids to use for testing from a final
  // SquareGrid gamestate saved as JSON
  const JSON = require(filepath);
  const moves = JSON.moveHistory.map(moveJSON => Move.fromJSON(moveJSON));
  let currentGrid = new SquareGrid(JSON.nRows, JSON.nColumns);
  return moves.map(move => currentGrid = currentGrid.update(move));// intentional assn.
}

export function argmax(array) {
  if (array.length == 0) return -1;
  const first_maximum = array[array.reduce((i_max, x, i, array) => { x > array[i_max] ? i : i_max }, 0)];
  return [...array.keys()].filter(i => arr[i] === first_maximum);
}