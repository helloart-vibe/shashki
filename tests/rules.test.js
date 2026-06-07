const assert = require("node:assert/strict");
const { CheckersRules } = require("../public/rules.js");

function emptyBoard() {
  return Array.from({ length: CheckersRules.SIZE }, () => Array(CheckersRules.SIZE).fill(null));
}

function gameWith(board, turn = CheckersRules.WHITE) {
  return {
    board,
    turn,
    status: "playing",
    winner: null,
    lastMove: null,
    message: "",
  };
}

function testKingMustContinueLongestCapture() {
  const board = emptyBoard();
  board[0][0] = { color: CheckersRules.WHITE, king: true };
  board[2][2] = { color: CheckersRules.BLACK, king: false };
  board[1][5] = { color: CheckersRules.BLACK, king: true };

  const moves = CheckersRules.getLegalMoves(gameWith(board), CheckersRules.WHITE);

  assert.deepEqual(moves, [
    {
      from: { r: 0, c: 0 },
      steps: [
        { to: { r: 3, c: 3 }, capture: { r: 2, c: 2 } },
        { to: { r: 0, c: 6 }, capture: { r: 1, c: 5 } },
      ],
    },
  ]);
}

function testShortKingCaptureIsRejected() {
  const board = emptyBoard();
  board[0][0] = { color: CheckersRules.WHITE, king: true };
  board[2][2] = { color: CheckersRules.BLACK, king: false };
  board[1][5] = { color: CheckersRules.BLACK, king: true };

  const result = CheckersRules.applyMove(
    gameWith(board),
    {
      from: { r: 0, c: 0 },
      steps: [{ to: { r: 4, c: 4 }, capture: { r: 2, c: 2 } }],
    },
    CheckersRules.WHITE
  );

  assert.equal(result.ok, false);
}

function testFullKingCaptureIsAccepted() {
  const board = emptyBoard();
  board[0][0] = { color: CheckersRules.WHITE, king: true };
  board[2][2] = { color: CheckersRules.BLACK, king: false };
  board[1][5] = { color: CheckersRules.BLACK, king: true };

  const result = CheckersRules.applyMove(
    gameWith(board),
    {
      from: { r: 0, c: 0 },
      steps: [
        { to: { r: 3, c: 3 }, capture: { r: 2, c: 2 } },
        { to: { r: 0, c: 6 }, capture: { r: 1, c: 5 } },
      ],
    },
    CheckersRules.WHITE
  );

  assert.equal(result.ok, true);
  assert.equal(result.game.board[2][2], null);
  assert.equal(result.game.board[1][5], null);
  assert.deepEqual(result.game.board[0][6], { color: CheckersRules.WHITE, king: true });
}

testKingMustContinueLongestCapture();
testShortKingCaptureIsRejected();
testFullKingCaptureIsAccepted();

console.log("rules tests passed");
