import { Move, SquareGrid } from "./utility.js"


/*******************************************************************************
 * AUXILARY CLASSES FOR PLAYER FUNCTIONALITY
 * class TaggedChain
 * class ChainBuilder
 * function groupMovesIntoTaggedChains
 *******************************************************************************/

export class TaggedChain {
  /**
   * Constructor for TaggedChain class.  Class representing ac hain of Moves that can be done one after another in repeitition 
   * 
   * @param {[Move]} moves          - An array of moves to construct TaggedChain from.  May be empty
   * @param {Boolean} active        - Boolean describing whether chain of Moves can be completed without relinquishing turn, starting from one of the ends
   * @param {Boolean} doublyActive  - Boolean describing whether a chain of Moves can be taken from either end, presumes the chain is active
   */
  constructor(moves = [], active = null, doublyActive = null) {
    this.moves = moves;
    this.active = active;
    this.doublyActive = doublyActive;
  }

  isCyclical() {
    return this.moves.length >= 4 && this.moves[this.moves.length - 1].isAdjacentBoxMoveOf(this.moves[0]);
  }

  isEquivalentTo(taggedChain) {
    if (!(taggedChain instanceof TaggedChain) || 
        this.moves.length !== taggedChain.moves.length ||
        this.active !== taggedChain.active ||
        this.doublyActive !== taggedChain.doublyActive) {
      return false;
    }

    if ( this.moves.length == 0 ) {
      // By above, we also have that taggedChain.moves.length = this.moves.length = 0
      return true;
    }

    if (taggedChain.isCyclical()) {
      if (!this.isCyclical()) return false;
      let firstIndex = taggedChain.moves.findIndex(move => this.moves[0].equals(move));
      let secondIndex = taggedChain.moves.findIndex(move => this.moves[1].equals(move));
      if (firstIndex == -1 || secondIndex == -1) return false;
      if (secondIndex == (firstIndex + 1) % taggedChain.moves.length) {
        return this.moves.every((move, index) => move.equals(taggedChain.moves[(firstIndex + index) % this.moves.length]));
      } else if (secondIndex == (firstIndex - 1 + taggedChain.moves.length) % taggedChain.moves.length) {
        return this.moves.every((move, index) => move.equals(taggedChain.moves[(firstIndex - index + this.moves.length) % this.moves.length]));
      } else {
        return false;
      }
    } else {
      // !taggedChain.isCyclical
      if (this.isCyclical()) return false;
      if (this.moves[0].equals(taggedChain.moves[0])) {
        return this.moves.every((move, index) => move.equals(taggedChain.moves[index]));
      } else {
        // Try reverse matching
        return this.moves.every((move, index) => move.equals(taggedChain.moves[taggedChain.moves.length - index - 1]));
      }
    }
  }
}

class ChainBuilder {
  /**
   * Constructor for ChainBuilder, an auxiliary deque style class to TaggedChain used for building them up from a series of moves
   * @param {Move} firstMove    - Founding Move for the TaggedChain 
   * @param {Boolean} completer  - Boolean representing whether this founding Move completes a box on the grid 
   */
  constructor(firstMove, completer = false) {
    this.leftArray = [firstMove];
    this.rightArray = [firstMove];
    this.active = completer;
    this.doublyActive = false;
  }

  leftMostMove() {
    return this.leftArray[this.leftArray.length -1];
  }

  rightMostMove() {
    return this.rightArray[this.rightArray.length -1];
  }

  prepend(move, completer = false) {
    if (completer) {
      if (this.active) {
        this.doublyActive = true;
      } else {
        this.active = true;
      }
    }
    this.leftArray.push(move);
  }

  append(move, completer = false) {
    if (completer) {
      if (this.active) {
        this.doublyActive = true;
      } else {
        this.active = true;
      }
    }
    this.rightArray.push(move);
  }

