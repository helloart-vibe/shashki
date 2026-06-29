const boardEl = document.querySelector("#board");
const boardShell = document.querySelector(".board-shell");
const rippleCanvas = document.querySelector("#rippleCanvas");
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
const undoButton = document.querySelector("#undoButton");
const shakeButton = document.querySelector("#shakeButton");
const rematchButton = document.querySelector("#rematchButton");
const reactionActions = document.querySelector("#reactionActions");
const reactionButtons = [...document.querySelectorAll(".reaction-button")];
const emojiReactions = document.querySelector(".emoji-reactions");
const reactionBubble = document.querySelector("#reactionBubble");
const joinForm = document.querySelector("#joinForm");
const nameInput = document.querySelector("#nameInput");
const roomInput = document.querySelector("#roomInput");
const styleButtons = [...document.querySelectorAll(".style-swatch")];
const soundToggle = document.querySelector("#soundToggle");
const musicToggle = document.querySelector("#musicToggle");
const uiThemeToggle = document.querySelector("#uiThemeToggle");
const copyLinkButton = document.querySelector("#copyLinkButton");
const superRoomCodeButton = document.querySelector("#superRoomCodeButton");
const scoreCard = document.querySelector("#scoreCard");
const whiteNameEl = document.querySelector("#whiteName");
const blackNameEl = document.querySelector("#blackName");
const scoreTextEl = document.querySelector("#scoreText");
const selfCard = document.querySelector("#selfCard");
const selfStack = document.querySelector("#selfStack") || document.querySelector(".self-stack");
const selfNameEl = document.querySelector("#selfName");
const selfScoreEl = document.querySelector("#selfScore");
const selfColorEl = document.querySelector("#selfColor");
const thinkingText = document.querySelector("#thinkingText");
const selfCapturedPiecesEl = document.querySelector("#selfCapturedPieces");
const opponentThinkingText = document.querySelector("#opponentThinkingText");
const opponentStack = document.querySelector(".opponent-stack");
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
const musicKey = "russian-checkers:music";
const themes = new Set(["sky", "walnut", "midnight", "lime", "sand", "super"]);
const uiThemes = new Set(["light", "dark"]);
const soundStates = new Set(["on", "off"]);
const undoWindowDuration = 1500;
const moveSound = new Audio("/move.mp3");
const superMoveSound = new Audio("/super-move.wav");
const captureSound = new Audio("/capture.mp3");
const superCaptureSound = new Audio("/super-capture-magnific.mp3");
const promotionSound = new Audio("/promotion.mp3");
const superPromotionSound = new Audio("/super-promotion.mp3");
const winSound = new Audio("/win-magnific.mp3");
const loseSound = new Audio("/lose-magnific.mp3");
const soundToggleEffect = new Audio("/sound-toggle.mp3");
const themeToggleEffect = new Audio("/theme-toggle.mp3");
const roomEnterSound = new Audio("/room-enter.mp3");
const secondPlayerOnlineSound = new Audio("/second-player-online.mp3");
const shakeSound = new Audio("/shake.mp3");
const reactionSound = new Audio("/reaction-pop.mp3");
const linkHoverSound = new Audio("/link-hover.mp3");
const superAmbientMusic = new Audio("/super-ambient.mp3");
moveSound.preload = "auto";
superMoveSound.preload = "auto";
captureSound.preload = "auto";
superCaptureSound.preload = "auto";
promotionSound.preload = "auto";
superPromotionSound.preload = "auto";
winSound.preload = "auto";
loseSound.preload = "auto";
soundToggleEffect.preload = "auto";
themeToggleEffect.preload = "auto";
roomEnterSound.preload = "auto";
secondPlayerOnlineSound.preload = "auto";
shakeSound.preload = "auto";
reactionSound.preload = "auto";
linkHoverSound.preload = "auto";
superAmbientMusic.preload = "auto";
superAmbientMusic.loop = true;
superAmbientMusic.volume = 0.6;
let room = null;
let player = { color: "spectator", token: null };
let selected = null;
let pendingSteps = [];
let legalMoves = [];
let pollTimer = null;
let toastTimer = null;
let surrenderConfirmTimer = null;
let surrenderConfirmInterval = null;
let showForcedCaptures = false;
let activeModalKey = null;
let lastMoveSoundKey = "";
let lastWinSoundKey = "";
let lastMoveSoundAt = 0;
let moveRequestPending = false;
let undoRequestPending = false;
let undoWindow = null;
let undoWindowTimer = null;
let lastShakeId = "";
let lastReactionId = "";
let reactionTimer = null;
let boardEffectTimer = null;
let rippleFrame = 0;
let rippleStartedAt = 0;
let rippleClickPoint = { x: 0, y: 0 };
let rippleSnapshot = null;
const rippleImageCache = new Map();
let playedMoveSoundKeys = new Set();
let boardMoveAnimation = null;
let captureReplay = null;
let captureReplayTimer = null;
let capturedPiecesSnapshot = null;
let capturedPiecesRoomCode = "";
let lastConnectedRoomCode = "";
let lastConnectedPlayers = null;
const dismissedModalKeys = new Set();

function normalizeTheme(theme) {
  return themes.has(theme) ? theme : "super";
}

