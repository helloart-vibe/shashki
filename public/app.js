const boardEl = document.querySelector("#board");
const statusText = document.querySelector("#statusText");
const hintText = document.querySelector("#hintText");
const roomCard = document.querySelector("#roomCard");
const roomCodeEl = document.querySelector("#roomCode");
const playerColorEl = document.querySelector("#playerColor");
const playerCountEl = document.querySelector("#playerCount");
const turnText = document.querySelector("#turnText");
const createRoomButton = document.querySelector("#createRoomButton");
const joinForm = document.querySelector("#joinForm");
const roomInput = document.querySelector("#roomInput");
const copyLinkButton = document.querySelector("#copyLinkButton");
const toastEl = document.querySelector("#toast");

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
let room = null;
let player = { color: "spectator", token: null };
let selected = null;
let pendingSteps = [];
let legalMoves = [];
let pollAbort = null;
let toastTimer = null;

function storageKey(code) {
  return `russian-checkers:${code}`;
}

function saveSession(code) {
  if (!code || !player.token) return;
  localStorage.setItem(storageKey(code), JSON.stringify(player));
}

function loadSession(code) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(code)) || "null");
  } catch {
    return null;
  }
}

function colorName(color) {
  if (color === "white") return "белые";
  if (color === "black") return "черные";
  return "наблюдатель";
}

function pointKey(point) {
  return `${point.r}:${point.c}`;
}

function samePoint(a, b) {
  return a && b && a.r === b.r && a.c === b.c;
}

function sameStep(a, b) {
  if (!samePoint(a.to, b.to)) return false;
  if (!a.capture && !b.capture) return true;
  return a.capture && b.capture && samePoint(a.capture, b.capture);
}

function isRoomReady() {
  return Boolean(room?.players.white && room?.players.black);
}

function currentPrefixes() {
  if (!room || !selected) return [];
  return CheckersRules.legalPrefixes(legalMoves, selected, pendingSteps);
}

function nextTargets() {
  const targets = new Map();
  for (const move of currentPrefixes()) {
    const step = move.steps[pendingSteps.length];
    if (!step) continue;
    targets.set(pointKey(step.to), step);
  }
  return targets;
}

function isMyTurn() {
  return (
    room &&
    isRoomReady() &&
    player.color === room.game.turn &&
    room.game.status === "playing"
  );
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2600);
}

function resetSelection() {
  selected = null;
  pendingSteps = [];
}

function boardPointsForPlayer() {
  const rows = [...Array(8).keys()];
  const cols = [...Array(8).keys()];

  if (player.color === "black") {
    rows.reverse();
    cols.reverse();
  }

  return { rows, cols };
}

