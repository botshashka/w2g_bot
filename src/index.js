require('dotenv').config();
const { Telegraf } = require('telegraf');
const { getRoom, setRoom } = require('./db');
const { createRoom, addToPlaylist } = require('./w2g');

const token = process.env.TELEGRAM_BOT_TOKEN;
const botUsername = (process.env.BOT_USERNAME || '').replace('@', '').toLowerCase();

if (!token || !botUsername || !process.env.W2G_API_KEY) {
  console.error('Missing required env vars: TELEGRAM_BOT_TOKEN, BOT_USERNAME, W2G_API_KEY');
  process.exit(1);
}

const bot = new Telegraf(token, { handlerTimeout: 30_000 });

function getText(message) {
  return message?.text || message?.caption || '';
}

function extractFromEntities(message) {
  if (!message) return null;
  const text = getText(message);
  const entities = message.entities || message.caption_entities || [];

  for (const entity of entities) {
    if (entity.type === 'url') {
      const urlText = text.substring(entity.offset, entity.offset + entity.length);
      if (urlText) return urlText;
    }
    if (entity.type === 'text_link' && entity.url) {
      return entity.url;
    }
  }

  return null;
}

function extractFromText(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0] : null;
}

function validateCandidate(url) {
  if (!url) return { url: null, invalid: false };
  try {
    return { url: new URL(url).toString(), invalid: false };
  } catch {
    return { url: null, invalid: true };
  }
}

function findUrl(ctx) {
  const msg = ctx.message;
  const reply = msg?.reply_to_message;

  const candidates = [
    extractFromEntities(msg),
    reply ? extractFromEntities(reply) : null,
    extractFromText(getText(msg)),
    reply ? extractFromText(getText(reply)) : null,
  ];

  for (const raw of candidates) {
    const result = validateCandidate(raw);
    if (result.url) return result;
    if (result.invalid) return result;
  }

  return { url: null, invalid: false };
}

function messageMentionsBot(message) {
  if (!message) return false;
  const mentionTag = `@${botUsername}`;
  const text = getText(message);
  const entities = message.entities || message.caption_entities || [];

  for (const entity of entities) {
    if (entity.type === 'mention') {
      const mention = text.substring(entity.offset, entity.offset + entity.length);
      if (mention.toLowerCase() === mentionTag) return true;
    }
  }

  return text.toLowerCase().includes(mentionTag);
}

async function ensureRoom(chatId, initialUrl) {
  const existing = getRoom(chatId);
  if (existing?.streamkey) {
    return existing.streamkey;
  }

  const streamkey = await createRoom(initialUrl);
  setRoom(chatId, streamkey);
  return streamkey;
}

function buildRoomLink(streamkey) {
  return `https://w2g.tv/rooms/${streamkey}`;
}

bot.start(async (ctx) => {
  await ctx.reply('Send me a link and I will add it to your Watch2Gether room. Try /help for details.');
});

bot.command('help', async (ctx) => {
  const helpText = [
    'Add links to your Watch2Gether room for this chat.',
    '',
    'Groups:',
    `- Reply with @${botUsername} to a message that has a URL`,
    `- Or write @${botUsername} <url>`,
    '',
    'DMs:',
    '- Send any message with a URL',
    '',
    'Commands:',
    '/room - show the room link',
    '/clear - reset with a new room',
  ].join('\n');

  await ctx.reply(helpText);
});

bot.command('room', async (ctx) => {
  try {
    const streamkey = await ensureRoom(ctx.chat.id);
    await ctx.reply(`Room: ${buildRoomLink(streamkey)}`);
  } catch (err) {
    console.error('Error handling /room', err);
    await ctx.reply('Couldn’t load the room (W2G error). Try again.');
  }
});

bot.command('clear', async (ctx) => {
  try {
    const streamkey = await createRoom();
    setRoom(ctx.chat.id, streamkey);
    await ctx.reply(`Queue cleared ✅\nRoom: ${buildRoomLink(streamkey)}`);
  } catch (err) {
    console.error('Error handling /clear', err);
    await ctx.reply('Couldn’t clear the queue (W2G error). Try again.');
  }
});

bot.on('text', async (ctx) => {
  // Ignore commands here, handled above.
  const entities = ctx.message.entities || [];
  if (entities.some((e) => e.type === 'bot_command')) {
    return;
  }

  const chatType = ctx.chat?.type;
  if (chatType !== 'private' && !messageMentionsBot(ctx.message)) {
    return;
  }

  const { url, invalid } = findUrl(ctx);
  if (invalid && !url) {
    await ctx.reply('That doesn’t look like a valid URL.');
    return;
  }
  if (!url) {
    await ctx.reply('Send me a link to add. Try /help');
    return;
  }

  const chatId = ctx.chat.id;

  try {
    const streamkey = await ensureRoom(chatId);
    await addToPlaylist(streamkey, url);
    await ctx.reply(`Added ✅\nRoom: ${buildRoomLink(streamkey)}`);
  } catch (err) {
    console.error('Error adding URL', err);
    await ctx.reply('Couldn’t add that (W2G error). Try again.');
  }
});

bot.catch((err, ctx) => {
  console.error('Bot error', err, ctx.updateType);
});

bot.launch().then(() => {
  console.log('Bot started with long polling');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