function applyTheme(theme) {
  const nextTheme = normalizeTheme(theme);
  document.body.dataset.theme = nextTheme;
  if (nextTheme === "super") {
    cachedRippleImage("/super-board.svg");
    cachedRippleImage("/super-board-white-bottom.svg");
  }

  for (const button of styleButtons) {
    button.classList.toggle("is-selected", button.dataset.theme === nextTheme);
  }

  syncSuperMusic();
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
  uiThemeToggle?.setAttribute(
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
  superMoveSound.muted = nextState === "off";
  captureSound.muted = nextState === "off";
  superCaptureSound.muted = nextState === "off";
  promotionSound.muted = nextState === "off";
  superPromotionSound.muted = nextState === "off";
  winSound.muted = nextState === "off";
  loseSound.muted = nextState === "off";
  shakeSound.muted = nextState === "off";
  reactionSound.muted = nextState === "off";
  linkHoverSound.muted = nextState === "off";
}

function toggleSound() {
  const nextState = document.body.dataset.sound === "off" ? "on" : "off";
  soundToggleEffect.currentTime = 0;
  soundToggleEffect.play().catch(() => {});
  localStorage.setItem(soundKey, nextState);
  applySoundState(nextState);
}

function normalizeMusicState(value) {
  return value === "off" ? "off" : "on";
}

function syncSuperMusic() {
  const shouldPlay = document.body.dataset.theme === "super" && document.body.dataset.music !== "off";

  superAmbientMusic.volume = 0.6;
  if (shouldPlay) {
    superAmbientMusic.play().catch(() => {});
    return;
  }

  superAmbientMusic.pause();
}

function applyMusicState(value) {
  const nextState = normalizeMusicState(value);
  document.body.dataset.music = nextState;
  musicToggle?.setAttribute("aria-label", nextState === "on" ? "Выключить музыку" : "Включить музыку");
  syncSuperMusic();
}

function toggleMusic() {
  const nextState = document.body.dataset.music === "off" ? "on" : "off";
  localStorage.setItem(musicKey, nextState);
  applyMusicState(nextState);
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

function playLinkHoverSound() {
  if (document.body.dataset.sound === "off") return;
  linkHoverSound.currentTime = 0;
  linkHoverSound.play().catch(() => {});
}

function maybePlaySecondPlayerOnline(connectedPlayers) {
  if (!room) return;
  const isSameRoom = lastConnectedRoomCode === room.code;
  const previousCount = isSameRoom ? lastConnectedPlayers : null;

  if (previousCount === 1 && connectedPlayers === 2) playSecondPlayerOnlineSound();

  lastConnectedRoomCode = room.code;
  lastConnectedPlayers = connectedPlayers;
}

function easeOutQuart(value) {
  return 1 - Math.pow(1 - value, 4);
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, safeRadius);
    return;
  }

  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
}

function setupRippleCanvas() {
  if (!rippleCanvas || !boardShell) return null;
  const rect = boardShell.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (rippleCanvas.width !== width || rippleCanvas.height !== height) {
    rippleCanvas.width = width;
    rippleCanvas.height = height;
  }

  const ctx = rippleCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, rect };
}

