const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { CheckersRules } = require("./public/rules.js");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");
const APP_VERSION = "2026-05-21-sync-debug";
const INSTANCE_ID = crypto.randomBytes(4).toString("hex");
const rooms = new Map();
const THEMES = new Set(["sky", "walnut", "midnight", "lime", "sand", "super"]);
const PREVIEW_BY_THEME = {
  midnight: "1.jpg",
  sky: "2.jpg",
  walnut: "3.jpg",
  lime: "4.jpg",
  sand: "5.jpg",
  super: "super.jpg",
};
const REACTIONS = new Set([
  "блин",
  "ой",
  "упс...",
  "хорооош!",
  "круто!",
  "мощно",
  "ходи!",
  "не спи",
  "ты тут?",
  "упс",
  "ниииплооохоо!",
  "хорооош",
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function roomCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function playerToken() {
  return crypto.randomBytes(16).toString("hex");
}

function cleanName(name) {
  const value = String(name || "").trim().replace(/\s+/g, " ");
  return value.slice(0, 24);
}

function cleanTheme(theme) {
  return THEMES.has(theme) ? theme : "midnight";
}

function cleanReaction(reaction) {
  const value = String(reaction || "").trim().replace(/\s+/g, " ");
  return REACTIONS.has(value) ? value : "";
}

function isRoomReady(room) {
  return Boolean(room.players.white && room.players.black);
}

function publicRoom(room) {
  return {
    code: room.code,
    version: room.version,
    game: room.game,
    players: {
      white: Boolean(room.players.white),
      black: Boolean(room.players.black),
    },
    playerNames: room.playerNames,
    score: room.score,
    drawOffer: room.drawOffer,
    rematchOffer: room.rematchOffer,
    resultNotice: room.resultNotice,
    shake: room.shake,
    reaction: room.reaction,
    theme: cleanTheme(room.theme),
    updatedAt: room.updatedAt,
    server: {
      version: APP_VERSION,
      instanceId: INSTANCE_ID,
      roomCount: rooms.size,
    },
  };
}

function createRoom(name, theme) {
  let code = roomCode();
  while (rooms.has(code)) code = roomCode();

  const color = crypto.randomInt(2) === 0 ? "white" : "black";
  const token = playerToken();
  const room = {
    code,
    version: 1,
    game: CheckersRules.createGame(),
    players: {
      white: color === "white" ? token : null,
      black: color === "black" ? token : null,
    },
    playerNames: {
      white: color === "white" ? name : "",
      black: color === "black" ? name : "",
    },
    score: {
      white: 0,
      black: 0,
    },
    drawOffer: null,
    rematchOffer: null,
    resultNotice: null,
    shake: null,
    reaction: null,
    theme: cleanTheme(theme),
    creatorName: name,
    waiters: new Set(),
    updatedAt: Date.now(),
  };

  rooms.set(code, room);
  return { room, player: { color, token } };
}

function touch(room) {
  room.version += 1;
  room.updatedAt = Date.now();
  for (const waiter of room.waiters) waiter();
  room.waiters.clear();
}

function playerForToken(room, token) {
  const color = ["white", "black"].find((candidate) => room.players[candidate] === token);
  if (!color) return null;
  return { color, token, name: room.playerNames[color] };
}

function awardWinner(room, winner) {
  if (!winner || room.game.scoredWinner) return;
  room.score[winner] = (room.score[winner] || 0) + 1;
  room.game = {
    ...room.game,
    scoredWinner: winner,
  };
}

function noticeId() {
  return `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

function startRematch(room) {
  const currentPlayers = ["white", "black"].map((color) => ({
    token: room.players[color],
    name: room.playerNames[color],
    score: room.score[color] || 0,
  }));

  if (currentPlayers.some((item) => !item.token)) return false;

  const firstIsWhite = crypto.randomInt(2) === 0;
  const whitePlayer = firstIsWhite ? currentPlayers[0] : currentPlayers[1];
  const blackPlayer = firstIsWhite ? currentPlayers[1] : currentPlayers[0];

  room.players = {
    white: whitePlayer.token,
    black: blackPlayer.token,
  };
  room.playerNames = {
    white: whitePlayer.name,
    black: blackPlayer.name,
  };
  room.score = {
    white: whitePlayer.score,
    black: blackPlayer.score,
  };
  room.game = CheckersRules.createGame();
  room.drawOffer = null;
  room.rematchOffer = null;
  room.resultNotice = null;
  room.reaction = null;
  return true;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function requestOrigin(req) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const protocol = forwardedProtocol || (req.socket.encrypted ? "https" : "http");
  const host = forwardedHost || req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

function socialPreviewMeta(req) {
  const url = new URL(req.url, requestOrigin(req));
  const code = String(url.searchParams.get("room") || "").trim().toUpperCase();
  const room = rooms.get(code);
  const theme = cleanTheme(room?.theme);
  const creatorName = room?.creatorName || Object.values(room?.playerNames || {}).find(Boolean) || "Игрок";
  const title = "Go shashki?";
  const description = room
    ? `${creatorName} бросает тебе вызов – готов сразиться?`
    : "Создай комнату или подключись по коду";
  const imageUrl = `${url.origin}/previews/${PREVIEW_BY_THEME[theme]}`;
  const pageUrl = room ? `${url.origin}/?room=${encodeURIComponent(code)}` : `${url.origin}/`;

  const tags = [
    ["property", "og:type", "website"],
    ["property", "og:site_name", "GOSHASHKI"],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", pageUrl],
    ["property", "og:image", imageUrl],
    ["property", "og:image:secure_url", imageUrl],
    ["property", "og:image:type", "image/jpeg"],
    ["property", "og:image:width", "1200"],
    ["property", "og:image:height", "630"],
    ["property", "og:image:alt", "Приглашение сыграть в русские шашки"],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", imageUrl],
  ];

  return tags
    .map(([attribute, name, content]) =>
      `    <meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}" />`)
    .join("\n");
}

function serveIndex(req, res) {
  fs.readFile(path.join(PUBLIC_DIR, "index.html"), "utf8", (error, content) => {
    if (error) {
      notFound(res);
      return;
    }

    const page = content.replace("  </head>", `${socialPreviewMeta(req)}\n  </head>`);
    const pageBuffer = Buffer.from(page);
    res.writeHead(200, {
      "content-type": mimeTypes[".html"],
      "content-length": pageBuffer.length,
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });
    res.end(req.method === "HEAD" ? undefined : pageBuffer);
  });
}

function serveStatic(req, res) {
  const rawPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (rawPath === "/" || rawPath === "/index.html") {
    serveIndex(req, res);
    return;
  }

  const safePath = rawPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (!path.extname(filePath)) {
        serveIndex(req, res);
        return;
      }
      notFound(res);
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const isPreviewImage = extension === ".jpg" || extension === ".jpeg";
    res.writeHead(200, {
      "content-type": mimeTypes[extension] || "application/octet-stream",
      "content-length": content.length,
      "cache-control": isPreviewImage ? "public, max-age=604800, immutable" : "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      json(res, 200, {
        ok: true,
        version: APP_VERSION,
        instanceId: INSTANCE_ID,
        roomCount: rooms.size,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/rooms") {
      const body = await readBody(req);
      const name = cleanName(body.name);
      if (!name) {
        json(res, 400, { error: "Введите имя" });
        return;
      }

      const { room, player } = createRoom(name, body.theme);
      json(res, 201, {
        room: publicRoom(room),
        player: { ...player, name },
      });
      return;
    }

    if (parts[0] !== "api" || parts[1] !== "rooms" || !parts[2]) {
      notFound(res);
      return;
    }

    const code = parts[2].toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      json(res, 404, { error: "Комната не найдена" });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "join") {
      const body = await readBody(req);
      const name = cleanName(body.name);
      const existingPlayer = body.token ? playerForToken(room, body.token) : null;

      if (existingPlayer) {
        if (name) {
          room.playerNames[existingPlayer.color] = name;
          existingPlayer.name = name;
        }
        touch(room);
        json(res, 200, {
          room: publicRoom(room),
          player: existingPlayer,
        });
        return;
      }

      const color = ["white", "black"].find((candidate) => !room.players[candidate]);
      if (color) {
        if (!name) {
          json(res, 400, { error: "Введите имя" });
          return;
        }

        room.players[color] = playerToken();
        room.playerNames[color] = name;
        touch(room);
        json(res, 200, {
          room: publicRoom(room),
          player: { color, token: room.players[color], name },
        });
        return;
      }

      json(res, 200, {
        room: publicRoom(room),
        player: { color: "spectator", token: null, name: name || "Наблюдатель" },
      });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "leave") {
      const body = await readBody(req);
      const color = playerForToken(room, body.token)?.color;

      if (!color) {
        json(res, 200, { room: publicRoom(room) });
        return;
      }

      if (body.resign === true && room.game.status === "playing" && isRoomReady(room)) {
        const winner = CheckersRules.opponent(color);
        room.game = {
          ...room.game,
          status: "finished",
          winner,
          resignedBy: color,
          message: `${color === "white" ? "Белые" : "Черные"} сдались`,
        };
        awardWinner(room, winner);
      }

      room.players[color] = null;
      room.drawOffer = null;
      room.rematchOffer = null;
      room.reaction = null;
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "resign") {
      const body = await readBody(req);
      const color = playerForToken(room, body.token)?.color;

      if (!color) {
        json(res, 403, { error: "Нет прав сдаться" });
        return;
      }

      if (room.game.status !== "playing" || !isRoomReady(room)) {
        json(res, 409, { error: "Сдаться можно только во время партии" });
        return;
      }

      const winner = CheckersRules.opponent(color);
      room.score[winner] = (room.score[winner] || 0) + 1;
      room.game = CheckersRules.createGame();
      room.drawOffer = null;
      room.rematchOffer = null;
      room.reaction = null;
      room.resultNotice = {
        id: noticeId(),
        type: "resign",
        loser: color,
        winner,
        name: room.playerNames[color] || (color === "white" ? "Белые" : "Черные"),
      };
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "draw-offer") {
      const body = await readBody(req);
      const color = playerForToken(room, body.token)?.color;

      if (!color) {
        json(res, 403, { error: "Нет прав предложить ничью" });
        return;
      }

      if (room.game.status !== "playing" || !isRoomReady(room)) {
        json(res, 409, { error: "Ничью можно предложить только во время партии" });
        return;
      }

      room.drawOffer = {
        from: color,
        name: room.playerNames[color] || (color === "white" ? "Белые" : "Черные"),
      };
      room.rematchOffer = null;
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "draw-respond") {
      const body = await readBody(req);
      const color = playerForToken(room, body.token)?.color;

      if (!color) {
        json(res, 403, { error: "Нет прав ответить на ничью" });
        return;
      }

      if (!room.drawOffer || room.drawOffer.from === color) {
        json(res, 409, { error: "Нет предложения ничьей" });
        return;
      }

      if (body.accept) {
        room.score.white = (room.score.white || 0) + 1;
        room.score.black = (room.score.black || 0) + 1;
        room.game = CheckersRules.createGame();
        room.reaction = null;
        room.resultNotice = {
          id: noticeId(),
          type: "draw",
          acceptedBy: color,
        };
      }

      room.drawOffer = null;
      room.rematchOffer = null;
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "rematch-offer") {
      const body = await readBody(req);
      const color = playerForToken(room, body.token)?.color;

      if (!color) {
        json(res, 403, { error: "Нет прав предложить реванш" });
        return;
      }

      if (room.game.status !== "finished" || !room.game.winner || !isRoomReady(room)) {
        json(res, 409, { error: "Реванш можно предложить после завершения партии" });
        return;
      }

      room.rematchOffer = {
        from: color,
        name: room.playerNames[color] || (color === "white" ? "Белые" : "Черные"),
      };
      room.drawOffer = null;
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "rematch-respond") {
      const body = await readBody(req);
      const currentPlayer = playerForToken(room, body.token);

      if (!currentPlayer) {
        json(res, 403, { error: "Нет прав ответить на реванш" });
        return;
      }

      if (!room.rematchOffer || room.rematchOffer.from === currentPlayer.color) {
        json(res, 409, { error: "Нет предложения реванша" });
        return;
      }

      if (body.accept) {
        if (!startRematch(room)) {
          json(res, 409, { error: "Реванш начнется, когда оба игрока будут в комнате" });
          return;
        }
      } else {
        room.rematchOffer = null;
      }

      touch(room);
      json(res, 200, {
        room: publicRoom(room),
        player: playerForToken(room, body.token),
      });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "shake") {
      const body = await readBody(req);
      const currentPlayer = playerForToken(room, body.token);

      if (!currentPlayer) {
        json(res, 403, { error: "Нет прав потрясти доску" });
        return;
      }

      room.shake = {
        id: crypto.randomBytes(8).toString("hex"),
        from: currentPlayer.color,
        at: Date.now(),
      };
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "reaction") {
      const body = await readBody(req);
      const currentPlayer = playerForToken(room, body.token);
      const text = cleanReaction(body.reaction);

      if (!currentPlayer) {
        json(res, 403, { error: "Нет прав отправить реакцию" });
        return;
      }

      if (!text) {
        json(res, 400, { error: "Такой реакции нет" });
        return;
      }

      room.reaction = {
        id: crypto.randomBytes(8).toString("hex"),
        from: currentPlayer.color,
        name: currentPlayer.name || (currentPlayer.color === "white" ? "Белые" : "Черные"),
        text,
        at: Date.now(),
      };
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "move") {
      const body = await readBody(req);
      const color = body.color;

      if (!["white", "black"].includes(color) || room.players[color] !== body.token) {
        json(res, 403, { error: "Нет прав сделать этот ход" });
        return;
      }

      if (!isRoomReady(room)) {
        json(res, 409, { error: "Партия начнется, когда подключится второй игрок" });
        return;
      }

      const result = CheckersRules.applyMove(room.game, body.move, color);
      if (!result.ok) {
        json(res, 400, { error: result.error });
        return;
      }

      room.game = result.game;
      if (room.game.status === "finished" && room.game.winner) awardWinner(room, room.game.winner);
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "GET" && parts.length === 3) {
      const since = Number(url.searchParams.get("since") || 0);
      const token = url.searchParams.get("token");
      const responsePayload = () => {
        const payload = { room: publicRoom(room) };
        if (token) payload.player = playerForToken(room, token);
        return payload;
      };

      if (!Number.isFinite(since) || room.version > since) {
        json(res, 200, responsePayload());
        return;
      }

      const timeout = setTimeout(() => {
        room.waiters.delete(resolveWait);
        json(res, 200, responsePayload());
      }, 25000);

      function resolveWait() {
        clearTimeout(timeout);
        json(res, 200, responsePayload());
      }

      room.waiters.add(resolveWait);
      req.on("close", () => {
        clearTimeout(timeout);
        room.waiters.delete(resolveWait);
      });
      return;
    }

    notFound(res);
  } catch (error) {
    json(res, 500, { error: error.message || "Server error" });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(
    `Russian checkers ${APP_VERSION} (${INSTANCE_ID}) is running at http://${HOST}:${PORT}`
  );
});
