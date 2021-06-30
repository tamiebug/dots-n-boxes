import { testables, TaggedChain, BasicAI, playerEvents } from './players';
import { Move, SquareGrid } from './utility';
import fs from "fs";

function loadTaggedChainsFromJSON(filepath) {
  const json = JSON.parse(fs.readFileSync(filepath));
  return json.map(chainArray => chainArray.map(chain => TaggedChain.fromJSON(chain)));
}

function loadMoveHistoryFromJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath)).map(entry => ({
      move: Move.fromJSON(entry.move),
      range: entry.range.map(rangeEntry => Move.fromJSON(rangeEntry)),
      player: entry.player
    })
  );
}

describe('TaggedChain', () => {
  const cyclicalTaggedChainA = Object.assign(new TaggedChain, {
    active: false,
    doublyActive: false,
    moves: [
      new Move(0, 1, "v"),
      new Move(1, 1, "h"),
      new Move(1, 1, "v"),
      new Move(1, 0, "h")
    ]
  });

  const acyclicalTaggedChainA = Object.assign(new TaggedChain, {
    active: false,
    doublyActive: false,
    moves: [
      new Move(0, 1, "v"),
      new Move(0, 2, "v"),
      new Move(0, 2, "h"),
      new Move(1, 2, "h"),
      new Move(2, 2, "h")
    ]
  });

  const acyclicalTaggedChainB = Object.assign(new TaggedChain, {
    active: false,
    doublyActive: false,
    moves: [
      new Move(2, 3, "h"),
      new Move(2, 4, "v")
    ]
  });

  const rotateChain = (chain, n) => (Object.assign(new TaggedChain, {
    moves: chain.moves.map((_, i) => chain.moves[(i + n) % chain.moves.length]),
    active: chain.active,
    doublyActive: chain.doublyActive
  }));

  const reverseChain = (chain) => (Object.assign(new TaggedChain, {
    moves: [...chain.moves].reverse(),
    active: chain.active,
    doublyActive: chain.doublyActive
  }));

  describe('.isCyclical()', () => {
    test('properly identifies a cyclical chain of moves', () => {
      expect(cyclicalTaggedChainA.isCyclical()).toBe(true);
    });
    test('properly identifies an ayclical chain of moves', () => {
      expect(acyclicalTaggedChainA.isCyclical()).toBe(false);
    });
  });

  describe('.isEquivalentTo()', () => {
    test('properly identifies a reversed acyclical chain of moves as equal to the original', () => {
      expect(acyclicalTaggedChainA.isEquivalentTo(reverseChain(acyclicalTaggedChainA))).toBe(true);
    });
   
    test('properly identifies a reversed cyclical chain of moves as equal to the original', () => {
      expect(reverseChain(cyclicalTaggedChainA).isEquivalentTo(cyclicalTaggedChainA)).toBe(true);
    });

    test.each([[1],[2],[3],[4]])('properly identifies a cyclical chain of moves rotated by %d moves as equal to the original', (n) => {
      expect(rotateChain(cyclicalTaggedChainA, n).isEquivalentTo(cyclicalTaggedChainA)).toBe(true);
    });

    test('properly identifies a reversed and rotated cyclical chain of moves as equal to the original', () => {
      expect(reverseChain(rotateChain(cyclicalTaggedChainA, 3)).isEquivalentTo(cyclicalTaggedChainA)).toBe(true);
    });

    test('properly identifies different chains as different', () => {
      expect(acyclicalTaggedChainA.isEquivalentTo(cyclicalTaggedChainA)).toBe(false);
    });

    test.each([[cyclicalTaggedChainA],[acyclicalTaggedChainA], [acyclicalTaggedChainB]])('properly identifies chains of moves as equal to themselves', (chain) => {
      expect(chain.isEquivalentTo(chain)).toBe(true);
    });

    const toAndFromJSON = (chain) => {
      return TaggedChain.fromJSON(JSON.parse(JSON.stringify(chain)));
    };
    test.each([[cyclicalTaggedChainA], [acyclicalTaggedChainA], [acyclicalTaggedChainB]])('properly identifies chains of moves reconstituted from JSON to be equal to themselves', (chain) => {
      expect(chain.isEquivalentTo(toAndFromJSON(chain))).toBe(true);
    });
  });
});

