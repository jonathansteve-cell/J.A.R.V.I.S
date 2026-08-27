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
- `type hello world` types into the active desktop window when `xdotool` is installed.
- `press ctrl+l`, `click at 500 300`, and `move mouse to 500 300` control the active desktop when supported.
- `read file /path/to/file.txt` reads a text file; `write file /path/to/file.txt with content` requires a follow-up `confirm`.
- `shutdown`, `restart`, `sleep`, and `lock` require a follow-up `confirm` and `ALLOW_POWER_ACTIONS=true`.
- `wake my pc` sends a Wake-on-LAN packet when `PC_MAC_ADDRESS` is configured.
- `send WhatsApp to +15551234567: hello` uses Twilio when configured.
- `spotify play`, `spotify pause`, or `spotify next` uses a Spotify token when configured.
- `word add this to my document` appends to `jarvis-document.txt`.

Email, Calendar, Zoom, Spotify, and WhatsApp require their own OAuth/API
credentials. Destructive power actions remain disabled by default. J.A.R.V.I.S
does not claim an action succeeded unless the server actually performed it.

Desktop input uses `xdotool` on Linux. A powered-off PC cannot be started by
software alone; Wake-on-LAN requires BIOS, network-adapter, power, and router
configuration. The browser must be served by the local backend for PC control
to work.

## API

- `GET /api/health` reports server and Groq configuration status.
- `POST /api/command` accepts `{ "command": "system info" }`.
- `WS /ws` broadcasts processing and completion events.
Sophisticated AI interface with complex orb structure, golden-brown theme, and mathematical precision orbital elements
