const boardEl = document.querySelector("#board");
const titleText = document.querySelector("#titleText");
const statusText = document.querySelector("#statusText");
const roomCard = document.querySelector("#roomCard");
const roomCodeEl = document.querySelector("#roomCode");
const playerStrip = document.querySelector("#playerStrip");
const playerColorEl = document.querySelector("#playerColor");
const playerCountEl = document.querySelector("#playerCount");
const turnText = document.querySelector("#turnText");
const lobbyActions = document.querySelector("#lobbyActions");
const gameActions = document.querySelector("#gameActions");
const createRoomButton = document.querySelector("#createRoomButton");
const surrenderButton = document.querySelector("#surrenderButton");
const leaveRoomButton = document.querySelector("#leaveRoomButton");
const drawButton = document.querySelector("#drawButton");
const shakeButton = document.querySelector("#shakeButton");
const rematchButton = document.querySelector("#rematchButton");
const joinForm = document.querySelector("#joinForm");
const nameInput = document.querySelector("#nameInput");
const roomInput = document.querySelector("#roomInput");
const styleButtons = [...document.querySelectorAll(".style-swatch")];
const soundToggle = document.querySelector("#soundToggle");
const uiThemeToggle = document.querySelector("#uiThemeToggle");
const copyLinkButton = document.querySelector("#copyLinkButton");
const scoreCard = document.querySelector("#scoreCard");
const whiteNameEl = document.querySelector("#whiteName");
const blackNameEl = document.querySelector("#blackName");
const scoreTextEl = document.querySelector("#scoreText");
const selfCard = document.querySelector("#selfCard");
const selfNameEl = document.querySelector("#selfName");
const selfScoreEl = document.querySelector("#selfScore");
const selfColorEl = document.querySelector("#selfColor");
const thinkingText = document.querySelector("#thinkingText");
const selfCapturedPiecesEl = document.querySelector("#selfCapturedPieces");
const opponentThinkingText = document.querySelector("#opponentThinkingText");
const opponentCard = document.querySelector("#opponentCard");
const opponentNameEl = document.querySelector("#opponentName");
const opponentScoreEl = document.querySelector("#opponentScore");
const opponentColorEl = document.querySelector("#opponentColor");
const opponentCapturedPiecesEl = document.querySelector("#opponentCapturedPieces");
const toastEl = document.querySelector("#toast");
const toastMessageEl = document.querySelector("#toastMessage");
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalTitle = document.querySelector("#modalTitle");
const modalText = document.querySelector("#modalText");
const modalNameInput = document.querySelector("#modalNameInput");
const modalActions = document.querySelector("#modalActions");

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const themeKey = "russian-checkers:theme";
const uiThemeKey = "russian-checkers:ui-theme";
const soundKey = "russian-checkers:sound";
const themes = new Set(["midnight", "sand", "sky", "lime", "walnut"]);
const uiThemes = new Set(["light", "dark"]);
const soundStates = new Set(["on", "off"]);
const moveSound = new Audio("/move.mp3");
const captureSound = new Audio("/capture.mp3");
const promotionSound = new Audio("/promotion.mp3");
const soundToggleEffect = new Audio("/sound-toggle.mp3");
const themeToggleEffect = new Audio("/theme-toggle.mp3");
const roomEnterSound = new Audio("/room-enter.mp3");
const secondPlayerOnlineSound = new Audio("/second-player-online.mp3");
const shakeSound = new Audio("/shake.mp3");
const hoverSound = new Audio("/hover.mp3");
moveSound.preload = "auto";
captureSound.preload = "auto";
promotionSound.preload = "auto";
soundToggleEffect.preload = "auto";
themeToggleEffect.preload = "auto";
roomEnterSound.preload = "auto";
secondPlayerOnlineSound.preload = "auto";
shakeSound.preload = "auto";
hoverSound.preload = "auto";
let room = null;
let player = { color: "spectator", token: null };
let selected = null;
let pendingSteps = [];
let legalMoves = [];
let pollTimer = null;
let toastTimer = null;
let showForcedCaptures = false;
let activeModalKey = null;
let lastMoveSoundKey = "";
let lastMoveSoundAt = 0;
let lastHoverSoundAt = 0;
let moveRequestPending = false;
let lastShakeId = "";
let playedMoveSoundKeys = new Set();
let boardMoveAnimation = null;
let capturedPiecesSnapshot = null;
let capturedPiecesRoomCode = "";
let lastConnectedRoomCode = "";
let lastConnectedPlayers = null;
const dismissedModalKeys = new Set();

