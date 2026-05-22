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
const THEMES = new Set(["midnight", "sand", "sky", "lime"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
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
    theme: cleanTheme(theme),
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

function serveStatic(req, res) {
  const rawPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = rawPath === "/" ? "/index.html" : rawPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (!path.extname(filePath)) {
        fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallback) => {
          if (fallbackError) notFound(res);
          else {
            res.writeHead(200, { "content-type": mimeTypes[".html"] });
            res.end(fallback);
          }
        });
        return;
      }
      notFound(res);
      return;
    }

    res.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(content);
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
      const existingColor = body.token
        ? ["white", "black"].find((color) => room.players[color] === body.token)
        : null;

      if (existingColor) {
        if (name) room.playerNames[existingColor] = name;
        touch(room);
        json(res, 200, {
          room: publicRoom(room),
          player: { color: existingColor, token: body.token, name: room.playerNames[existingColor] },
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
      const color = ["white", "black"].find((candidate) => room.players[candidate] === body.token);

      if (!color) {
        json(res, 200, { room: publicRoom(room) });
        return;
      }

      if (room.game.status === "playing" && isRoomReady(room)) {
        const winner = CheckersRules.opponent(color);
        room.game = {
          ...room.game,
          status: "finished",
          winner,
          resignedBy: color,
          message: `${color === "white" ? "Белые" : "Черные"} сдались`,
        };
        room.score[winner] += 1;
      }

      room.players[color] = null;
      room.drawOffer = null;
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "draw-offer") {
      const body = await readBody(req);
      const color = ["white", "black"].find((candidate) => room.players[candidate] === body.token);

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
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "draw-respond") {
      const body = await readBody(req);
      const color = ["white", "black"].find((candidate) => room.players[candidate] === body.token);

      if (!color) {
        json(res, 403, { error: "Нет прав ответить на ничью" });
        return;
      }

      if (!room.drawOffer || room.drawOffer.from === color) {
        json(res, 409, { error: "Нет предложения ничьей" });
        return;
      }

      if (body.accept) {
        room.game = {
          ...room.game,
          status: "finished",
          winner: null,
          drawAccepted: true,
          message: "Ничья по соглашению",
        };
      }

      room.drawOffer = null;
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
      touch(room);
      json(res, 200, { room: publicRoom(room) });
      return;
    }

    if (req.method === "GET" && parts.length === 3) {
      const since = Number(url.searchParams.get("since") || 0);

      if (!Number.isFinite(since) || room.version > since) {
        json(res, 200, { room: publicRoom(room) });
        return;
      }

      const timeout = setTimeout(() => {
        room.waiters.delete(resolveWait);
        json(res, 200, { room: publicRoom(room) });
      }, 25000);

      function resolveWait() {
        clearTimeout(timeout);
        json(res, 200, { room: publicRoom(room) });
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