function renderBoard() {
  boardEl.innerHTML = "";
  const board = room?.game.board || CheckersRules.createGame().board;
  const targets = nextTargets();
  const selectable = new Set();
  const { rows, cols } = boardPointsForPlayer();

  if (isMyTurn()) {
    for (const move of legalMoves) selectable.add(pointKey(move.from));
  }

  for (const r of rows) {
    for (const c of cols) {
      const cell = document.createElement("button");
      const dark = (r + c) % 2 === 1;
      const point = { r, c };
      const key = pointKey(point);
      cell.type = "button";
      cell.className = `cell${dark ? " dark" : ""}`;
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);

      if (dark) {
        cell.classList.add("coord");
        cell.dataset.coord = `${files[c]}${8 - r}`;
      }

      if (selected && samePoint(selected, point)) cell.classList.add("selected");

      const piece = board[r][c];
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${piece.color}${piece.king ? " king" : ""}`;
        cell.append(pieceEl);
      }

      const waitingOwnPiece =
        room && !isRoomReady() && piece && piece.color === player.color && room.game.status === "playing";

      if (waitingOwnPiece) cell.classList.add("waiting-piece");
      cell.disabled = !room || (!waitingOwnPiece && !selectable.has(key) && !targets.has(key));
      cell.addEventListener("click", () => handleCellClick(point));
      boardEl.append(cell);
    }
  }
}

function renderStatus() {
  if (!room) {
    statusText.textContent = "Создайте комнату или подключитесь по коду.";
    playerColorEl.textContent = "не подключены";
    playerCountEl.textContent = "0/2";
    turnText.textContent = "-";
    roomCard.hidden = true;
    return;
  }

  roomCard.hidden = false;
  roomCodeEl.textContent = room.code;
  playerColorEl.textContent = colorName(player.color);
  playerCountEl.textContent = `${Number(room.players.white) + Number(room.players.black)}/2`;
  turnText.textContent = room.game.turn === "white" ? "белые" : "черные";

  if (room.game.status === "finished") {
    statusText.textContent = room.game.message;
  } else if (!room.players.white || !room.players.black) {
    statusText.textContent = `Вы играете за ${colorName(player.color)}. Отправьте ссылку второму игроку.`;
  } else if (isMyTurn()) {
    statusText.textContent = "Ваш ход.";
  } else if (player.color === "spectator") {
    statusText.textContent = "Вы смотрите партию.";
  } else {
    statusText.textContent = "Ждем ход соперника.";
  }

  const hasCapture = legalMoves.some((move) => move.steps.some((step) => step.capture));
  if (hasCapture && isMyTurn()) {
    hintText.textContent = "Есть обязательное взятие. Выберите подсвеченную шашку и доведите серию до конца.";
  } else if (selected && pendingSteps.length > 0) {
    hintText.textContent = "Продолжайте серию взятий этой же шашкой.";
  } else {
    hintText.textContent = "Дамка ходит и бьет по всей диагонали. Простая шашка бьет назад и вперед.";
  }
}

function render() {
  legalMoves = isMyTurn() ? CheckersRules.getLegalMoves(room.game, player.color) : [];
  if (!isMyTurn()) resetSelection();
  renderStatus();
  renderBoard();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Ошибка запроса");
  return payload;
}

async function createRoom() {
  const payload = await api("/api/rooms", { method: "POST", body: "{}" });
  room = payload.room;
  player = payload.player;
  saveSession(room.code);
  history.replaceState(null, "", `/?room=${room.code}`);
  resetSelection();
  render();
  startPolling();
}

async function joinRoom(code) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  const saved = loadSession(normalized);
  const payload = await api(`/api/rooms/${normalized}/join`, {
    method: "POST",
    body: JSON.stringify({ token: saved?.token || null }),
  });
  room = payload.room;
  player = payload.player;
  saveSession(room.code);
  history.replaceState(null, "", `/?room=${room.code}`);
  resetSelection();
  render();
  startPolling();
}

async function submitMove(move) {
  if (!room || !isMyTurn()) return;
  const payload = await api(`/api/rooms/${room.code}/move`, {
    method: "POST",
    body: JSON.stringify({ token: player.token, color: player.color, move }),
  });
  room = payload.room;
  resetSelection();
  render();
}

function handleCellClick(point) {
  if (room && !isRoomReady()) {
    const piece = room.game.board[point.r][point.c];
    if (piece && piece.color === player.color) {
      showToast("Первый ход нельзя сделать, пока не подключился второй игрок.");
    }
    return;
  }

  if (!isMyTurn()) return;
  const key = pointKey(point);
  const targets = nextTargets();

  if (targets.has(key) && selected) {
    const step = targets.get(key);
    const nextSteps = [...pendingSteps, step];
    const matching = CheckersRules.legalPrefixes(legalMoves, selected, nextSteps);
    const completed = matching.find((move) => move.steps.length === nextSteps.length);
    const canContinue = matching.some((move) => move.steps.length > nextSteps.length);

    if (completed && !canContinue) {
      submitMove({ from: selected, steps: nextSteps }).catch(showError);
      return;
    }

    pendingSteps = nextSteps;
    render();
    return;
  }

  const starts = legalMoves.filter((move) => samePoint(move.from, point));
  if (starts.length > 0) {
    selected = point;
    pendingSteps = [];
    render();
  }
}

function showError(error) {
  statusText.textContent = error.message;
}

function startPolling() {
  if (!room) return;
  if (pollAbort) pollAbort.abort();
  pollAbort = new AbortController();

  async function poll() {
    while (room && !pollAbort.signal.aborted) {
      try {
        const payload = await api(`/api/rooms/${room.code}?since=${room.version}`, {
          signal: pollAbort.signal,
        });
        if (payload.room.version !== room.version) {
          room = payload.room;
          render();
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          statusText.textContent = "Связь прервалась. Переподключаемся...";
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  }

  poll();
}

createRoomButton.addEventListener("click", () => {
  createRoom().catch(showError);
});

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  joinRoom(roomInput.value).catch(showError);
});

copyLinkButton.addEventListener("click", async () => {
  if (!room) return;
  const url = `${location.origin}/?room=${room.code}`;
  try {
    await navigator.clipboard.writeText(url);
    statusText.textContent = "Ссылка скопирована.";
  } catch {
    statusText.textContent = url;
  }
});

const initialRoom = new URLSearchParams(location.search).get("room");
if (initialRoom) {
  roomInput.value = initialRoom.toUpperCase();
  joinRoom(initialRoom).catch(showError);
} else {
  render();
}