function normalizeTheme(theme) {
  return themes.has(theme) ? theme : "midnight";
}

function applyTheme(theme) {
  const nextTheme = normalizeTheme(theme);
  document.body.dataset.theme = nextTheme;

  for (const button of styleButtons) {
    button.classList.toggle("is-selected", button.dataset.theme === nextTheme);
  }
}

function selectedTheme() {
  return normalizeTheme(document.body.dataset.theme);
}

function normalizeUiTheme(theme) {
  return uiThemes.has(theme) ? theme : "light";
}

function applyUiTheme(theme) {
  const nextTheme = normalizeUiTheme(theme);
  document.body.dataset.uiTheme = nextTheme;
  uiThemeToggle.setAttribute(
    "aria-label",
    nextTheme === "dark" ? "Включить светлую тему" : "Включить темную тему",
  );
}

function toggleUiTheme() {
  const nextTheme = document.body.dataset.uiTheme === "dark" ? "light" : "dark";
  if (document.body.dataset.sound !== "off") {
    themeToggleEffect.currentTime = 0;
    themeToggleEffect.play().catch(() => {});
  }
  localStorage.setItem(uiThemeKey, nextTheme);
  applyUiTheme(nextTheme);
}

function normalizeSoundState(value) {
  return soundStates.has(value) ? value : "on";
}

function applySoundState(value) {
  const nextState = normalizeSoundState(value);
  document.body.dataset.sound = nextState;
  soundToggle.setAttribute("aria-label", nextState === "on" ? "Выключить звук" : "Включить звук");
  moveSound.muted = nextState === "off";
  captureSound.muted = nextState === "off";
  promotionSound.muted = nextState === "off";
  shakeSound.muted = nextState === "off";
  hoverSound.muted = nextState === "off";
}

function toggleSound() {
  const nextState = document.body.dataset.sound === "off" ? "on" : "off";
  soundToggleEffect.currentTime = 0;
  soundToggleEffect.play().catch(() => {});
  localStorage.setItem(soundKey, nextState);
  applySoundState(nextState);
}

function playRoomEnterSound() {
  if (document.body.dataset.sound === "off") return;
  roomEnterSound.currentTime = 0;
  roomEnterSound.play().catch(() => {});
}

function playSecondPlayerOnlineSound() {
  if (document.body.dataset.sound === "off") return;
  secondPlayerOnlineSound.currentTime = 0;
  secondPlayerOnlineSound.play().catch(() => {});
}

function maybePlaySecondPlayerOnline(connectedPlayers) {
  if (!room) return;
  const isSameRoom = lastConnectedRoomCode === room.code;
  const previousCount = isSameRoom ? lastConnectedPlayers : null;

  if (previousCount === 1 && connectedPlayers === 2) playSecondPlayerOnlineSound();

  lastConnectedRoomCode = room.code;
  lastConnectedPlayers = connectedPlayers;
}

function shakeBoard() {
  boardEl.classList.remove("is-shaking");
  void boardEl.offsetWidth;
  boardEl.classList.add("is-shaking");
  boardEl.addEventListener("animationend", () => boardEl.classList.remove("is-shaking"), { once: true });
}

function playShakeSound() {
  if (document.body.dataset.sound === "off") return;
  shakeSound.currentTime = 0;
  shakeSound.play().catch(() => {});
}

function playHoverSound() {
  if (document.body.dataset.sound === "off") return;
  const now = Date.now();
  if (now - lastHoverSoundAt < 90) return;
  lastHoverSoundAt = now;
  hoverSound.currentTime = 0;
  hoverSound.play().catch(() => {});
}

function maybePlayRemoteShake(nextRoom) {
  const shake = nextRoom?.shake;
  if (!shake?.id || shake.id === lastShakeId) return;

  lastShakeId = shake.id;
  if (shake.from !== player.color) shakeBoard();
}

function rememberShake(nextRoom = room) {
  lastShakeId = nextRoom?.shake?.id || "";
}

function moveSoundKey(nextRoom = room) {
  if (!nextRoom?.game?.lastMove) return "";
  return `${nextRoom.code}:${JSON.stringify(nextRoom.game.lastMove)}`;
}

function rememberMoveSound(nextRoom = room) {
  const nextKey = moveSoundKey(nextRoom);
  lastMoveSoundKey = nextKey;
  playedMoveSoundKeys = nextKey ? new Set([nextKey]) : new Set();
}

