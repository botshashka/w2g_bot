# Watch2Gether Telegram Bot

Minimal Telegram bot that keeps one Watch2Gether (W2G) room per chat (DMs or groups). When someone mentions the bot with a URL, it adds that URL to the room’s playlist and replies with the room link.

## Features
- One W2G room per Telegram chat (group or DM), stored in SQLite.
- Add URLs via mention reply, inline mention, or direct message.
- Commands: `/room`, `/clear`, `/help`.
- Long polling only (no webhook).

## Setup
1. Copy `.env.example` to `.env` and fill in:
   - `TELEGRAM_BOT_TOKEN` – Bot token from @BotFather.
   - `BOT_USERNAME` – Bot username without the leading @.
   - `W2G_API_KEY` – Watch2Gether API key.
   - `SQLITE_PATH` – Optional path for the SQLite file (defaults to `./data/bot.sqlite`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the bot:
   ```bash
   npm start
   ```

## Usage
- **Groups**
  - Reply to a message containing a URL with `@<BOT_USERNAME>` (extra text optional).
  - Or write `@<BOT_USERNAME> <url>`.
- **Direct messages**
  - Send any message that contains a URL (no mention needed).
- **Commands**
  - `/room` – show (and create if missing) the room link for this chat.
  - `/clear` – reset with a new room for this chat.
  - `/help` – usage instructions.

Replies are short, e.g.:
```
Added ✅
Room: https://w2g.tv/rooms/<streamkey>
```
