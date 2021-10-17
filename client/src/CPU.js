import { Move } from "./utility.js";

/*
export const playerEvents = Object.freeze({
  SUBMIT_MOVE:    Symbol("submit move"),
  AI_SHOW_CHAINS: Symbol("show chains"),
  AI_HIDE_CHAINS: Symbol("hide chains"),
});
*/

export const CPUTypes = Object.freeze({
  RANDOM:  Symbol("random"),
  WEAK:    Symbol("weak"),
  BASIC:   Symbol("basic"),
});

export const CPUMoveFunctions = {
  [CPUTypes.RANDOM]: randomCPUMove,
  [CPUTypes.WEAK]: weakCPUMove,
  [CPUTypes.BASIC]: basicCPUMove,
};

function randomCPUMove( gameState, moveDelay = 500 ) {
  if ( gameState.gameBoardState == null ) throw new Error("RandomCPUMove called with null gamestate");
  return timeoutPromise(moveDelay).then( () => pickMoveAtRandom( gameState.gameBoardState.allPossibleMoves() ));
}

function weakCPUMove( gameState, moveDelay = 500 ) {
  if ( gameState.gameBoardState == null ) throw new Error("WeakCPUMove called with null gameState");

  const strategyPromise = new Promise( resolve => {
    const squareCompleters = gameState.gameBoardState.findSquareCompletingMoves();
    if (squareCompleters.length > 0) {
      resolve(squareCompleters);
      return;
    }

    const squareCompletionMakers = findCompletableSquareMakers( gameState.gameBoardState );
    const allMoves = gameState.gameBoardState.allPossibleMoves();
    if (squareCompletionMakers.length == allMoves.length) {
      resolve(allMoves);
      return;
    } else {
      const goodMoves = allMoves.filter(move => {
        for (const badMove of squareCompletionMakers) {
          if (move.equals(badMove)) return false;
        }
        return true;
      });
      resolve(goodMoves);
      return;
    }
  });

  return Promise.all( [timeoutPromise(moveDelay), strategyPromise] ).then( ([, moves]) => pickMoveAtRandom( moves ));
}

function basicCPUMove( gameState, moveDelay = 500, testing ) {
  const strategy = [
    inconsequentialMoves,
    singlyActive1ChainMoves,
    doublyActive2ChainMoves,
    singlyActive3pChainMoves,
    doublyActive4pChainMoves,
    //freeDoublyActive3ChainMoves,  I don't think there are free doubly active 3-chain moves...
    freeSinglyActive2ChainMoves,
    take2ChainMoves,
    takeSecondDoublyActive3ChainMoves,
    takeFirstActive3ChainMoves,
    inactive2ChainMoves,
    inactive3ChainMoves,
    smallestInactiveChainMoves,
    fallthroughMovesFunction
  ];

  if (gameState.gameBoardState == null) throw new Error("BasicAIMove called with null gameState");

  const squareCompletionMakers = findCompletableSquareMakers( gameState.gameBoardState );
  const squareCompleters = gameState.gameBoardState.findSquareCompletingMoves();
  const taggedChains = groupMovesIntoTaggedChains(gameState.gameBoardState, squareCompleters, squareCompletionMakers);

  const strategyPromise = new Promise( resolve => {
    for (const moveSuggester of strategy) {
      //console.log(`executing strategy: ${moveSuggester.name}`);

      const moves = moveSuggester(taggedChains, gameState.gameBoardState);
      //console.log(`result of execution: ${moves.map(move=>move.toString())}`);
      if (!(moves instanceof Array)) {
        throw new Error(`a moveSuggester, ${moveSuggester.name} did not return an array of Move.  All moveSuggesters should return Move[], even if empty`);
      }

      if (moves.some(move => !(move instanceof Move))) {
        throw new Error(`Error in ${moveSuggester.name}, returned a non-move Array`);
      }

      if (moves.length > 0) {
        resolve(moves);
        break;
      }
    }
  });

  if ( testing === true ) return strategyPromise;
  const timedMovePromise = Promise.all([ timeoutPromise( moveDelay ), strategyPromise ]).then( ([, moves]) => {
    //this._gameCallback({ type: playerEvents.AI_HIDE_CHAINS }); TODO: This code never worked as intended in the first place... kept here as reminder
    return pickMoveAtRandom(moves);
  });
  if ( gameState.appSettings.debugMode ) {
    // TODO: Not the most elegant mechanism, but I do not want changes to disable old functionality.
    return { chains: turnTaggedChainsIntoBoxArrays(taggedChains, gameState.gameBoardState ), movePromise: timedMovePromise };
  } else {
    return timedMovePromise;
  }
}

