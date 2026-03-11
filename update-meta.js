exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = event.headers['x-api-key'];
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'API key inválida' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const prompt = `Usá web_search para buscar los datos más recientes del meta competitivo de Pokémon TCG Standard en LimitlessTCG.

Buscá en:
- https://limitlesstcg.com/tournaments (torneos recientes)  
- https://limitlesstcg.com/decks?format=standard (meta actual)

Respondé SOLO con este JSON exacto, sin markdown ni texto adicional:
{
  "latest_tournament": "nombre del torneo más reciente",
  "tournament_date": "fecha",
  "tournament_players": número,
  "top8": [
    {"place": "1st", "player": "nombre", "deck": "deck"},
    {"place": "2nd", "player": "nombre", "deck": "deck"},
    {"place": "3rd", "player": "nombre", "deck": "deck"},
    {"place": "4th", "player": "nombre", "deck": "deck"},
    {"place": "5th", "player": "nombre", "deck": "deck"},
    {"place": "6th", "player": "nombre", "deck": "deck"},
    {"place": "7th", "player": "nombre", "deck": "deck"},
    {"place": "8th", "player": "nombre", "deck": "deck"}
  ],
  "meta_top10": [
    {"rank": 1, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "S"},
    {"rank": 2, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "A"},
    {"rank": 3, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "A"},
    {"rank": 4, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "A"},
    {"rank": 5, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "A"},
    {"rank": 6, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "B"},
    {"rank": 7, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "B"},
    {"rank": 8, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "B"},
    {"rank": 9, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "B"},
    {"rank": 10, "name": "Deck", "usage": "X.XX%", "winrate": XX.XX, "tier": "B"}
  ],
  "total_tournaments": número,
  "total_players": número,
  "champion": "nombre",
  "champion_deck": "deck",
  "changes_detected": ["cambio 1", "cambio 2"],
  "meta_summary": "resumen en español 2-3 frases"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: err.error?.message || `HTTP ${response.status}` })
      };
    }

    const data = await response.json();
    const texts = data.content.filter(b => b.type === 'text').map(b => b.text);
    const text = texts[texts.length - 1] || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo parsear la respuesta' }) };
    }

    const result = JSON.parse(match[0]);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