function didMovePromote(previousRoom, nextRoom) {
  const move = nextRoom?.game?.lastMove;
  if (!previousRoom?.game?.board || !nextRoom?.game?.board || !move?.steps?.length) return false;

  const fromPiece = previousRoom.game.board[move.from.r]?.[move.from.c];
  const finalStep = move.steps[move.steps.length - 1];
  const toPiece = nextRoom.game.board[finalStep.to.r]?.[finalStep.to.c];
  return Boolean(fromPiece && !fromPiece.king && toPiece?.king);
}

function didMoveCapture(nextRoom) {
  return Boolean(nextRoom?.game?.lastMove?.steps?.some((step) => step.capture));
}

function playGameSound(previousRoom, nextRoom = room) {
  if (document.body.dataset.sound === "off") return;
  const nextKey = moveSoundKey(nextRoom);
  if (!nextKey || nextKey === lastMoveSoundKey || playedMoveSoundKeys.has(nextKey)) return;

  lastMoveSoundKey = nextKey;
  playedMoveSoundKeys.add(nextKey);
  const now = Date.now();
  if (now - lastMoveSoundAt < 180) return;

  lastMoveSoundAt = now;
  const sound = didMovePromote(previousRoom, nextRoom)
    ? promotionSound
    : didMoveCapture(nextRoom)
      ? captureSound
      : moveSound;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function displayPoint(point) {
  if (player.color === "black") return { r: 7 - point.r, c: 7 - point.c };
  return point;
}

function queueMoveAnimation(previousRoom, nextRoom = room) {
  const move = nextRoom?.game?.lastMove;
  const nextKey = moveSoundKey(nextRoom);
  if (!previousRoom?.game?.board || !nextRoom?.game?.board || !move?.steps?.length || !nextKey) {
    boardMoveAnimation = null;
    return;
  }

  const finalStep = move.steps[move.steps.length - 1];
  const fromPiece = previousRoom.game.board[move.from.r]?.[move.from.c];
  const toPiece = nextRoom.game.board[finalStep.to.r]?.[finalStep.to.c];
  if (!fromPiece || !toPiece) {
    boardMoveAnimation = null;
    return;
  }

  const from = displayPoint(move.from);
  const to = displayPoint(finalStep.to);
  boardMoveAnimation = {
    key: nextKey,
    to: pointKey(finalStep.to),
    dx: from.c - to.c,
    dy: from.r - to.r,
  };
}

function capturedPiecesByColor() {
  const remaining = { white: 0, black: 0 };
  const board = room?.game?.board || [];

  for (const row of board) {
    for (const piece of row) {
      if (piece?.color) remaining[piece.color] += 1;
    }
  }

  return {
    white: Math.max(0, 12 - remaining.black),
    black: Math.max(0, 12 - remaining.white),
  };
}

function renderCapturedPieces(container, ownerColor, capturedByColor) {
  const count = capturedByColor[ownerColor] || 0;
  const previousCount = capturedPiecesSnapshot?.[ownerColor] ?? count;
  const capturedColor = CheckersRules.opponent(ownerColor);
  container.hidden = count === 0 || player.color === "spectator";
  container.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = `captured-piece ${capturedColor}`;
    if (index >= previousCount) piece.classList.add("is-new");
    container.append(piece);
  }
}

function renderCapturedPiecesRows() {
  if (!room || player.color === "spectator") {
    selfCapturedPiecesEl.hidden = true;
    opponentCapturedPiecesEl.hidden = true;
    selfCapturedPiecesEl.innerHTML = "";
    opponentCapturedPiecesEl.innerHTML = "";
    capturedPiecesSnapshot = null;
    capturedPiecesRoomCode = "";
    return;
  }

  const capturedByColor = capturedPiecesByColor();
  if (capturedPiecesRoomCode !== room.code) {
    capturedPiecesSnapshot = { ...capturedByColor };
    capturedPiecesRoomCode = room.code;
  }

  const opponent = CheckersRules.opponent(player.color);
  renderCapturedPieces(selfCapturedPiecesEl, player.color, capturedByColor);
  renderCapturedPieces(opponentCapturedPiecesEl, opponent, capturedByColor);
  capturedPiecesSnapshot = { ...capturedByColor };
}

function storageKey(code) {
  return `russian-checkers:${code}`;
}

function saveSession(code) {
  if (!code || !player.token) return;
  localStorage.setItem(storageKey(code), JSON.stringify(player));
}