  returnChain() {
    /* Call this to construct TaggedChain once all moves have been added */
    return new TaggedChain([...this.leftArray.reverse().slice(0, -1), ...this.rightArray], this.active, this.doublyActive);
  }
}

function groupMovesIntoTaggedChains(currentState, squareCompleters, squareCompletionMakers) {
  /**
   * Returns a list of TaggedChain objects given the current state and sets of moves to build them from.
   * @param {SquareGrid} currentState - current board state
   * @param {Move[]} squareCompleters - list of Move(s) that complete boxes
   * @param {Move[]} squareCompletionMakers - list of Move(s) that create completable boxes
   * @returns {TaggedChain[]} - list of TaggedChain(s)
   */

  // to avoid repeated moves
  squareCompletionMakers = squareCompletionMakers.filter(scmMove => !squareCompleters.some(scMove => scmMove.equals(scMove)));

  const taggedChains = [];
  const taggedMoves = [
    ...squareCompleters.map(move => ({move: move, isCompleter: true, hasBeenConsumed: false})), 
    ...squareCompletionMakers.map(move => ({move: move, isCompleter: false, hasBeenConsumed: false}))
  ];

  const len = taggedMoves.length;
  for (let i = 0; i < len; i++) {
    if (taggedMoves[i].hasBeenConsumed) continue;
    taggedMoves[i].hasBeenConsumed = true;

    let currentChain = new ChainBuilder(taggedMoves[i].move, taggedMoves[i].isCompleter);
    let chainIsBuilding = true;
    while(chainIsBuilding) {
      chainIsBuilding = false;
      for (let j = i+1; j < len; j++) {
        if (taggedMoves[j].hasBeenConsumed) continue;

        if (currentState.update(currentChain.rightMostMove()).boxesCompletedBy(taggedMoves[j].move).length > 0) {
          currentChain.append(taggedMoves[j].move, taggedMoves[j].isCompleter);
          taggedMoves[j].hasBeenConsumed = true;
          chainIsBuilding = true;
        } else if (currentState.update(currentChain.leftMostMove()).boxesCompletedBy(taggedMoves[j].move).length > 0) {
          currentChain.prepend(taggedMoves[j].move, taggedMoves[j].isCompleter);
          taggedMoves[j].hasBeenConsumed = true;
          chainIsBuilding = true;
        }
      }
    }
    taggedChains.push(currentChain.returnChain());
  }
  return taggedChains;
}

/*******************************************************************************
 * PLAYER AGENTS AND AI CLASSES 
 * class Player
 * class LocalHumanPlayer
 * class RandomPlayer
 * class WeakAI
 * class BasicAI
 * class TestCasePlayer
 *******************************************************************************/

export class Player {
  /* Class that represents a player in the game.  They are interacted with by the
   * Game component through two callbacks:
   * updatePlayerState() is called whenever another player has finished making a
   * move, returning a callback ( this._nextMoveCallback ) the Player will call
   * whenever a move has been decided upon.
   * onLocalmoveAttempt() is a callback generated by the GameBoard whenever a
   * move is attempted to be performed there.  Used to enable local players,
   * and potentially to show networked players what the opponents are mousing
   * over.  Unused by AI players (for now).
   * generateNextMove() is used to trigger AI agents to finally calculate and
   * perform their moves; this function is unused by human players.
   */
  constructor(name) {
    this._name = name;
    this.onLocalMoveAttempt = this.onLocalMoveAttempt;
    this._moveCompleteCallback = null;
    this._currentState = null;
    this.score = 0;
  }

  generateNextMove() {
    /*
    //  Keep empty if there is no move calculation
    throw new Error(this.constructor.name + 'does not implement generateNextMove functionality');*/
  }

  onLocalMoveAttempt() {
    /*
    //  Keep empty if not using local GameBoard actions to determine move
    throw new Error(this.constructor.name + 'does not implement onLocalMoveAttempt functionality');*/
  }

