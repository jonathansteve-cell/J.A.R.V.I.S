const axios = require('axios');
const os = require('os');
const { executeAction } = require('./actions');

const history = [];
const MAX_HISTORY = 12;

function remember(role, content) {
  history.push({ role, content });
  while (history.length > MAX_HISTORY) history.shift();
}

async function askGroq(command) {
  if (!process.env.GROQ_API_KEY) {
    return 'Groq is not configured. Add GROQ_API_KEY to .env, or use a supported local command.';
  }

  remember('user', command);
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are J.A.R.V.I.S: concise, capable, and transparent. Never claim an action happened unless the server performed it.' },
        ...history,
      ],
      temperature: 0.4,
    },
    { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } },
  );
  const answer = response.data.choices?.[0]?.message?.content || 'I did not receive a response.';
  remember('assistant', answer);
  return answer;
}

async function handleCommand(command) {
  const action = await executeAction(command);
  if (action) return { mode: 'action', response: action.response, data: action.data || null };

  return {
    mode: 'chat',
    response: await askGroq(command),
    data: { platform: process.platform, hostname: os.hostname() },
  };
}

module.exports = { handleCommand };