function clearSession(code) {
  if (!code) return;
  localStorage.removeItem(storageKey(code));
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

function colorLabel(color) {
  if (color === "white") return "БЕЛЫЕ";
  if (color === "black") return "ЧЕРНЫЕ";
  return "НАБЛЮДАТЕЛЬ";
}

function displayPlayerName(color) {
  return room?.playerNames?.[color] || (color === "white" ? "Белые" : "Черные");
}

function getPlayerName() {
  const name = nameInput.value.trim().replace(/\s+/g, " ").slice(0, 24);
  if (!name) {
    showToast("Введите имя.");
    statusText.textContent = "Введите имя, чтобы создать комнату или войти.";
    nameInput.focus();
    return null;
  }
  nameInput.value = name;
  localStorage.setItem("russian-checkers:name", name);
  return name;
}

function setRoomStatus() {
  statusText.innerHTML = `комната <button class="room-code-inline" type="button">${room.code}</button>`;
}

async function copyRoomLink() {
  if (!room) return;
  const url = `${location.origin}/?room=${room.code}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast("Ссылка на комнату скопирована.");
  } catch {
    statusText.textContent = url;
  }
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

function hasForcedCapture() {
  return legalMoves.some((move) => move.steps.some((step) => step.capture));
}

function forcedCaptureTargets() {
  const targets = new Map();
  if (!hasForcedCapture()) return targets;

  for (const move of legalMoves) {
    const step = move.steps[0];
    if (step?.capture) targets.set(pointKey(step.to), step);
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
  toastMessageEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2600);
}

function closeModal(dismissCurrent = false) {
  if (dismissCurrent && activeModalKey) dismissedModalKeys.add(activeModalKey);
  modalBackdrop.hidden = true;
  modalBackdrop.classList.remove("result-backdrop");
  modalBackdrop.classList.remove("soft-backdrop");
  modalBackdrop.classList.remove("name-backdrop");
  modalNameInput.hidden = true;
  modalActions.innerHTML = "";
}

function showModal(key, title, text, actions) {
  if (dismissedModalKeys.has(key)) return;
  if (activeModalKey === key && !modalBackdrop.hidden) return;
  activeModalKey = key;
  const isResultModal = key.startsWith("loss:") || key.startsWith("win:");
  const isSoftModal = key.startsWith("draw:") || key.startsWith("resign:") || key.startsWith("rematch:");
  modalBackdrop.classList.toggle("result-backdrop", isResultModal);
  modalBackdrop.classList.toggle("soft-backdrop", isSoftModal);
  modalBackdrop.classList.remove("name-backdrop");
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalNameInput.hidden = true;
  modalActions.innerHTML = "";

  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    if (action.className) button.className = action.className;
    button.addEventListener("click", action.onClick);
    modalActions.append(button);
  }

  modalBackdrop.hidden = false;
}

function showNameJoinModal(code) {
  activeModalKey = `name:${code}`;
  modalBackdrop.classList.remove("result-backdrop");
  modalBackdrop.classList.remove("soft-backdrop");
  modalBackdrop.classList.add("name-backdrop");
  modalTitle.textContent = "Введите имя";
  modalText.textContent = `Комната ${code}`;
  modalNameInput.hidden = false;
  modalNameInput.value = nameInput.value.trim();
  modalActions.innerHTML = "";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary";
  button.textContent = "Войти";
  button.addEventListener("click", () => {
    const name = modalNameInput.value.trim();
    if (!name) {
      modalText.textContent = "Введите имя, чтобы войти в комнату.";
      modalNameInput.focus();
      return;
    }

    nameInput.value = name;
    closeModal(true);
    joinRoom(code).catch(showError);
  });
  modalActions.append(button);
  modalBackdrop.hidden = false;
  window.setTimeout(() => modalNameInput.focus(), 0);
}

function resultActions() {
  return [
    {
      label: "Го еще",
      className: "primary",
      onClick: () => {
        closeModal(true);
        offerRematch().catch(showError);
      },
    },
    {
      label: "Пока хватит",
      className: "secondary",
      onClick: () => {
        closeModal(true);
        leaveRoom().catch(showError);
      },
    },
  ];
}

function resetSelection() {
  selected = null;
  pendingSteps = [];
  showForcedCaptures = false;
}

function selectedDisplayPoint() {
  if (pendingSteps.length > 0) {
    return pendingSteps[pendingSteps.length - 1].to;
  }
  return selected;
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
  const forcedTargets = forcedCaptureTargets();
  const forcedCaptureActive = hasForcedCapture();
  const selectable = new Set();
  const { rows, cols } = boardPointsForPlayer();
  const displaySelected = selectedDisplayPoint();

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

      if (displaySelected && samePoint(displaySelected, point)) cell.classList.add("selected");
      if ((pendingSteps.length > 0 && targets.has(key)) || (showForcedCaptures && forcedTargets.has(key))) {
        cell.classList.add("capture-target");
      }

      const piece = board[r][c];
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${piece.color}${piece.king ? " king" : ""}`;
        if (boardMoveAnimation?.to === key) {
          pieceEl.classList.add("is-arriving");
          pieceEl.style.setProperty("--move-dx", String(boardMoveAnimation.dx));
          pieceEl.style.setProperty("--move-dy", String(boardMoveAnimation.dy));
        }
        cell.append(pieceEl);
      }

      const waitingOwnPiece =
        room && !isRoomReady() && piece && piece.color === player.color && room.game.status === "playing";
      const ownPieceDuringForcedCapture = isMyTurn() && forcedCaptureActive && piece?.color === player.color;

      if (waitingOwnPiece) cell.classList.add("waiting-piece");
      cell.disabled =
        !room ||
        (!waitingOwnPiece &&
          !ownPieceDuringForcedCapture &&
          !selectable.has(key) &&
          !targets.has(key) &&
          !(showForcedCaptures && forcedTargets.has(key)));
      cell.addEventListener("click", () => handleCellClick(point));
      boardEl.append(cell);
    }
  }

  boardMoveAnimation = null;
}