describe('BasicAI', () => {
  const testSuite = ([
    ['MoveHistory2.json', [3,3]],
  ]);
 
  const loadedMoveHistories = testSuite.map(([filename, dimensions]) => (
    {filename, dimensions, 'moveHistory': loadMoveHistoryFromJSON(`./client/src/test_fixtures/${filename}`)}));

  // We want to reconstruct game states for every entry of moveHistoryEntry so that we can test every expected move set on every turn concurrently
  const testData = [];
  for(const loadedMoveHistory of loadedMoveHistories) {
    const { filename, dimensions, moveHistory } = loadedMoveHistory;

    let gameState = new SquareGrid(...dimensions);
    for (const [index, moveHistoryEntry] of moveHistory.entries()) {
      const newGameState = gameState.update(moveHistoryEntry.move);
      if (moveHistoryEntry.player == 1) {
        // ASSUMPTION: AI is player 1, non-AI is player 0
        testData.push([ index, filename, moveHistoryEntry.range, gameState ]);
      }
      gameState = newGameState;
    }
  }

  test.concurrent.each(testData)('selects the correct range of moves on turn %i from %s', (index, filename, range, gameState) => {
    const basicAI = new BasicAI("BasicAI Test Friend", 0);

    const aiTestingPromise = new Promise( resolve => {
      basicAI.registerCallback( (call) => {
        if (call.type !== playerEvents.SUBMIT_MOVE) return;
        expect(call.range).toBeSameSetOfMoves(range);
        resolve(call.range);
      } );    
      basicAI.updatePlayerState( gameState );
      basicAI.startTurn();
    });

    return aiTestingPromise.then(aiRange => expect(aiRange).toBeSameSetOfMoves(range));
  });
});

expect.extend({toBeSameSetOfMoves(received, arrayOfMoves) {
  if (!Array.isArray(received) || (received.length !== 0 && received.some(move => !(move instanceof Move)))) {
    throw new Error('expected value to be an array of Move');
  }

  if (!Array.isArray(arrayOfMoves) || (arrayOfMoves.length !== 0 && arrayOfMoves.some(move => !(move instanceof Move)))) {
    throw new Error('expected arrayOfMoves to be precisely that - an array of moves');
  }

  if (received.length !== arrayOfMoves.length) {
    return {
      pass: false,
      message: () => `Expected received length of possible moves, ${received.length}, to equal length of arrayOfMoves ${arrayOfMoves.length}`,
    };
  }

  if (received.length == 0 && arrayOfMoves.length == 0) {
    return {
      pass: true,
      message: () => `Expected received length of possible moves and arrayOfMoves to not both be zero`
    };
  }

  const taggedReceivedMoves = received.map(move => ({move, matched: false}));
  const taggedArrayOfMoves = arrayOfMoves.map(move => ({move, matched: false}));

  for (let receivedTaggedMove of taggedReceivedMoves) {
    for (let arrayTaggedMove of taggedArrayOfMoves) {
      if (receivedTaggedMove.move.equals(arrayTaggedMove.move)) {
        receivedTaggedMove.matched = true;
        arrayTaggedMove.matched = true;
      }
    }
  }

  for (let arrayTaggedMove of taggedArrayOfMoves) {
    if (arrayTaggedMove.tagged == true) continue;
    for (let receivedTaggedMove of taggedReceivedMoves) {
      if (receivedTaggedMove.tagged == true) continue;
      if (receivedTaggedMove.move.equals(arrayTaggedMove.move)) {
        receivedTaggedMove.matched = true;
        arrayTaggedMove.matched = true;
      }
    }
  }

  const unmatchedReceivedMoves = taggedReceivedMoves.filter(taggedMove => !taggedMove.matched);
  const unmatchedArrayMoves = taggedArrayOfMoves.filter(taggedMove => !taggedMove.matched);

  const unmatchedMoves = unmatchedReceivedMoves.map(move => ({move, origin: 'received'})).concat(
    unmatchedArrayMoves.map(move => ({move, origin: 'arrayOfMoves'})));

  if (unmatchedMoves.length > 0) {
    return {
      pass: false,
      message: () => `Expected received and arrayOfMoves to have the same moves.  There were ${unmatchedMoves.length} unmatched moves between the two: ${unmatchedMoves}`,
    };
  } else {
    return {
      pass: true,
      message: () => 'Expected received and arrayOfMoves to not be perfectly matched',
    };
  }
}});