  updatePlayerState(squareGrid, moveCompleteCallback) {
    this._moveCompleteCallback = moveCompleteCallback;
    this._currentState = squareGrid.copy();
    return this.onLocalMoveAttempt.bind(this);
  }

  performMove(move_s) {
    const doMove = (move) => {
      // We want to consume the _moveCompleteCallback so that it won't
      // work anymore, we'll need to be passed a new one
      if (this._moveCompleteCallback) {
        let moveCompleteCallback = this._moveCompleteCallback;
        this._moveCompleteCallback = null; 
        moveCompleteCallback(move);
      }
    }
    
    if (move_s instanceof Array) {
      if (!(move_s.length > 0)) {
        throw new Error("performMove received empty Move[]");
      } else if (move_s.some(move => !(move instanceof Move))) {
        throw new Error("performMove received an array containing some non-move Objects");
      }
      doMove(move_s[Math.floor(Math.random() * move_s.length)]);
      return;
    } else if (!(move_s instanceof Move)) {
      if (move_s == null) {
        throw new Error("performMove received null or undefined Move");
      } else if (move_s instanceof Object) {
        throw new Error("performMove received a non-Move object")
      } else {
        throw new Error("performMove did not receive an object at all, let alone a Move object");
      }
    } else {
      // move_s instanceof Move == true
      doMove(move_s);
    } 
    // performMove END
  }

  addScore(num) {
		// addScore returns a modified Player object
		const newPlayer = new this.constructor(this._name);
    newPlayer.score = this.score + num;
		return newPlayer;
  }
}

export class LocalHumanPlayer extends Player {
  /**
   * Class representing the local player interacting with the app manually with mouse and keyboard
   * 
   * @param {String} name - Name to be associated with Player and shown on scoreboard
   */
  constructor(name) {
    super(name);
  }

  onLocalMoveAttempt(move) {
    this.performMove(move);
  }

  generateNextMove() {
    // Empty, no calculations done
    return;
  }

}

export class RandomPlayer extends Player {
  /**
   * Class representing an opponent that just plays random moves
   *  
   * @param {String} name - Name to be associated with Player and shown on scoreboard
   */
  constructor(name) {
    super(name);
  }

  onLocalMoveAttempt(move) {
    // ignore
    return;
  }

  generateNextMove() { 
		setTimeout(() => this.performMove(this._currentState.allPossibleMoves()), 700);
  }
}

export class WeakAI extends Player {
  /**
   * Class representing a very basic AI that always does box-taking moves, and never gives them away if it can help it
   *  
   * @param {String} name - Name to be associated with Player and shown on scoreboard
   */
  constructor(name) {
    super(name);
  }

  onLocalMoveAttempt(move) {
    //ignore
    return;
  }

  generateNextMove() {
    if (this._currentState == null) {
      throw new Error("WeakAI generateNextMove called with null _currentState");
    }

    const squareCompleters = this._currentState.findSquareCompletingMoves();
    if (squareCompleters.length > 0) {
      this.performMove(squareCompleters);
      return;
    }

    const squareCompletionMakers = findCompletableSquareMakers(this._currentState);
    const allMoves = this._currentState.allPossibleMoves();
    if (squareCompletionMakers.length == allMoves.length) {
      this.performMove(allMoves);
      return;
    } else {
      const goodMoves = allMoves.filter(move => {
        for (const badMove of squareCompletionMakers) {
          if (move.equals(badMove)) return false;
        }
        return true;
      });
      this.performMove(goodMoves);
      return;
    }
  }
}

