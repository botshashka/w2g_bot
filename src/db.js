const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'bot.sqlite');
const dbPath = process.env.SQLITE_PATH || DEFAULT_DB_PATH;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_rooms (
    chat_id INTEGER PRIMARY KEY,
    streamkey TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const getStmt = db.prepare('SELECT chat_id, streamkey, updated_at FROM chat_rooms WHERE chat_id = ?');
const setStmt = db.prepare(`
  INSERT INTO chat_rooms (chat_id, streamkey, updated_at)
  VALUES (@chat_id, @streamkey, @updated_at)
  ON CONFLICT(chat_id) DO UPDATE SET
    streamkey = excluded.streamkey,
    updated_at = excluded.updated_at
`);

function getRoom(chatId) {
  return getStmt.get(chatId) || null;
}

function setRoom(chatId, streamkey) {
  const now = Math.floor(Date.now() / 1000);
  setStmt.run({ chat_id: chatId, streamkey, updated_at: now });
}

module.exports = {
  getRoom,
  setRoom,
  db,
};
