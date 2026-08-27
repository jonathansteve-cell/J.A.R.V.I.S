# J.A.R.V.I.S

J.A.R.V.I.S is a browser control panel backed by a Node.js command server. It
supports browser speech recognition, spoken responses, Groq chat, WebSocket
activity updates, guarded local actions, and opt-in integration adapters.

## Run It

```bash
npm install
cp .env.example .env
# Set GROQ_API_KEY in .env if you want AI chat.
npm start
```

Open `http://localhost:3000`. Click the microphone and allow browser microphone
access. The browser handles speech-to-text and text-to-speech; the server handles
AI requests and actions.

## Working Commands

- `open chrome`, `open code`, or `open firefox` launch configured applications.
- `system info` reports basic host statistics.
- `list files` lists the configured workspace.
- `create file notes.txt with hello` creates a file inside that workspace.
- `send WhatsApp to +15551234567: hello` uses Twilio when configured.
- `spotify play`, `spotify pause`, or `spotify next` uses a Spotify token when configured.
- `word add this to my document` appends to `jarvis-document.txt`.

Email, Calendar, Zoom, Spotify, and WhatsApp require their own OAuth/API
credentials. Destructive power actions remain disabled by default. J.A.R.V.I.S
does not claim an action succeeded unless the server actually performed it.

## API

- `GET /api/health` reports server and Groq configuration status.
- `POST /api/command` accepts `{ "command": "system info" }`.
- `WS /ws` broadcasts processing and completion events.
Sophisticated AI interface with complex orb structure, golden-brown theme, and mathematical precision orbital elements