export class BasicAI extends Player {
  /**
   * Class representing an AI agent that has a basic level of game sense, trying to set itself up for victory in the long run
   * 
   * @param {String} name - Name to be associated with Player and shown on scoreboard
   */
  constructor(name) {
    super(name);
    this.strategy = [
      inconsequentialMoves,
      singlyActive1ChainMoves,
      doublyActive2ChainMoves,
      singlyActive3pChainMoves,
      doublyActive4pChainMoves,
      freeDoublyActive3ChainMoves,
      freeSinglyActive2ChainMoves,
      take2ChainMoves,
      takeSecondDoublyActive3ChainMoves,
      takeFirstActive3ChainMoves,
      inactive2ChainMoves,
      inactive3ChainMoves,
      smallestInactiveChainMoves,
      fallthroughMovesFunction
    ];
  }

  onLocalMoveAttempt(move) {
    //ignore
    return;
  }
  
  generateNextMove() {
    if (this._currentState == null) {
      throw new Error("BasicAI generateNextMove called with null _currentState");
    }

    const squareCompletionMakers = findCompletableSquareMakers(this._currentState);
    const squareCompleters = this._currentState.findSquareCompletingMoves();
    const taggedChains = groupMovesIntoTaggedChains(this._currentState, squareCompleters, squareCompletionMakers);
    
    for (const moveSuggester of this.strategy) {
      const moves = moveSuggester(taggedChains, this._currentState);
      if (!(moves instanceof Array)) {
        throw new Error(`a moveSuggester, ${moveSuggester.name} did not return an array of Move.  All moveSuggesters should return Move[], even if empty`);
      }

      if (moves.some(move => !(move instanceof Move))) {
        throw new Error(`Error in ${moveSuggester.name}, returned a non-move Array`);
      }

      if (moves.length > 0) {
        this.performMove(moves);
        return;
      }
    }


  // generateNextMove() END
  }
}

export class TestCasePlayer extends Player {
  // For use in making JSON test files to power test cases only
  constructor(name, JSONWindow) {
    super(name);
    if (JSONWindow) {
      this._JSONWindow = JSONWindow;
    } else {
      this._JSONWindow = window.open("", "Board State JSON");
    }
  }

  onLocalMoveAttempt(move) {
    this._JSONWindow.document.body.innerHTML = JSON.stringify(this._currentState.update(move));
    this.performMove(move);
  }

  generateNextMove() {
    // Empty, no calculations done
    return;
  }

  addScore(num) {
		// addScore returns a modified Player object
		const newPlayer = new this.constructor(this._name, this._JSONWindow);
    newPlayer.score = this.score + num;
		return newPlayer;
  }
}

/*******************************************************************************
 * AUXILIARY FUNCTIONS FOR PLAYER CLASSES
 * function findCompletableSquareMakers
 * function calculateControlValue
 * function flattenIntoMoves
 * auxiliary strategy functions
 *******************************************************************************/

function findCompletableSquareMakers(boardState, moveSubset) {
  if (moveSubset === undefined) {
    moveSubset = boardState.allPossibleMoves();
  }
  // Find moves that create almost completed boxes like |_|
  // A good AI will want to know which one of their moves do this
  // so they don't just give free points to their opponent next turn.
  let badMoves = [];
  for (const move of moveSubset) {
    // I want to add the move to a pseudo-board and check this pseudoboard
    // for completable boxes to the sides of this box.
    const testGrid = boardState.update(move);
    const adjacentTestMoves = boardState.adjacentBoxMoves(move).filter(move => testGrid.isMovePossible(move));
    const adjacentSquareCompleters = testGrid.findSquareCompletingMoves(adjacentTestMoves);

    if (adjacentSquareCompleters.length > 0) {
      // However... do these complete the same square?  We must check, adjacentSquareCompleter might just complete an unrelated square.
      const completeSameSquare = adjacentSquareCompleters.some(scMove => {
        let moveBoxes = boardState.update(scMove).boxesCompletedBy(move);
        let scMoveBoxes = testGrid.boxesCompletedBy(scMove);
        for (const box of moveBoxes) {
          for (const scBox of scMoveBoxes) {
            if (box[0] == scBox[0] && box[1] == scBox[1]) return true;
          }
        }
        return false;
      }); 
      if (completeSameSquare) badMoves.push(move);
    }
  }
  return badMoves;
}