export const wrapMoveGeneratorForDebug = moveFunction => function wrappedMoveGenerator( gameState, moveDelay = 500 ) {
  if (!wrappedMoveGenerator._JSONWindow ) wrappedMoveGenerator._JSONWindow = window.open("", "Board State JSON");
  const move = moveFunction( gameState, moveDelay );
  wrappedMoveGenerator._JSONWindow.document.body.innerHTML = JSON.stringify( gameState.gameBoardState.update(move) );
  return move;
};

/*******************************************************************************
 * AUXILARY CLASSES FOR CPU FUNCTIONALITY AND STRATEGY
 * class TaggedChain
 * class ChainBuilder
 * function groupMovesIntoTaggedChains
 * function findCompletableSquareMakers
 * function calculateControlValue
 * function flattenIntoMoves
 * auxiliary strategy functions
*******************************************************************************/

export class TaggedChain {
  /**
   * Constructor for TaggedChain class.  Class representing a chain of Moves that can be done one after another in repetition
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

  static fromJSON(json) {
    return new TaggedChain(json.moves.map(move => Move.fromJSON(move)), json.active, json.doublyActive);
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

        if ( currentState.update(currentChain.rightMostMove()).boxesCompletedBy(taggedMoves[j].move).length > currentState.boxesCompletedBy(taggedMoves[j].move).length ) {
          currentChain.append(taggedMoves[j].move, taggedMoves[j].isCompleter);
          taggedMoves[j].hasBeenConsumed = true;
          chainIsBuilding = true;
        } else if (currentState.update(currentChain.leftMostMove()).boxesCompletedBy(taggedMoves[j].move).length > currentState.boxesCompletedBy(taggedMoves[j].move).length ) {
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

/*function freeDoublyActive3ChainMoves(taggedChains, currentState) {
  // List moves in doubly-active 3-chains that can be automatically taken
  if (taggedChains.filter(chain => (chain.moves.length == 2).length > 0 && chain.active &&!chain.doublyActive)) {
    const doublyActive3_chains = taggedChains.filter(chain => (chain.moves.length == 3 && chain.doublyActive));
    return currentState.findSquareCompletingMoves(flattenIntoMoves(doublyActive3_chains));
  }
}*/

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
      // Leave it
      return [otherMove];
    } else {
      // Take it
      return [completingMove];
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
      for (let completingMove in completingMoves) {
        if (completingMove.equals(move)) return false;
      }
      return true;
    });

    if (CV > 8) {
      // Leave it
      return nonCompletingMoves;
    } else {
      // Take it
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

function fallthroughMovesFunction() {
  // List no moves; Throw error and start debugger if called.
  throw new Error("Reached the fallthrough in the players decision-making list.");
}

function timeoutPromise(delay) {
  return new Promise( resolve => setTimeout(resolve, delay));
}

function pickMoveAtRandom( moves ) {
  if (Array.isArray(moves)) {
    return moves[ Math.floor(Math.random() * moves.length) ];
  } else {
    return moves;
  }
}

function turnTaggedChainsIntoBoxArrays(taggedChains, gameBoard) {
  const findBox = (move1, move2) => {
    return [
      Math.min(move1.c, move2.c),
      Math.min(move1.r, move2.r),
    ];
  };
  return taggedChains.map(taggedChain => {
    const boxChain = [];
    const chainLength = taggedChain.moves.length;
    for (let i=0; i < chainLength - 1; i++) {
      boxChain.push(findBox(taggedChain.moves[i], taggedChain.moves[i+1]));
    }
    if (taggedChain.isCyclical()) boxChain.push(findBox(taggedChain.moves[chainLength - 1], taggedChain.moves[0]));
    if (chainLength > 0) boxChain.push(...gameBoard.boxesCompletedBy(taggedChain.moves[0]));
    if (chainLength > 1) boxChain.push(...gameBoard.boxesCompletedBy(taggedChain.moves[chainLength - 1]));
    return boxChain;
  });
}

export const testables = { groupMovesIntoTaggedChains, findCompletableSquareMakers};
