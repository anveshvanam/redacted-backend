const rooms = {};

function createRoom(roomId, host) {
  rooms[roomId] = {
    players: [host],
    prompt: "",
    submissions: [],
    votes: {},
    scores: {},
    phase: "LOBBY"
  };
}

function getRoom(roomId) {
  return rooms[roomId];
}

function removePlayer(socketId) {
  for (let roomId in rooms) {
    const room = rooms[roomId];
    room.players = room.players.filter(p => p.id !== socketId);

    if (room.players.length === 0) {
      delete rooms[roomId];
    }
  }
}

module.exports = { createRoom, getRoom, removePlayer };
