const API_BASE = 'https://api.w2g.tv';

function requireApiKey() {
  if (!process.env.W2G_API_KEY) {
    throw new Error('W2G_API_KEY is not set');
  }
  return process.env.W2G_API_KEY;
}

async function createRoom(initialUrl) {
  const w2gApiKey = requireApiKey();
  const body = {
    w2g_api_key: w2gApiKey,
  };

  if (initialUrl) {
    body.share = initialUrl;
  }

  const res = await fetch(`${API_BASE}/rooms/create.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create room: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (!data.streamkey) {
    throw new Error('No streamkey returned from Watch2Gether');
  }

  return data.streamkey;
}

async function addToPlaylist(streamkey, url, title) {
  const w2gApiKey = requireApiKey();
  const body = {
    w2g_api_key: w2gApiKey,
    add_items: [
      {
        url,
        title: title || undefined,
      },
    ],
  };

  const res = await fetch(
    `${API_BASE}/rooms/${encodeURIComponent(streamkey)}/playlists/current/playlist_items/sync_update`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to add to playlist: ${res.status} ${text}`);
  }
}

module.exports = {
  createRoom,
  addToPlaylist,
};