function imageFromCssUrl(value) {
  const match = value?.match(/url\(["']?(.+?)["']?\)/);
  return match?.[1] || "";
}

function cachedRippleImage(src) {
  if (!src) return null;
  if (rippleImageCache.has(src)) return rippleImageCache.get(src);

  const image = new Image();
  image.src = src;
  rippleImageCache.set(src, image);
  return image;
}

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.beginPath();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawSuperPieceSnapshot(ctx, x, y, width, height, piece) {
  const radius = Math.min(width, height) / 2;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const isWhite = piece.classList.contains("white");

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const base = ctx.createRadialGradient(
    x + width * 0.38,
    y + height * 0.2,
    radius * 0.06,
    cx,
    cy,
    radius,
  );

  if (isWhite) {
    base.addColorStop(0, "rgba(255, 255, 255, 0.96)");
    base.addColorStop(0.18, "rgba(255, 216, 184, 0.96)");
    base.addColorStop(0.44, "rgba(242, 129, 82, 0.98)");
    base.addColorStop(0.68, "rgba(151, 89, 198, 0.88)");
    base.addColorStop(1, "rgba(87, 59, 220, 0.68)");
  } else {
    base.addColorStop(0, "rgba(255, 255, 255, 0.88)");
    base.addColorStop(0.22, "rgba(174, 159, 255, 0.94)");
    base.addColorStop(0.55, "rgba(109, 80, 232, 0.96)");
    base.addColorStop(1, "rgba(69, 42, 190, 0.86)");
  }

  ctx.fillStyle = base;
  ctx.fillRect(x, y, width, height);

  const inner = ctx.createRadialGradient(cx, y + height * 0.72, radius * 0.08, cx, cy, radius * 0.82);
  inner.addColorStop(0, isWhite ? "rgba(107, 67, 205, 0.5)" : "rgba(56, 36, 180, 0.42)");
  inner.addColorStop(0.44, isWhite ? "rgba(154, 97, 208, 0.22)" : "rgba(154, 137, 230, 0.18)");
  inner.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = inner;
  ctx.fillRect(x, y, width, height);

  const shine = ctx.createRadialGradient(x + width * 0.42, y + height * 0.16, 0, x + width * 0.38, y + height * 0.2, radius * 0.42);
  shine.addColorStop(0, "rgba(255, 255, 255, 0.42)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = shine;
  ctx.fillRect(x, y, width, height);
  ctx.restore();

  if (!piece.classList.contains("king")) return;

  ctx.save();
  ctx.globalAlpha = 0.56;
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  const crownWidth = width * 0.42;
  const crownHeight = height * 0.28;
  const crownX = cx - crownWidth / 2;
  const crownY = cy - crownHeight / 2;
  ctx.beginPath();
  ctx.moveTo(crownX + crownWidth * 0.08, crownY + crownHeight * 0.95);
  ctx.lineTo(crownX + crownWidth * 0.92, crownY + crownHeight * 0.95);
  ctx.lineTo(crownX + crownWidth * 0.82, crownY + crownHeight * 0.34);
  ctx.lineTo(crownX + crownWidth * 0.62, crownY + crownHeight * 0.62);
  ctx.lineTo(crownX + crownWidth * 0.5, crownY + crownHeight * 0.18);
  ctx.lineTo(crownX + crownWidth * 0.38, crownY + crownHeight * 0.62);
  ctx.lineTo(crownX + crownWidth * 0.18, crownY + crownHeight * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderRippleSnapshot(boardRect) {
  const width = Math.max(1, Math.round(boardRect.width));
  const height = Math.max(1, Math.round(boardRect.height));
  const snapshot = document.createElement("canvas");
  snapshot.width = width;
  snapshot.height = height;

  const ctx = snapshot.getContext("2d", { willReadFrequently: true });
  const boardStyle = getComputedStyle(boardEl);
  const isSuperTheme = document.body.dataset.theme === "super";
  const transparent = "rgba(0, 0, 0, 0)";
  const boardFill = boardStyle.backgroundColor === transparent
    ? (isSuperTheme ? "#100f18" : getComputedStyle(document.body).getPropertyValue("--dark-cell").trim() || "#000")
    : boardStyle.backgroundColor || "#000";
  fillRoundedRect(ctx, 0, 0, width, height, width * 0.12684, boardFill);

  const boardImage = isSuperTheme ? cachedRippleImage(imageFromCssUrl(boardStyle.backgroundImage)) : null;
  if (boardImage?.complete && boardImage.naturalWidth) {
    ctx.drawImage(boardImage, 0, 0, width, height);
  }

  const scaleX = width / boardRect.width;
  const scaleY = height / boardRect.height;
  const cells = [...boardEl.querySelectorAll(".cell")];

  for (const cell of cells) {
    const rect = cell.getBoundingClientRect();
    const x = (rect.left - boardRect.left) * scaleX;
    const y = (rect.top - boardRect.top) * scaleY;
    const w = rect.width * scaleX;
    const h = rect.height * scaleY;
    const style = getComputedStyle(cell);
    const isDark = cell.classList.contains("dark");
    const radius = isSuperTheme ? Math.min(w, h) * 0.24 : 0;

    if (!isSuperTheme) {
      const fallback = isDark ? getComputedStyle(document.body).getPropertyValue("--dark-cell").trim() : getComputedStyle(document.body).getPropertyValue("--light-cell").trim();
      fillRoundedRect(ctx, x, y, w, h, radius, style.backgroundColor === "rgba(0, 0, 0, 0)" ? fallback : style.backgroundColor);
    }

    const piece = cell.querySelector(".piece");
    if (!piece) continue;

    const pieceRect = piece.getBoundingClientRect();
    const px = (pieceRect.left - boardRect.left) * scaleX;
    const py = (pieceRect.top - boardRect.top) * scaleY;
    const pw = pieceRect.width * scaleX;
    const ph = pieceRect.height * scaleY;
    const pieceStyle = getComputedStyle(piece);
    const image = cachedRippleImage(imageFromCssUrl(pieceStyle.backgroundImage));

    if (isSuperTheme) {
      drawSuperPieceSnapshot(ctx, px, py, pw, ph, piece);
    } else if (image?.complete && image.naturalWidth) {
      ctx.drawImage(image, px, py, pw, ph);
    } else {
      const color = piece.classList.contains("white")
        ? getComputedStyle(document.body).getPropertyValue("--white-piece").trim() || "#fff"
        : getComputedStyle(document.body).getPropertyValue("--black-piece").trim() || "#333";
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + ph / 2, Math.min(pw, ph) / 2, 0, Math.PI * 2);
      ctx.fillStyle = color.startsWith("radial-gradient") ? (piece.classList.contains("white") ? "#fff" : "#2f2f2f") : color;
      ctx.fill();
    }
  }

  return snapshot;
}

function sampleRipplePixel(source, width, height, x, y) {
  const sx = Math.max(0, Math.min(width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(y)));
  return (sy * width + sx) * 4;
}

function drawDistortedRipple(ctx, snapshot, centerX, centerY, radius, frontWidth, alpha) {
  const width = snapshot.width;
  const height = snapshot.height;
  const sourceData = snapshot.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height).data;
  const output = ctx.createImageData(width, height);
  const outputData = output.data;
  const amplitude = Math.max(8, Math.min(width, height) * 0.025) * alpha;
  const minRadius = Math.max(0, radius - frontWidth * 1.5);
  const maxRadius = radius + frontWidth * 1.5;
  const minX = Math.max(0, Math.floor(centerX - maxRadius - amplitude));
  const maxX = Math.min(width - 1, Math.ceil(centerX + maxRadius + amplitude));
  const minY = Math.max(0, Math.floor(centerY - maxRadius - amplitude));
  const maxY = Math.min(height - 1, Math.ceil(centerY + maxRadius + amplitude));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance < minRadius || distance > maxRadius) continue;

      const normalX = distance ? dx / distance : 0;
      const normalY = distance ? dy / distance : 0;
      const band = (distance - radius) / frontWidth;
      const envelope = Math.exp(-band * band * 2.7);
      const displacement = Math.sin(band * Math.PI) * amplitude * envelope;
      const sourceIndex = sampleRipplePixel(sourceData, width, height, x - normalX * displacement, y - normalY * displacement);
      const targetIndex = (y * width + x) * 4;
      const opacity = Math.min(0.96, envelope * alpha * 1.2);

      outputData[targetIndex] = sourceData[sourceIndex];
      outputData[targetIndex + 1] = sourceData[sourceIndex + 1];
      outputData[targetIndex + 2] = sourceData[sourceIndex + 2];
      outputData[targetIndex + 3] = Math.round(sourceData[sourceIndex + 3] * opacity);
    }
  }

  ctx.putImageData(output, 0, 0);
}

function drawRippleFrame(now) {
  const setup = setupRippleCanvas();
  if (!setup || !rippleSnapshot) return;

  const { ctx, rect: shellRect } = setup;
  const boardRect = boardEl.getBoundingClientRect();
  const x = boardRect.left - shellRect.left;
  const y = boardRect.top - shellRect.top;
  const size = Math.min(boardRect.width, boardRect.height);
  const centerX = boardRect.width / 2;
  const centerY = boardRect.height / 2;
  const duration = 840;
  const rawProgress = Math.min(1, (now - rippleStartedAt) / duration);
  const progress = easeOutQuart(rawProgress);
  const alpha = Math.sin(rawProgress * Math.PI);
  const frontWidth = Math.max(18, size * (0.075 - rawProgress * 0.025));
  const maxRadius = size * 0.72;
  const radius = Math.max(2, maxRadius * progress);

  ctx.clearRect(0, 0, shellRect.width, shellRect.height);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const warped = document.createElement("canvas");
  warped.width = rippleSnapshot.width;
  warped.height = rippleSnapshot.height;
  const warpedCtx = warped.getContext("2d", { willReadFrequently: true });
  drawDistortedRipple(warpedCtx, rippleSnapshot, centerX, centerY, radius, frontWidth, alpha);
  ctx.drawImage(
    warped,
    Math.round(x * dpr),
    Math.round(y * dpr),
    Math.round(boardRect.width * dpr),
    Math.round(boardRect.height * dpr),
  );
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "screen";

  const fringe = [
    { color: "255, 82, 76", offset: -frontWidth * 0.24 },
    { color: "255, 221, 112", offset: -frontWidth * 0.08 },
    { color: "98, 225, 255", offset: frontWidth * 0.1 },
    { color: "92, 112, 255", offset: frontWidth * 0.26 },
  ];

  ctx.lineCap = "round";
  for (const item of fringe) {
    ctx.strokeStyle = `rgba(${item.color}, ${0.16 * alpha})`;
    ctx.lineWidth = Math.max(1, size * 0.0025);
    ctx.beginPath();
    ctx.arc(x + boardRect.width / 2, y + boardRect.height / 2, Math.max(1, radius + item.offset), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.11 * alpha})`;
  ctx.lineWidth = Math.max(1, size * 0.008);
  ctx.beginPath();
  ctx.arc(x + boardRect.width / 2, y + boardRect.height / 2, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  if (rawProgress < 1) {
    rippleFrame = requestAnimationFrame(drawRippleFrame);
    return;
  }

  ctx.clearRect(0, 0, shellRect.width, shellRect.height);
  rippleFrame = 0;
  rippleSnapshot = null;
}

function shakeBoard(event) {
  playShakeSound();
  boardEl.classList.remove("is-shaking");
  void boardEl.offsetWidth;
  boardEl.classList.add("is-shaking");
  boardEl.addEventListener("animationend", () => boardEl.classList.remove("is-shaking"), { once: true });

  if (rippleFrame) cancelAnimationFrame(rippleFrame);
  rippleFrame = 0;
  rippleSnapshot = null;
  if (!rippleCanvas) return;
  const ctx = rippleCanvas.getContext("2d");
  ctx?.clearRect(0, 0, rippleCanvas.width, rippleCanvas.height);
}

function playShakeSound() {
  if (document.body.dataset.sound === "off") return;
  shakeSound.currentTime = 0;
  shakeSound.play().catch(() => {});
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

function placeReactionBubble(reaction) {
  const isSuperGame = room?.theme === "super" && document.body.dataset.screen === "game";

  if (!isSuperGame) {
    if (boardShell && reactionBubble.parentElement !== boardShell) {
      boardShell.insertBefore(reactionBubble, boardEl);
    }
    return;
  }

  const isOwnReaction = reaction.from === player.color;
  const targetStack = isOwnReaction ? selfStack : opponentStack;
  if (!targetStack) return;

  if (isOwnReaction && reactionActions) {
    reactionActions.appendChild(reactionBubble);
    return;
  }

  targetStack.appendChild(reactionBubble);
}

function showReaction(reaction) {
  if (!reaction?.text) return;
  reactionSound.currentTime = 0;
  reactionSound.play().catch(() => {});
  clearTimeout(reactionTimer);
  placeReactionBubble(reaction);
  reactionBubble.hidden = false;
  reactionBubble.textContent = reaction.text;
  reactionBubble.classList.remove("from-self", "from-opponent", "is-emoji", "is-showing");
  reactionBubble.classList.add(reaction.from === player.color ? "from-self" : "from-opponent");
  if ([...reaction.text].some((symbol) => /\p{Extended_Pictographic}/u.test(symbol))) {
    reactionBubble.classList.add("is-emoji");
  }
  void reactionBubble.offsetWidth;
  reactionBubble.classList.add("is-showing");
  reactionTimer = setTimeout(() => {
    reactionBubble.hidden = true;
    reactionBubble.classList.remove("is-showing");
  }, 2200);
}

function collapseEmojiReactions() {
  emojiReactions?.classList.remove("is-open");
  emojiReactions?.classList.add("is-collapsed");
}

function openEmojiReactions() {
  emojiReactions?.classList.remove("is-collapsed");
  emojiReactions?.classList.add("is-open");
}

function isTouchEmojiMode() {
  return window.matchMedia?.("(hover: none), (pointer: coarse)").matches;
}

function maybeShowReaction(nextRoom) {
  const reaction = nextRoom?.reaction;
  if (!reaction?.id || reaction.id === lastReactionId) return;

  lastReactionId = reaction.id;
  showReaction(reaction);
}

function rememberReaction(nextRoom = room) {
  lastReactionId = nextRoom?.reaction?.id || "";
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

function winSoundKey(nextRoom = room) {
  if (nextRoom?.game?.status !== "finished" || !nextRoom.game.winner) return "";
  return `${nextRoom.code}:${nextRoom.version}:${nextRoom.game.winner}`;
}

function didGameBecomeWon(previousRoom, nextRoom) {
  return Boolean(
    nextRoom?.game?.status === "finished" &&
      nextRoom.game.winner &&
      (previousRoom?.game?.status !== "finished" || previousRoom?.game?.winner !== nextRoom.game.winner),
  );
}

function playOutcomeSound(previousRoom, nextRoom = room) {
  if (document.body.dataset.sound === "off" || !didGameBecomeWon(previousRoom, nextRoom)) return;

  const nextKey = winSoundKey(nextRoom);
  if (!nextKey || nextKey === lastWinSoundKey) return;

  lastWinSoundKey = nextKey;
  const didLose =
    player.color &&
    player.color !== "spectator" &&
    nextRoom?.game?.winner &&
    player.color !== nextRoom.game.winner;
  const sound = didLose ? loseSound : winSound;
  sound.currentTime = 0;
  sound.play().catch(() => {});
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
  const themeMoveSound = nextRoom?.theme === "super" || document.body.dataset.theme === "super"
    ? superMoveSound
    : moveSound;
  const themeCaptureSound = nextRoom?.theme === "super" || document.body.dataset.theme === "super"
    ? superCaptureSound
    : captureSound;
  const themePromotionSound = nextRoom?.theme === "super" || document.body.dataset.theme === "super"
    ? superPromotionSound
    : promotionSound;
  const sound = didMovePromote(previousRoom, nextRoom)
    ? themePromotionSound
    : didMoveCapture(nextRoom)
      ? themeCaptureSound
      : themeMoveSound;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function playRoomUpdateSound(previousRoom, nextRoom = room) {
  if (didGameBecomeWon(previousRoom, nextRoom)) {
    playOutcomeSound(previousRoom, nextRoom);
    return;
  }

  playGameSound(previousRoom, nextRoom);
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
    promoted: didMovePromote(previousRoom, nextRoom),
  };
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function clearCaptureReplay() {
  if (captureReplayTimer) clearTimeout(captureReplayTimer);
  captureReplayTimer = null;
  captureReplay = null;
}

function startCaptureReplay(previousRoom, nextRoom = room) {
  const move = nextRoom?.game?.lastMove;
  const previousKey = moveSoundKey(previousRoom);
  const nextKey = moveSoundKey(nextRoom);
  const captureSteps = move?.steps?.filter((step) => step.capture) || [];

  if (
    !previousRoom?.game?.board ||
    !nextRoom?.game?.board ||
    !move?.steps?.length ||
    captureSteps.length < 2 ||
    !nextKey ||
    previousKey === nextKey
  ) {
    clearCaptureReplay();
    return false;
  }

  clearCaptureReplay();

  const replayBoard = cloneBoard(previousRoom.game.board);
  const finalStep = move.steps[move.steps.length - 1];
  let current = { ...move.from };
  let stepIndex = 0;
  captureReplay = { key: nextKey, board: replayBoard };

  const playStep = () => {
    if (!captureReplay || captureReplay.key !== nextKey) return;

    const step = move.steps[stepIndex];
    const movingPiece = replayBoard[current.r]?.[current.c];
    if (!step || !movingPiece) {
      clearCaptureReplay();
      render();
      return;
    }

    const from = { ...current };
    const finalPiece = nextRoom.game.board[finalStep.to.r]?.[finalStep.to.c];
    const nextPiece = stepIndex === move.steps.length - 1 && finalPiece ? { ...finalPiece } : { ...movingPiece };

    replayBoard[from.r][from.c] = null;
    if (step.capture) replayBoard[step.capture.r][step.capture.c] = null;
    replayBoard[step.to.r][step.to.c] = nextPiece;

    const fromDisplay = displayPoint(from);
    const toDisplay = displayPoint(step.to);
    boardMoveAnimation = {
      key: `${nextKey}:${stepIndex}`,
      to: pointKey(step.to),
      dx: fromDisplay.c - toDisplay.c,
      dy: fromDisplay.r - toDisplay.r,
      promoted: stepIndex === move.steps.length - 1 && didMovePromote(previousRoom, nextRoom),
    };

    current = { ...step.to };
    stepIndex += 1;
    render();

    captureReplayTimer = setTimeout(() => {
      if (stepIndex < move.steps.length) {
        playStep();
        return;
      }

      clearCaptureReplay();
      render();
    }, 540);
  };

  playStep();
  return true;
}

function capturedPiecesByColor() {
  if (!room?.game?.board) return { white: 0, black: 0 };

  const remaining = { white: 0, black: 0 };
  const board = room.game.board;

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
  const capturedByColor = capturedPiecesByColor();

  if (!room || player.color === "spectator") {
    selfCapturedPiecesEl.hidden = true;
    opponentCapturedPiecesEl.hidden = true;
    selfCapturedPiecesEl.innerHTML = "";
    opponentCapturedPiecesEl.innerHTML = "";
    capturedPiecesSnapshot = null;
    capturedPiecesRoomCode = "";
    return capturedByColor;
  }

  if (capturedPiecesRoomCode !== room.code) {
    capturedPiecesSnapshot = { ...capturedByColor };
    capturedPiecesRoomCode = room.code;
  }

  const opponent = CheckersRules.opponent(player.color);
  renderCapturedPieces(selfCapturedPiecesEl, player.color, capturedByColor);
  renderCapturedPieces(opponentCapturedPiecesEl, opponent, capturedByColor);
  capturedPiecesSnapshot = { ...capturedByColor };
  return capturedByColor;
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

function clearUndoWindow() {
  undoWindow = null;
  clearTimeout(undoWindowTimer);
  undoWindowTimer = null;
  syncUndoButton();
}

function canUndoMove() {
  return Boolean(
    undoWindow &&
      room &&
      room.code === undoWindow.roomCode &&
      Date.now() < undoWindow.expiresAt &&
      !undoRequestPending
  );
}

function syncUndoButton() {
  if (!undoButton) return;
  const canShow =
    room &&
    player.color !== "spectator" &&
    room.game.status === "playing" &&
    (isRoomReady() || room.theme === "super");
  undoButton.hidden = !canShow;
  undoButton.disabled = !canUndoMove();
  undoButton.classList.toggle("is-undo-ready", canUndoMove());
}

function openUndoWindow(nextRoom) {
  clearTimeout(undoWindowTimer);
  undoWindow = {
    roomCode: nextRoom.code,
    version: nextRoom.version,
    expiresAt: Date.now() + undoWindowDuration,
  };
  syncUndoButton();
  undoWindowTimer = setTimeout(clearUndoWindow, undoWindowDuration);
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
  clearTimeout(surrenderConfirmTimer);
  clearInterval(surrenderConfirmInterval);
  surrenderConfirmTimer = null;
  surrenderConfirmInterval = null;
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
  const isSoftModal =
    key.startsWith("draw:") ||
    key.startsWith("resign:") ||
    key.startsWith("surrender-confirm:") ||
    key.startsWith("rematch:");
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

function closeResolvedGameModal(previousRoom, nextRoom) {
  if (!activeModalKey || modalBackdrop.hidden) return;

  const gameRestarted =
    previousRoom?.game?.status === "finished" &&
    nextRoom?.game?.status === "playing";
  const isResolvedGameModal =
    activeModalKey.startsWith("rematch:") ||
    activeModalKey.startsWith("win:") ||
    activeModalKey.startsWith("loss:");

  if (gameRestarted && isResolvedGameModal) closeModal(true);
}

function showSurrenderConfirm() {
  if (!room || !player.token || room.game.status !== "playing") return;
  let secondsLeft = 3;
  const key = `surrender-confirm:${room.code}:${room.version}`;
  const updateText = () => {
    modalText.textContent = `Сдача через ${secondsLeft} сек.`;
  };

  showModal(key, "Сдаться?", `Сдача через ${secondsLeft} сек.`, [
    {
      label: "Отмена",
      className: "secondary",
      onClick: () => closeModal(),
    },
  ]);

  surrenderConfirmInterval = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft > 0) updateText();
  }, 1000);

  surrenderConfirmTimer = setTimeout(() => {
    closeModal();
    resignRoom().catch(showError);
  }, 3000);
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
  const replayingCapture = Boolean(captureReplay);
  const board = captureReplay?.board || room?.game.board || CheckersRules.createGame().board;
  const targets = nextTargets();
  const forcedTargets = forcedCaptureTargets();
  const forcedCaptureActive = hasForcedCapture();
  const selectable = new Set();
  const { rows, cols } = boardPointsForPlayer();
  const displaySelected = selectedDisplayPoint();
  const selectedPiece = selected ? board[selected.r]?.[selected.c] : null;

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

      if (displaySelected && samePoint(displaySelected, point)) {
        cell.classList.add("selected");
        if (selectedPiece?.color) cell.classList.add(`selected-${selectedPiece.color}`);
      }
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
        replayingCapture ||
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

function syncReactionPlacement() {
  const shouldFloatReactions = room?.theme === "super" && document.body.dataset.screen === "game";
  if (shouldFloatReactions && selfStack) {
    if (reactionActions.parentElement !== selfStack) selfStack.appendChild(reactionActions);
    return;
  }

  if (reactionActions.parentElement !== gameActions) {
    gameActions.insertBefore(reactionActions, surrenderButton);
  }
}

function renderStatus() {
  if (!room) {
    applyTheme(localStorage.getItem(themeKey));
    document.body.dataset.screen = "lobby";
    document.body.dataset.boardBottom = "white";
    syncReactionPlacement();
    titleText.textContent = "Создай комнату";
    statusText.textContent = "или подключись по коду";
    playerColorEl.textContent = "не подключены";
    playerCountEl.textContent = "0/2";
    playerStrip.classList.remove("is-online", "is-waiting");
    turnText.textContent = "-";
    lobbyActions.hidden = false;
    gameActions.hidden = true;
    reactionActions.hidden = true;
    leaveRoomButton.hidden = true;
    superRoomCodeButton.hidden = true;
    clearUndoWindow();
    playerStrip.hidden = true;
    roomCard.hidden = true;
    scoreCard.hidden = true;
    selfCard.hidden = true;
    selfCard.removeAttribute("data-color");
    selfCard.classList.remove("is-active-turn");
    thinkingText.hidden = true;
    selfCapturedPiecesEl.hidden = true;
    selfCapturedPiecesEl.innerHTML = "";
    opponentThinkingText.hidden = true;
    opponentCapturedPiecesEl.hidden = true;
    opponentCapturedPiecesEl.innerHTML = "";
    opponentCard.hidden = true;
    opponentCard.removeAttribute("data-color");
    opponentCard.classList.remove("is-active-turn");
    reactionBubble.hidden = true;
    capturedPiecesSnapshot = null;
    capturedPiecesRoomCode = "";
    lastConnectedRoomCode = "";
    lastConnectedPlayers = null;
    closeModal();
    return;
  }

  applyTheme(room.theme);
  document.body.dataset.screen = "game";
  document.body.dataset.boardBottom = player.color === "black" ? "black" : "white";
  syncReactionPlacement();
  titleText.textContent = "Идёт игра";
  lobbyActions.hidden = true;
  gameActions.hidden = false;
  reactionActions.hidden = !(
    player.color !== "spectator" &&
    room.game.status === "playing" &&
    (isRoomReady() || room.theme === "super")
  );
  leaveRoomButton.hidden = false;
  superRoomCodeButton.hidden = room.theme !== "super";
  playerStrip.hidden = false;
  const canShowRoomControls =
    player.color !== "spectator" && room.game.status === "playing" && (isRoomReady() || room.theme === "super");
  surrenderButton.hidden = !canShowRoomControls;
  drawButton.hidden = !canShowRoomControls;
  syncUndoButton();
  rematchButton.hidden = !(
    isRoomReady() &&
    player.color !== "spectator" &&
    room.game.status === "finished" &&
    room.game.winner
  );
  rematchButton.disabled = room.rematchOffer?.from === player.color;
  rematchButton.textContent = rematchButton.disabled ? "Ждём ответ" : "Реванш";
  roomCard.hidden = false;
  scoreCard.hidden = room.theme !== "super";
  selfCard.hidden = player.color === "spectator";
  opponentCard.hidden = player.color === "spectator";
  selfCard.removeAttribute("data-color");
  opponentCard.removeAttribute("data-color");
  thinkingText.removeAttribute("data-color");
  opponentThinkingText.removeAttribute("data-color");
  selfCard.classList.remove("is-active-turn");
  opponentCard.classList.remove("is-active-turn");
  const capturedByColor = renderCapturedPiecesRows();
  roomCodeEl.textContent = room.code;
  superRoomCodeButton.textContent = room.code;
  playerColorEl.textContent = colorName(player.color);
  const connectedPlayers = Number(room.players.white) + Number(room.players.black);
  maybePlaySecondPlayerOnline(connectedPlayers);
  playerCountEl.textContent = `${connectedPlayers}/2`;
  playerStrip.classList.toggle("is-online", connectedPlayers === 2);
  playerStrip.classList.toggle("is-waiting", connectedPlayers < 2);
  turnText.textContent = room.game.turn === "white" ? "белые" : "черные";
  whiteNameEl.textContent = displayPlayerName("white");
  blackNameEl.textContent = displayPlayerName("black");
  scoreTextEl.textContent = `${room.score?.white ?? 0}\u00a0\u00a0/\u00a0\u00a0${room.score?.black ?? 0}`;

  if (player.color !== "spectator") {
    const opponent = CheckersRules.opponent(player.color);
    selfCard.dataset.color = player.color;
    opponentCard.dataset.color = opponent;
    thinkingText.dataset.color = player.color;
    opponentThinkingText.dataset.color = opponent;
    const selfName = `${player.name || displayPlayerName(player.color)} (вы)`;
    const opponentName = displayPlayerName(opponent);
    const formatCardScore = (color) =>
      room.theme === "super" ? `${capturedByColor[color] || 0} / 12` : String(room.score?.[color] ?? 0);
    selfNameEl.textContent = selfName;
    selfNameEl.title = selfName;
    selfScoreEl.textContent = formatCardScore(player.color);
    selfColorEl.textContent = colorLabel(player.color);
    opponentNameEl.textContent = opponentName;
    opponentNameEl.title = opponentName;
    opponentScoreEl.textContent = formatCardScore(opponent);
    opponentColorEl.textContent = colorLabel(opponent);
    const isPlaying = room.game.status === "playing";
    selfCard.classList.toggle("is-active-turn", isPlaying && room.game.turn === player.color);
    opponentCard.classList.toggle("is-active-turn", isPlaying && room.game.turn === opponent);
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
  rememberReaction(room);
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
  rememberReaction(room);
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

async function sendBoardShake(event) {
  shakeBoard(event);
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

async function sendReaction(reaction) {
  if (
    !room ||
    !player.token ||
    player.color === "spectator" ||
    room.game.status !== "playing" ||
    (!isRoomReady() && room.theme !== "super")
  ) {
    return;
  }
  const payload = await api(`/api/rooms/${room.code}/reaction`, {
    method: "POST",
    body: JSON.stringify({ token: player.token, reaction }),
  });
  room = payload.room;
  render();
  if (room.reaction?.id) {
    lastReactionId = room.reaction.id;
    showReaction(room.reaction);
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
    const nextRoom = payload.room;
    room = nextRoom;
    resetSelection();
    openUndoWindow(nextRoom);
    const replayingCapture = startCaptureReplay(previousRoom, nextRoom);
    if (!replayingCapture) {
      queueMoveAnimation(previousRoom, nextRoom);
      render();
    }
    playRoomUpdateSound(previousRoom, nextRoom);
  } finally {
    moveRequestPending = false;
  }
}

async function undoLastMove() {
  if (!room || !canUndoMove() || undoRequestPending) return;
  undoRequestPending = true;
  syncUndoButton();

  try {
    const payload = await api(`/api/rooms/${room.code}/undo-move`, {
      method: "POST",
      body: JSON.stringify({
        token: player.token,
        color: player.color,
        version: undoWindow.version,
      }),
    });
    room = payload.room;
    captureReplay = null;
    boardMoveAnimation = null;
    resetSelection();
    clearUndoWindow();
    render();
  } finally {
    undoRequestPending = false;
    syncUndoButton();
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
  clearCaptureReplay();
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
        room = nextRoom;
        closeResolvedGameModal(previousRoom, nextRoom);
        const replayingCapture = startCaptureReplay(previousRoom, nextRoom);
        if (!replayingCapture) {
          queueMoveAnimation(previousRoom, nextRoom);
          render();
        }
        playRoomUpdateSound(previousRoom, nextRoom);
        maybePlayRemoteShake(nextRoom);
        maybeShowReaction(nextRoom);
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

uiThemeToggle?.addEventListener("click", toggleUiTheme);
soundToggle.addEventListener("click", toggleSound);
musicToggle?.addEventListener("click", toggleMusic);

leaveRoomButton.addEventListener("click", () => {
  leaveRoom().catch(showError);
});

surrenderButton.addEventListener("click", () => {
  showSurrenderConfirm();
});

drawButton.addEventListener("click", () => {
  offerDraw().catch(showError);
});

undoButton.addEventListener("click", () => {
  undoLastMove().catch(showError);
});

shakeButton.addEventListener("click", sendBoardShake);

for (const button of reactionButtons) {
  button.addEventListener("click", async (event) => {
    const isEmojiReaction = button.classList.contains("emoji-reaction");
    const isVisibleEmoji = button.classList.contains("is-visible-emoji");
    const shouldOpenEmojiTray =
      isEmojiReaction && isVisibleEmoji && isTouchEmojiMode() && !emojiReactions?.classList.contains("is-open");

    if (shouldOpenEmojiTray) {
      event.preventDefault();
      openEmojiReactions();
      return;
    }

    if (isEmojiReaction) {
      collapseEmojiReactions();
      button.blur();
    }

    try {
      await sendReaction(button.dataset.reaction);
    } catch (error) {
      showError(error);
    }
  });
}

emojiReactions?.addEventListener("mouseleave", () => {
  emojiReactions.classList.remove("is-collapsed", "is-open");
});

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

superRoomCodeButton.addEventListener("click", () => {
  copyRoomLink();
});

statusText.addEventListener("click", (event) => {
  if (event.target.classList.contains("room-code-inline")) copyRoomLink();
});

document.addEventListener("mouseover", (event) => {
  if (event.target.closest(".board")) return;
  const linkLike = event.target.closest("button, .room-code-inline");
  if (!linkLike || linkLike.hidden || linkLike.disabled) return;
  if (linkLike.matches("#createRoomButton, #joinForm button")) return;
  if (event.relatedTarget && linkLike.contains(event.relatedTarget)) return;
  playLinkHoverSound();
});

modalNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !modalNameInput.hidden) {
    event.preventDefault();
    modalActions.querySelector("button")?.click();
  }
});

nameInput.value = localStorage.getItem("russian-checkers:name") || "";
applyMusicState(localStorage.getItem(musicKey));
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
