require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const pool = require("./db");

const { createRoom, getRoom, removePlayer } = require("./game/gameManager");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/admin", adminRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

/* Utility */
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7);
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

/* SOCKET LOGIC */
io.on("connection", (socket) => {

  /* Create Room */
  socket.on("create_room", ({ username }, callback) => {
    const roomId = generateRoomCode();

    const player = { id: socket.id, username };

    createRoom(roomId, player);
    socket.join(roomId);

    callback({ roomId });
  });

  /* Join Room */
  socket.on("join_room", ({ roomId, username }, callback) => {
    const room = getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });

    const player = { id: socket.id, username };
    room.players.push(player);

    socket.join(roomId);
    io.to(roomId).emit("update_players", room.players);

    callback({ success: true });
  });

  /* Start Round */
  socket.on("start_round", async ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;

    room.phase = "WRITING";
    room.submissions = [];
    room.votes = {};

    const result = await pool.query(
      "SELECT * FROM prompts WHERE is_active = true ORDER BY RANDOM() LIMIT 1"
    );

    room.prompt = result.rows[0]?.text || "No prompts available";

    io.to(roomId).emit("round_started", {
      prompt: room.prompt
    });
  });

  /* Submit Answer */
  socket.on("submit_answer", ({ roomId, text }) => {
    const room = getRoom(roomId);
    if (!room || room.phase !== "WRITING") return;

    if (room.submissions.find(s => s.authorId === socket.id)) return;

    const submission = {
      submissionId: generateId(),
      text,
      authorId: socket.id,
      votes: 0
    };

    room.submissions.push(submission);

    if (room.submissions.length === room.players.length) {
      room.phase = "VOTING";

      const anonymous = room.submissions.map(s => ({
        submissionId: s.submissionId,
        text: s.text
      }));

      io.to(roomId).emit("start_voting", anonymous);
    }
  });

  /* Vote */
  socket.on("vote", ({ roomId, submissionId }) => {
    const room = getRoom(roomId);
    if (!room || room.phase !== "VOTING") return;

    if (room.votes[socket.id]) return;

    const submission = room.submissions.find(
      s => s.submissionId === submissionId
    );

    if (!submission || submission.authorId === socket.id) return;

    submission.votes += 1;
    room.votes[socket.id] = submissionId;

    if (Object.keys(room.votes).length === room.players.length) {
      endRound(roomId);
    }
  });

  socket.on("disconnect", () => {
    removePlayer(socket.id);
  });
});

/* End Round */
function endRound(roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  room.phase = "RESULTS";

  const winner = room.submissions.reduce((prev, current) =>
    current.votes > prev.votes ? current : prev
  );

  if (!room.scores[winner.authorId]) {
    room.scores[winner.authorId] = 0;
  }

  room.scores[winner.authorId] += 1;

  io.to(roomId).emit("round_results", {
    submissions: room.submissions,
    winnerId: winner.authorId,
    scores: room.scores
  });
}
app.get("/", (req, res) => {
  res.send("Game backend is running 🚀");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


server.listen(process.env.PORT || 5000, () =>
  console.log("Server running...")
);