function renderStatus() {
  if (!room) {
    applyTheme(localStorage.getItem(themeKey));
    document.body.dataset.screen = "lobby";
    titleText.textContent = "Создайте комнату";
    statusText.textContent = "или подключитесь по коду.";
    playerColorEl.textContent = "не подключены";
    playerCountEl.textContent = "0/2";
    playerStrip.classList.remove("is-online", "is-waiting");
    turnText.textContent = "-";
    lobbyActions.hidden = false;
    gameActions.hidden = true;
    leaveRoomButton.hidden = true;
    playerStrip.hidden = true;
    roomCard.hidden = true;
    scoreCard.hidden = true;
    selfCard.hidden = true;
    thinkingText.hidden = true;
    selfCapturedPiecesEl.hidden = true;
    selfCapturedPiecesEl.innerHTML = "";
    opponentThinkingText.hidden = true;
    opponentCapturedPiecesEl.hidden = true;
    opponentCapturedPiecesEl.innerHTML = "";
    opponentCard.hidden = true;
    capturedPiecesSnapshot = null;
    capturedPiecesRoomCode = "";
    lastConnectedRoomCode = "";
    lastConnectedPlayers = null;
    closeModal();
    return;
  }

  applyTheme(room.theme);
  document.body.dataset.screen = "game";
  titleText.textContent = "Идёт игра";
  lobbyActions.hidden = true;
  gameActions.hidden = false;
  leaveRoomButton.hidden = false;
  playerStrip.hidden = false;
  surrenderButton.hidden = !(isRoomReady() && player.color !== "spectator" && room.game.status === "playing");
  drawButton.hidden = !(isRoomReady() && player.color !== "spectator" && room.game.status === "playing");
  rematchButton.hidden = !(
    isRoomReady() &&
    player.color !== "spectator" &&
    room.game.status === "finished" &&
    room.game.winner
  );
  rematchButton.disabled = room.rematchOffer?.from === player.color;
  rematchButton.textContent = rematchButton.disabled ? "Ждём ответ" : "Реванш";
  roomCard.hidden = false;
  scoreCard.hidden = true;
  selfCard.hidden = player.color === "spectator";
  opponentCard.hidden = player.color === "spectator";
  renderCapturedPiecesRows();
  roomCodeEl.textContent = room.code;
  playerColorEl.textContent = colorName(player.color);
  const connectedPlayers = Number(room.players.white) + Number(room.players.black);
  maybePlaySecondPlayerOnline(connectedPlayers);
  playerCountEl.textContent = `${connectedPlayers}/2`;
  playerStrip.classList.toggle("is-online", connectedPlayers === 2);
  playerStrip.classList.toggle("is-waiting", connectedPlayers < 2);
  turnText.textContent = room.game.turn === "white" ? "белые" : "черные";
  whiteNameEl.textContent = displayPlayerName("white");
  blackNameEl.textContent = displayPlayerName("black");
  scoreTextEl.textContent = `${room.score?.white ?? 0}/${room.score?.black ?? 0}`;

  if (player.color !== "spectator") {
    const opponent = CheckersRules.opponent(player.color);
    const selfName = `${player.name || displayPlayerName(player.color)} (вы)`;
    const opponentName = displayPlayerName(opponent);
    selfNameEl.textContent = selfName;
    selfNameEl.title = selfName;
    selfScoreEl.textContent = String(room.score?.[player.color] ?? 0);
    selfColorEl.textContent = colorLabel(player.color);
    opponentNameEl.textContent = opponentName;
    opponentNameEl.title = opponentName;
    opponentScoreEl.textContent = String(room.score?.[opponent] ?? 0);
    opponentColorEl.textContent = colorLabel(opponent);
  }

  if (room.game.status === "finished") {
    statusText.textContent = room.game.message;
    thinkingText.hidden = true;
    opponentThinkingText.hidden = true;
  } else if (!room.players.white || !room.players.black) {
    setRoomStatus();
    thinkingText.hidden = false;
    thinkingText.textContent = "ждём второго игрока...";
    opponentThinkingText.hidden = true;
  } else if (isMyTurn()) {
    setRoomStatus();
    thinkingText.hidden = false;
    thinkingText.textContent = "ваш ход";
    opponentThinkingText.hidden = true;
  } else if (player.color === "spectator") {
    statusText.textContent = "Вы смотрите партию.";
    thinkingText.hidden = true;
    opponentThinkingText.hidden = true;
  } else {
    setRoomStatus();
    thinkingText.hidden = true;
    opponentThinkingText.hidden = false;
    opponentThinkingText.textContent = "думает, как сходить";
  }

  maybeShowRoomModal();
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
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Сервер вернул не JSON для ${path}. Проверьте, что открыт backend-деплой.`);
  }
  if (!response.ok) throw new Error(payload.error || "Ошибка запроса");
  return payload;
}

function applyPlayerUpdate(nextPlayer) {
  if (!nextPlayer || !nextPlayer.token) return;
  player = { ...player, ...nextPlayer };
  if (room) saveSession(room.code);
}

async function createRoom() {
  const name = getPlayerName();
  if (!name) return;

  const payload = await api("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ name, theme: selectedTheme() }),
  });
  room = payload.room;
  player = payload.player;
  applyPlayerUpdate(payload.player);
  rememberMoveSound(room);
  rememberShake(room);
  saveSession(room.code);
  history.replaceState(null, "", `/?room=${room.code}`);
  resetSelection();
  render();
  playRoomEnterSound();
  startPolling();
}

async function joinRoom(code) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  const saved = loadSession(normalized);
  if (saved?.name && !nameInput.value.trim()) nameInput.value = saved.name;
  const name = saved?.token && !nameInput.value.trim() ? saved.name : getPlayerName();
  if (!name) return;

  const payload = await api(`/api/rooms/${normalized}/join`, {
    method: "POST",
    body: JSON.stringify({ token: saved?.token || null, name }),
  });
  room = payload.room;
  player = payload.player;
  applyPlayerUpdate(payload.player);
  rememberMoveSound(room);
  rememberShake(room);
  saveSession(room.code);
  history.replaceState(null, "", `/?room=${room.code}`);
  resetSelection();
  render();
  playRoomEnterSound();
  startPolling();
}

async function offerDraw() {
  if (!room || !player.token) return;
  const payload = await api(`/api/rooms/${room.code}/draw-offer`, {
    method: "POST",
    body: JSON.stringify({ token: player.token }),
  });
  room = payload.room;
  showToast("Предложение ничьей отправлено.");
  render();
}

async function resignRoom() {
  if (!room || !player.token) return;
  const payload = await api(`/api/rooms/${room.code}/resign`, {
    method: "POST",
    body: JSON.stringify({ token: player.token }),
  });
  room = payload.room;
  rememberMoveSound(room);
  resetSelection();
  showToast("Вы сдались. Началась новая партия.");
  render();
}

async function respondDraw(accept) {
  if (!room || !player.token) return;
  const payload = await api(`/api/rooms/${room.code}/draw-respond`, {
    method: "POST",
    body: JSON.stringify({ token: player.token, accept }),
  });
  room = payload.room;
  if (accept) {
    rememberMoveSound(room);
    resetSelection();
  }
  closeModal();
  showToast(accept ? "Ничья принята. Новая партия началась." : "Ничья отклонена.");
  render();
}

async function offerRematch() {
  if (!room || !player.token) return;
  const payload = await api(`/api/rooms/${room.code}/rematch-offer`, {
    method: "POST",
    body: JSON.stringify({ token: player.token }),
  });
  room = payload.room;
  showToast("Предложение реванша отправлено.");
  render();
}

async function sendBoardShake() {
  shakeBoard();
  playShakeSound();
  if (!room || !player.token) return;

  try {
    const payload = await api(`/api/rooms/${room.code}/shake`, {
      method: "POST",
      body: JSON.stringify({ token: player.token }),
    });
    room = payload.room;
    if (room.shake?.id) lastShakeId = room.shake.id;
  } catch {
    // Тряска — игрушечное действие, поэтому не мешаем партии ошибкой сети.
  }
}

async function respondRematch(accept) {
  if (!room || !player.token) return;
  const payload = await api(`/api/rooms/${room.code}/rematch-respond`, {
    method: "POST",
    body: JSON.stringify({ token: player.token, accept }),
  });
  room = payload.room;
  applyPlayerUpdate(payload.player);
  rememberMoveSound(room);
  resetSelection();
  closeModal(true);
  showToast(accept ? "Реванш начался." : "Реванш отклонён.");
  render();
}

async function submitMove(move) {
  if (!room || !isMyTurn() || moveRequestPending) return;
  moveRequestPending = true;

  try {
    const previousRoom = room;
    const payload = await api(`/api/rooms/${room.code}/move`, {
      method: "POST",
      body: JSON.stringify({ token: player.token, color: player.color, move }),
    });
    room = payload.room;
    queueMoveAnimation(previousRoom, room);
    playGameSound(previousRoom, room);
    resetSelection();
    render();
  } finally {
    moveRequestPending = false;
  }
}

async function leaveRoom(resign = false) {
  const currentRoom = room;
  const currentPlayer = player;

  if (currentRoom && currentPlayer.token) {
    try {
      await api(`/api/rooms/${currentRoom.code}/leave`, {
        method: "POST",
        body: JSON.stringify({ token: currentPlayer.token, resign }),
      });
    } catch (error) {
      showToast("Не удалось сообщить серверу о выходе, но вы вернулись в меню.");
    }
    clearSession(currentRoom.code);
  }

  clearTimeout(pollTimer);
  room = null;
  player = { color: "spectator", token: null };
  resetSelection();
  history.replaceState(null, "", "/");
  roomInput.value = "";
  render();
}

function maybeShowRoomModal() {
  if (!room || player.color === "spectator") return;

  if (
    room.resultNotice?.type === "resign" &&
    room.resultNotice.loser &&
    room.resultNotice.loser !== player.color
  ) {
    showModal(
      `notice:${room.code}:${room.resultNotice.id}`,
      "Ваш соперник сдался",
      "Очко записано в ваш счёт. Новая партия уже началась.",
      [
        {
          label: "Понятно",
          className: "primary",
          onClick: () => closeModal(true),
        },
      ],
    );
    return;
  }

  if (room.rematchOffer && room.rematchOffer.from !== player.color && room.game.status === "finished") {
    showModal(
      `rematch:${room.code}:${room.rematchOffer.from}:${room.version}`,
      "Реванш?",
      `${room.rematchOffer.name} предлагает сыграть ещё раз.`,
      [
        {
          label: "Согласиться",
          className: "primary",
          onClick: () => respondRematch(true).catch(showError),
        },
        {
          label: "Отказаться",
          className: "secondary",
          onClick: () => respondRematch(false).catch(showError),
        },
      ],
    );
    return;
  }

  if (
    room.game.status === "finished" &&
    room.game.resignedBy &&
    room.game.resignedBy !== player.color
  ) {
    showModal(
      `resign:${room.code}:${room.game.resignedBy}:${room.version}`,
      "Ваш соперник сдался",
      "Партия завершена, очко записано в ваш счёт.",
      [
        {
          label: "Понятно",
          className: "primary",
          onClick: () => closeModal(true),
        },
      ],
    );
    return;
  }

  if (room.game.status === "finished" && room.game.winner === player.color) {
    showModal(
      `win:${room.code}:${room.game.winner}:${room.version}`,
      "Опа,\nты выиграл!",
      "",
      resultActions(),
    );
    return;
  }

  if (room.game.status === "finished" && room.game.winner && room.game.winner !== player.color) {
    showModal(
      `loss:${room.code}:${room.game.winner}:${room.version}`,
      "Ту-ту-туу...\nТы проиграл",
      "",
      resultActions(),
    );
    return;
  }

  if (room.drawOffer && room.drawOffer.from !== player.color && room.game.status === "playing") {
    showModal(
      `draw:${room.code}:${room.drawOffer.from}:${room.version}`,
      "Предложение ничьей",
      `${room.drawOffer.name} предлагает закончить партию ничьей.`,
      [
        {
          label: "Согласиться",
          className: "primary",
          onClick: () => respondDraw(true).catch(showError),
        },
        {
          label: "Отказаться",
          className: "secondary",
          onClick: () => respondDraw(false).catch(showError),
        },
      ],
    );
    return;
  }
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
  const hasCapture = hasForcedCapture();
  const clickedPiece = room.game.board[point.r][point.c];

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
    showForcedCaptures = false;
    showToast("Продолжайте взятие этой же шашкой.");
    render();
    return;
  }

  if (hasCapture && !selected && !clickedPiece) {
    showForcedCaptures = true;
    showToast("Сначала выберите шашку, которая должна рубить.");
    render();
    return;
  }

  if (selected && room.game.board[point.r][point.c]?.color === CheckersRules.opponent(player.color)) {
    showToast("Для взятия нажмите на пустую клетку за шашкой соперника.");
    return;
  }

  const starts = legalMoves.filter((move) => samePoint(move.from, point));
  if (starts.length > 0) {
    selected = point;
    pendingSteps = [];
    showForcedCaptures = false;
    render();
  } else if (hasCapture && clickedPiece?.color === player.color) {
    showForcedCaptures = true;
    showToast("Сейчас обязательно нужно рубить. Выберите шашку, у которой есть подсвеченное взятие.");
    render();
  } else if (hasCapture && !clickedPiece) {
    showForcedCaptures = true;
    showToast("Сейчас обязательно нужно рубить. Нажмите на подсвеченную клетку после выбора рубящей шашки.");
    render();
  }
}

function showError(error) {
  if (!room && boardEl.children.length === 0) render();
  statusText.textContent = error.message;
}

function startPolling() {
  if (!room) return;
  clearTimeout(pollTimer);

  async function pollOnce() {
    if (!room) return;

    try {
      const tokenQuery = player.token ? `?token=${encodeURIComponent(player.token)}` : "";
      const payload = await api(`/api/rooms/${room.code}${tokenQuery}`);
      applyPlayerUpdate(payload.player);
      if (payload.room.version !== room.version) {
        const previousRoom = room;
        const nextRoom = payload.room;
        room = payload.room;
        queueMoveAnimation(previousRoom, nextRoom);
        playGameSound(previousRoom, nextRoom);
        maybePlayRemoteShake(nextRoom);
        render();
      }
    } catch (error) {
      statusText.textContent = "Связь прервалась. Переподключаемся...";
    } finally {
      pollTimer = setTimeout(pollOnce, 1000);
    }
  }

  pollTimer = setTimeout(pollOnce, 1000);
}

createRoomButton.addEventListener("click", () => {
  createRoom().catch(showError);
});

for (const button of styleButtons) {
  button.addEventListener("click", () => {
    const theme = normalizeTheme(button.dataset.theme);
    localStorage.setItem(themeKey, theme);
    applyTheme(theme);
  });
}

uiThemeToggle.addEventListener("click", toggleUiTheme);
soundToggle.addEventListener("click", toggleSound);

document.addEventListener("mouseover", (event) => {
  const target = event.target.closest("button:not(.cell), a, [role='button']");
  if (!target || target.disabled || target.hidden || target.getAttribute("aria-disabled") === "true") return;
  if (event.relatedTarget && target.contains(event.relatedTarget)) return;
  playHoverSound();
});

leaveRoomButton.addEventListener("click", () => {
  leaveRoom().catch(showError);
});

surrenderButton.addEventListener("click", () => {
  resignRoom().catch(showError);
});

drawButton.addEventListener("click", () => {
  offerDraw().catch(showError);
});

shakeButton.addEventListener("click", sendBoardShake);

rematchButton.addEventListener("click", () => {
  offerRematch().catch(showError);
});

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  joinRoom(roomInput.value).catch(showError);
});

copyLinkButton.addEventListener("click", () => {
  copyRoomLink();
});

statusText.addEventListener("click", (event) => {
  if (event.target.classList.contains("room-code-inline")) copyRoomLink();
});

modalNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !modalNameInput.hidden) {
    event.preventDefault();
    modalActions.querySelector("button")?.click();
  }
});

nameInput.value = localStorage.getItem("russian-checkers:name") || "";
applyTheme(localStorage.getItem(themeKey));
applyUiTheme(localStorage.getItem(uiThemeKey));
applySoundState(localStorage.getItem(soundKey));
const initialRoom = new URLSearchParams(location.search).get("room");
if (initialRoom) {
  const normalized = initialRoom.toUpperCase();
  const saved = loadSession(normalized);
  roomInput.value = normalized;
  if (saved?.name && !nameInput.value.trim()) nameInput.value = saved.name;
  if (saved?.token || nameInput.value.trim()) {
    render();
    joinRoom(normalized).catch(showError);
  } else {
    render();
    showNameJoinModal(normalized);
  }
} else {
  render();
}
