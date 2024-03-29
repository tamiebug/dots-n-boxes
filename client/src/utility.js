export const mouseTracker = {
  // We need to know of the current mouse state for some functionalities
  mouseButtonDown : false,
  onUp() { this.mouseButtonDown = false; },
  onDown() { this.mouseButtonDown = true; },
  isMouseButtonDown() { return this.mouseButtonDown; }
};

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

  toJSON() {
    return {
      nRows: this.nRows,
      nColumns: this.nColumns,
      squares: this.squares,
    };
  }

  getMaximumPointsPossible() {
    return ( this.nRows - 1 ) * ( this.nColumns - 1 );
  }

  static fromJSON(json) {
    const retGrid = new SquareGrid(json.nRows, json.nColumns);
    retGrid.squares = json.squares;
    return retGrid;
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
    return "(" + this.r + ", " + this.c + ", " + (this.isHorizontal()? "h)" : "v)");
  }

  static fromJSON(JSON) {
    return new Move(JSON.r, JSON.c, JSON._isHoriz);
  }
}

export class TaggedGrid {
  constructor(rows, columns, _givenTaggedGrid) {
    if (_givenTaggedGrid) {
      this.taggedGrid = _givenTaggedGrid.taggedGrid;
      this.nRows = _givenTaggedGrid.nRows;
      this.nColumns = _givenTaggedGrid.nColumns;
    } else {
      this.taggedGrid = [];
      this.nRows = rows;
      this.nColumns = columns;
      for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < columns; c++) {
          row.push({});
        }
        this.taggedGrid.push(row);
      }
    }
  }

  // Ensure updated grid !=== old grid for React
  update(valuesWithCoordinates) {
    const retVal = new TaggedGrid(undefined, undefined, this);
    retVal.__update(valuesWithCoordinates);
    return retVal;
  }

  clearTagForAll(tag) {
    const newGrid = new TaggedGrid(undefined, undefined, this);

    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nColumns; c++) {
        if (newGrid.taggedGrid[r][c][tag]) {
          newGrid.taggedGrid[r][c] = Object.assign({}, newGrid.taggedGrid[r][c]);
          delete newGrid.taggedGrid[r][c][tag];
        }
      }
    }
    return newGrid;
  }

  at(row, column) {
    return {...this.taggedGrid[row][column]};
  }
  __update(valuesWithCoordinates) {
    valuesWithCoordinates.forEach( valuesWithCoordinate => {
      const { row, column, values, clearPrevious } = valuesWithCoordinate;
      if (row < 0 || row >= this.nRows) {
        throw new Error(`Invalid update row value in TaggedGrid: ${row}`);
      } else if (column < 0 || column >= this.nColumns) {
        throw new Error(`Invalid update column value in TaggedGrid: ${column}`);
      } else {
        if (clearPrevious) {
          this.taggedGrid[row][column] = {...values};
        } else {
          this.taggedGrid[row][column] = {...this.taggedGrid[row][column], ...values};
        }
      }
    });
  }
}

export class MoveHistory {
  constructor(entries = []) {
    this.entries = entries;
    this.length = entries.length;
  }

  update(move, player, range) {
    const newThing = [...this.entries, { move, player, range } ];
    return new MoveHistory(newThing);
    //return new MoveHistory([...this.entries, { move, player, range }]);
  }

  popUpdate() {
    // Pops the top element off of moveHistory, returning the new MoveHistory object as well.
    const { move, player, range } = this.entries[this.length - 1];
    return { move, player, range, newMoveHistory: new MoveHistory([...this.entries.slice(0, -1)]) };
  }

  getRawHistory() {
    return [... this.entries];
  }

  toJSON() {
    return this.entries;
  }

  static fromJSON(json) {
    return new MoveHistory(json.map(entry => ({
      move: Move.fromJSON(entry.move),
      range: (entry.range == undefined) ? undefined : entry.range.map(rangeEntry => Move.fromJSON(rangeEntry)),
      player: entry.player
    })));
  }
}

export function printObjectToJSON(object, replacer = null) {
  const jsonText = JSON.stringify(object, replacer, 2);
  const jsonWindow = window.open();
  jsonWindow.document.open();
  jsonWindow.document.write('<html><body><pre>' + jsonText + '</pre></body></html>');
  jsonWindow.document.close();
  jsonWindow.focus();
  return;
}

export function argmax(array) {
  if (array.length == 0) return -1;
  const first_maximum = array[array.reduce((i_max, x, i, array) => { x > array[i_max] ? i : i_max; }, 0)];
  return [...array.keys()].filter(i => array[i] === first_maximum);
}