expect.extend({toBeEquivalentTaggedChainListTo(received, taggedChainList) {
  if (!Array.isArray(received) || (received.length !== 0 && !(received[0] instanceof TaggedChain))) {
    throw new Error('expected value to be an array of TaggedChain');
  }

  if (!Array.isArray(taggedChainList) || (taggedChainList.length !== 0 && !(taggedChainList[0] instanceof TaggedChain))) {
    throw new Error('expected taggedChainList to be precisely that - an array of taggedChain');
  }

  if (received.length !== taggedChainList.length) {
    return {
      pass: false,
      message: () => `Expected received length, ${received.length}, to equal taggedChainList length ${taggedChainList.length}`
    };
  }

  if (received.length == 0 && taggedChainList.length == 0) {
    return {
      pass : true,
      message : () => `Expected received length and taggedChainList length to not both be zero`
    };
  }

  let receivedCopy = [...received];
  let taggedChainListCopy = [...taggedChainList];
  for (let i = 0; i < receivedCopy.length; i++) {
    let index = taggedChainListCopy.findIndex(chain => {
      if (receivedCopy[i] === undefined) return false;
      else return receivedCopy[i].isEquivalentTo(chain);
    });
    if (index !== -1) {
      delete taggedChainListCopy[index];
      delete receivedCopy[i];
    }
  }

  if (receivedCopy.every(e => e === undefined) && taggedChainListCopy.every(e => e === undefined)) {
    return {
      pass : true,
      message : () => `Expected received and taggedChainList to differ in TaggedChains content and/or number`
    };
  } else {
    const receivedCopyLength = receivedCopy.filter(e => e !== undefined).length;
    const taggedChainListCopyLength = taggedChainListCopy.filter(e => e!== undefined).length;
    return {
      pass : false,
      message : () => `Expected value and taggedChainList to have the same TaggedChains.  However, 
        ${receivedCopyLength} chains in value and ${taggedChainListCopyLength} chains in taggedChainList could not be matched.` 
      };
    }
}});

describe('groupMovesIntoTaggedChains', () => {
  const testTaggedChains = loadTaggedChainsFromJSON('./client/src/test_fixtures/TaggedChains1.json');
  const testMoveHistoryJSON = JSON.parse(fs.readFileSync("./client/src/test_fixtures/MoveHistory1.json"));
  let gameState = new SquareGrid(5, 5);
 
  const testSquareGrids = testMoveHistoryJSON.map((item) => {
    const move = Move.fromJSON(item.move);
    gameState = gameState.update(move);
    return gameState;
  });

  const valuesTable = testTaggedChains.map((chain, index) => [testSquareGrids[index], chain]);
  test.each(valuesTable)('SquareGrid derived from Move %# of GameState1 returns correct TaggedChain', (boardState, taggedChains) => {
    expect(testables.groupMovesIntoTaggedChains(
      boardState, boardState.findSquareCompletingMoves(), testables.findCompletableSquareMakers(boardState)
    )).toBeEquivalentTaggedChainListTo(taggedChains);
 });

  const testTaggedChainsJSON2 = JSON.parse(fs.readFileSync('./client/src/test_fixtures/TaggedChains3.json'));
  const testTaggedChains2 = testTaggedChainsJSON2.map(chainJSON => TaggedChain.fromJSON(chainJSON));

  const testGameState2 = SquareGrid.fromJSON(JSON.parse(fs.readFileSync('client/src/test_fixtures/GameState3.json')));

  test(' when applied to GameState3.json returns the chains in TaggedChains3.json', () => {
    expect(testables.groupMovesIntoTaggedChains(
      testGameState2, testGameState2.findSquareCompletingMoves(), testables.findCompletableSquareMakers(testGameState2)
    )).toBeEquivalentTaggedChainListTo(testTaggedChains2);
  });
  
});