function calculateControlValue(chains) {
  /**
   * Returns a value signifying the advantage of leaving two boxes untaken at the end of every chain of moves
   * @typedef {Object} TaggedChain - group of moves that can be done in a series without relinquishing your turn
   * @property {Move[]} moves
   * @property {boolean} active - whether this group of moves can be all performed now (enemy has moved in the chain)
   * @property {boolean} doublyActive - whether chain is closed off on both ends 
   *
   * @param {TaggedChain[]} chain - list of TaggedChain objects to calculate value for
   * @return {number} - score advantage to be gained by keeping control of all the chains of moves by leaving two boxes and forcing enemy to go first into them all 
   */

  const relevantChains = chains.filter(chain => chain.moves.length >= 4).filter(chain => !chain.active);
  const CV = relevantChains.reduce((prev, chain) => (prev + chain.moves.length - (chain.isCyclical() ? 0 : 1)), 0) - 4*(relevantChains.length - 1);
  return CV;
}

function flattenIntoMoves(chains) {
  return chains.reduce((prev, chain) => ([...prev, ...chain.moves]), []);
}

function inconsequentialMoves(_, currentState) {
  const squareCompletionMakers = findCompletableSquareMakers(currentState);
  const squareCompleters = currentState.findSquareCompletingMoves();
  const inconsequentialMoves = currentState.allPossibleMoves().filter(move => !([...squareCompletionMakers, ...squareCompleters].some(move2 => move.equals(move2))));

  if (inconsequentialMoves.length > 0) {
    if (squareCompleters.length > 0) {
      return squareCompleters;
    } else {
      return inconsequentialMoves;
    }
  } else {
    return [];
  }
}

function singlyActive1ChainMoves(taggedChains) {
  // List moves completing singly-active 1-chains
  const singlyActive1_chains = taggedChains.filter(chain => (chain.moves.length == 1 && chain.active && !chain.doublyActive));
  return flattenIntoMoves(singlyActive1_chains);
}

function doublyActive2ChainMoves(taggedChains) {
  // List moves completing doubly active 2-chains
  const doublyActive2_chains = taggedChains.filter(chain => (chain.moves.length == 2 && chain.doublyActive));
  return (flattenIntoMoves(doublyActive2_chains));
}

function singlyActive3pChainMoves(taggedChains, currentState) {
  // List moves completing singly active 3+ chains 
  const singlyActive3_chainMoves = currentState.findSquareCompletingMoves(
    flattenIntoMoves(taggedChains.filter(chain => (chain.moves.length >= 3 && chain.active &&!chain.doublyActive))));
  return singlyActive3_chainMoves;
}


function doublyActive4pChainMoves(taggedChains, currentState) {
  // List moves completing doubly-active 4+ chains
  const doublyActive4_chainMoves = currentState.findSquareCompletingMoves(
    flattenIntoMoves(taggedChains.filter(chain => chain.moves.length >= 4 && chain.doublyActive)));
  return doublyActive4_chainMoves;
}

function freeDoublyActive3ChainMoves(taggedChains, currentState) {
  // List moves in doubly-active 3-chains that can be automatically taken
  if (taggedChains.filter(chain => (chain.moves.length == 2).length > 0 && chain.active &&!chain.doublyActive)) {
    const doublyActive3_chains = taggedChains.filter(chain => (chain.moves.length == 3 && chain.doublyActive));
    return currentState.findSquareCompletingMoves(flattenIntoMoves(doublyActive3_chains));
  }
}

function freeSinglyActive2ChainMoves(taggedChains, currentState) {
  // List moves in singly-active 2-chains that don't affect who goes first in consequential chains next
  const singlyActive2_chains = taggedChains.filter(chain => (chain.moves.length == 2 && chain.active && !chain.doublyActive));
  if (singlyActive2_chains.length >= 2) {
    return currentState.findSquareCompletingMoves(flattenIntoMoves(singlyActive2_chains));
  } else {
    return [];
  }
}    

