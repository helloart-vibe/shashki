(function rulesFactory(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = { CheckersRules: factory() };
  } else {
    root.CheckersRules = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createRules() {
  const SIZE = 8;
  const WHITE = "white";
  const BLACK = "black";
  const DIRECTIONS = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  function cloneBoard(board) {
    return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
  }

  function inside(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function isPromotionRow(color, row) {
    return color === WHITE ? row === 0 : row === SIZE - 1;
  }

  function opponent(color) {
    return color === WHITE ? BLACK : WHITE;
  }

  function createGame() {
    const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if ((r + c) % 2 === 0) continue;
        if (r < 3) board[r][c] = { color: BLACK, king: false };
        if (r > 4) board[r][c] = { color: WHITE, king: false };
      }
    }

    return {
      board,
      turn: WHITE,
      status: "playing",
      winner: null,
      lastMove: null,
      message: "Белые ходят первыми",
    };
  }

  function simpleMovesForPiece(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];

    if (piece.king) {
      for (const [dr, dc] of DIRECTIONS) {
        let nr = r + dr;
        let nc = c + dc;
        while (inside(nr, nc) && !board[nr][nc]) {
          moves.push({ from: { r, c }, steps: [{ to: { r: nr, c: nc }, capture: null }] });
          nr += dr;
          nc += dc;
        }
      }
      return moves;
    }

    const forward = piece.color === WHITE ? -1 : 1;
    for (const dc of [-1, 1]) {
      const nr = r + forward;
      const nc = c + dc;
      if (inside(nr, nc) && !board[nr][nc]) {
        moves.push({
          from: { r, c },
          steps: [{ to: { r: nr, c: nc }, capture: null }],
        });
      }
    }

    return moves;
  }

  function singleCaptures(board, r, c, piece) {
    const captures = [];

    if (piece.king) {
      for (const [dr, dc] of DIRECTIONS) {
        let nr = r + dr;
        let nc = c + dc;
        let captured = null;

        while (inside(nr, nc)) {
          const seen = board[nr][nc];
          if (!seen) {
            if (captured) {
              captures.push({
                to: { r: nr, c: nc },
                capture: { r: captured.r, c: captured.c },
              });
            }
          } else if (seen.color === piece.color) {
            break;
          } else if (captured) {
            break;
          } else {
            captured = { r: nr, c: nc };
          }

          nr += dr;
          nc += dc;
        }
      }
      return captures;
    }

    for (const [dr, dc] of DIRECTIONS) {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + dr * 2;
      const lc = c + dc * 2;

      if (!inside(lr, lc) || !inside(mr, mc) || board[lr][lc]) continue;
      if (board[mr][mc] && board[mr][mc].color !== piece.color) {
        captures.push({ to: { r: lr, c: lc }, capture: { r: mr, c: mc } });
      }
    }

    return captures;
  }

  function captureSequencesForPiece(board, r, c, piece) {
    const sequences = [];
    const nextCaptures = singleCaptures(board, r, c, piece);

    for (const step of nextCaptures) {
      const nextBoard = cloneBoard(board);
      nextBoard[r][c] = null;
      nextBoard[step.capture.r][step.capture.c] = null;

      const nextPiece = { ...piece };
      if (!nextPiece.king && isPromotionRow(nextPiece.color, step.to.r)) {
        nextPiece.king = true;
      }
      nextBoard[step.to.r][step.to.c] = nextPiece;

      const tail = captureSequencesForPiece(nextBoard, step.to.r, step.to.c, nextPiece);
      if (tail.length === 0) {
        sequences.push({ from: { r, c }, steps: [step] });
      } else {
        for (const continuation of tail) {
          sequences.push({ from: { r, c }, steps: [step, ...continuation.steps] });
        }
      }
    }

    return sequences;
  }

  function getLegalMoves(game, color = game.turn) {
    if (!game || game.status !== "playing" || color !== game.turn) return [];

    const captures = [];
    const quietMoves = [];

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const piece = game.board[r][c];
        if (!piece || piece.color !== color) continue;

        captures.push(...captureSequencesForPiece(game.board, r, c, piece));
        quietMoves.push(...simpleMovesForPiece(game.board, r, c));
      }
    }

    return captures.length > 0 ? captures : quietMoves;
  }

  function samePoint(a, b) {
    return a && b && a.r === b.r && a.c === b.c;
  }

  function sameStep(a, b) {
    if (!samePoint(a.to, b.to)) return false;
    if (!a.capture && !b.capture) return true;
    return samePoint(a.capture, b.capture);
  }

  function sameMove(a, b) {
    if (!samePoint(a.from, b.from) || a.steps.length !== b.steps.length) return false;
    return a.steps.every((step, index) => sameStep(step, b.steps[index]));
  }

  function normalizeMove(move) {
    if (!move || !move.from || !Array.isArray(move.steps)) return null;
    return {
      from: { r: Number(move.from.r), c: Number(move.from.c) },
      steps: move.steps.map((step) => ({
        to: { r: Number(step.to.r), c: Number(step.to.c) },
        capture: step.capture ? { r: Number(step.capture.r), c: Number(step.capture.c) } : null,
      })),
    };
  }

  function applyMove(game, rawMove, color = game.turn) {
    if (!game || game.status !== "playing") return { ok: false, error: "Партия уже завершена" };
    if (color !== game.turn) return { ok: false, error: "Сейчас ход другого игрока" };

    const move = normalizeMove(rawMove);
    if (!move || move.steps.length === 0) return { ok: false, error: "Некорректный ход" };

    const legalMove = getLegalMoves(game, color).find((candidate) => sameMove(candidate, move));
    if (!legalMove) return { ok: false, error: "Так ходить нельзя по правилам русских шашек" };

    const nextGame = {
      ...game,
      board: cloneBoard(game.board),
      lastMove: legalMove,
    };

    let piece = nextGame.board[legalMove.from.r][legalMove.from.c];
    nextGame.board[legalMove.from.r][legalMove.from.c] = null;

    for (const step of legalMove.steps) {
      if (step.capture) nextGame.board[step.capture.r][step.capture.c] = null;
      if (!piece.king && isPromotionRow(piece.color, step.to.r)) {
        piece = { ...piece, king: true };
      }
    }

    const finalStep = legalMove.steps[legalMove.steps.length - 1];
    nextGame.board[finalStep.to.r][finalStep.to.c] = piece;
    nextGame.turn = opponent(color);

    const nextMoves = getLegalMoves(nextGame, nextGame.turn);
    const hasOpponentPieces = nextGame.board.some((row) =>
      row.some((cell) => cell && cell.color === nextGame.turn)
    );

    if (!hasOpponentPieces || nextMoves.length === 0) {
      nextGame.status = "finished";
      nextGame.winner = color;
      nextGame.message = `${color === WHITE ? "Белые" : "Черные"} победили`;
    } else {
      nextGame.message = `${nextGame.turn === WHITE ? "Белые" : "Черные"} ходят`;
    }

    return { ok: true, game: nextGame };
  }

  function legalPrefixes(moves, from, steps) {
    return moves.filter((move) => {
      if (!samePoint(move.from, from)) return false;
      if (steps.length > move.steps.length) return false;
      return steps.every((step, index) => sameStep(step, move.steps[index]));
    });
  }

  return {
    BLACK,
    WHITE,
    SIZE,
    createGame,
    getLegalMoves,
    applyMove,
    legalPrefixes,
    opponent,
  };
});