function take2ChainMoves(taggedChains, currentState) {
  // Assuming there exists only one active 2-chain, return the proper current move: whether to take it or leave it
  const singlyActive2_chains = taggedChains.filter(chain => (chain.moves.length == 2 && chain.active && !chain.doublyActive));
  if (singlyActive2_chains.length == 1) {
    var CV = calculateControlValue(taggedChains);
    const completingMove = currentState.findSquareCompletingMoves(singlyActive2_chains[0].moves)[0];
    const otherMove = completingMove.equals(singlyActive2_chains[0].moves[0]) ? singlyActive2_chains[0].moves[1] : singlyActive2_chains[0].moves[0];
    if (CV > 4) {
      // Take it
      return [completingMove];
    } else {
      // Leave it
      return [otherMove];
    }
  } else {
    return [];
  }
}

function takeSecondDoublyActive3ChainMoves(taggedChains, currentState) {
  // List moves in doubly-active 3 chains that are safe to do in case of no singly-active 2-chains being available. 
  const doublyActive3_chains = taggedChains.filter(chain => (chain.moves.length == 3 && chain.doublyActive));
  return currentState.findSquareCompletingMoves(
    flattenIntoMoves(doublyActive3_chains));
}

function takeFirstActive3ChainMoves(taggedChains, currentState) {
  // If there is only one 3-chain, list moves taking or leaving it, depending on whether it is optimal to keep control
  const doublyActive3_chains = taggedChains.filter(chain => (chain.moves.length == 3 && chain.doublyActive));
  if (doublyActive3_chains.length == 1) {
    var CV = calculateControlValue(taggedChains);
    const completingMoves = currentState.findSquareCompletingMoves(doublyActive3_chains[0].moves);

    const nonCompletingMoves = doublyActive3_chains[0].moves.filter(move => {
      for (completingMove in completingMoves) {
        if (completingMove.equals(move)) return false;
      }
      return true;
    });

    if (CV > 8) {
      // Take it
      return nonCompletingMoves;
    } else {
      // Leave it
      return completingMoves;
    }
  } else {
    return [];
  }
}

function inactive2ChainMoves(taggedChains) { 
  // List all moves in available inactive 2-chains
  const inactive_2chains = taggedChains.filter(chain => chain.moves.length == 2);
  return flattenIntoMoves(inactive_2chains);
} 

function inactive3ChainMoves(taggedChains) {
  // List moves in inactive 3-chains depending on which player is benifited by parity
  const inactive_3chains = taggedChains.filter(chain => chain.moves.length == 3);
  if (inactive_3chains.length > 0) {  
    const chainToMaybeTake = inactive_3chains[0];
    if ((inactive_3chains.length % 2) == 1) {
      return [chainToMaybeTake.moves[1]];
    } else {
      // Give other player a chance to not take and mess up parity for themselves
      return [chainToMaybeTake.moves[0], chainToMaybeTake.moves[2]];
    }
  } else {
    return [];
  }
}

function smallestInactiveChainMoves(taggedChains) {
  // List moves belonging to smallest inactive chain
  if (taggedChains.length > 0) {
    // should be > 0 by default, but keep this this way just in case so errors can be thrown
    const sortedChains = taggedChains.sort((chain1, chain2) => chain1.moves.length - chain2.moves.length);
    return [...sortedChains[0].moves];
  } else {
    return [];
  }
}

function fallthroughMovesFunction(taggedChains) {
  // List no moves; Throw error and start debugger if called.
  debugger;
  throw new Error("Reached the fallthrough in the players decision-making list.");
}

export const testables = { groupMovesIntoTaggedChains, findCompletableSquareMakers}