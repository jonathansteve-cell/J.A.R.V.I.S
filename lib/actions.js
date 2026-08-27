const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');

const execFileAsync = promisify(execFile);
const workspace = path.resolve(process.env.JARVIS_WORKSPACE || process.cwd());
const appCommands = { chrome: 'google-chrome', firefox: 'firefox', code: 'code', vscode: 'code', calculator: 'gnome-calculator' };

async function openApplication(name) {
  const command = appCommands[name.toLowerCase()];
  if (!command) return `I can only launch configured applications: ${Object.keys(appCommands).join(', ')}.`;
  try {
    await execFileAsync(command, [], { detached: true, windowsHide: true });
    return `Launching ${name}.`;
  } catch {
    return `I could not launch ${name}. Add its executable to the application allowlist.`;
  }
}

async function executeAction(command) {
  const normalized = command.toLowerCase();
  if (/^(system info|system status|how is the system)/.test(normalized)) {
    return { response: `CPU load ${os.loadavg()[0].toFixed(2)}, ${Math.round(os.freemem() / 1024 ** 3)} GB memory available on ${os.platform()}.`, data: { load: os.loadavg(), freeMemory: os.freemem() } };
  }

  const openMatch = normalized.match(/^(?:open|launch|start)\s+(.+)$/);
  if (openMatch) return { response: await openApplication(openMatch[1]) };

  if (/^(?:list|show) files/.test(normalized)) {
    const entries = await fs.readdir(workspace, { withFileTypes: true });
    return { response: `${entries.length} workspace entries found.`, data: entries.map((entry) => ({ name: entry.name, directory: entry.isDirectory() })) };
  }

  const createMatch = command.match(/^create (?:a )?file (.+?) with (.+)$/i);
  if (createMatch) {
    const target = path.resolve(workspace, createMatch[1]);
    if (!target.startsWith(`${workspace}${path.sep}`)) return { response: 'For safety, files must stay inside the configured workspace.' };
    await fs.writeFile(target, createMatch[2], 'utf8');
    return { response: `Created ${path.relative(workspace, target)}.` };
  }

  if (/^(shutdown|restart|sleep|lock)/.test(normalized)) {
    return { response: 'Power actions are disabled by default. Set ALLOW_POWER_ACTIONS=true and add a confirmation flow before enabling them.' };
  }

  if (normalized.startsWith('send whatsapp')) return sendWhatsApp(command);
  if (normalized.startsWith('send email')) return sendEmail(command);
  if (normalized.startsWith('spotify')) return spotify(command);
  if (normalized.startsWith('calendar')) return calendar(command);
  if (normalized.startsWith('zoom')) return { response: 'Zoom integration is ready for a meeting URL; provide `ZOOM_URL` or a URL in the command.' };
  if (normalized.startsWith('word')) return word(command);
  return null;
}

async function sendWhatsApp(command) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) return { response: 'WhatsApp is not configured. Add Twilio credentials to .env.' };
  const match = command.match(/to\s+(\+?[\d]+)\s*:\s*(.+)$/i);
  if (!match) return { response: 'Use: send WhatsApp to +15551234567: your message.' };
  const body = new URLSearchParams({ From: process.env.TWILIO_WHATSAPP_FROM, To: `whatsapp:${match[1]}`, Body: match[2] });
  await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, body, { auth: { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN } });
  return { response: 'WhatsApp message sent.' };
}

async function sendEmail(command) {
  return { response: process.env.GMAIL_ACCESS_TOKEN ? 'Email transport is configured, but the command needs recipient, subject, and body fields.' : 'Email is not configured. Add a Gmail OAuth access token and sender address to .env.' };
}

async function spotify(command) {
  if (!process.env.SPOTIFY_ACCESS_TOKEN) return { response: 'Spotify is not configured. Add a Spotify OAuth access token to .env.' };
  const action = command.replace(/^spotify\s*/i, '').trim().toLowerCase();
  const endpoint = action === 'pause' ? 'pause' : action === 'next' ? 'next' : 'play';
  await axios.put(`https://api.spotify.com/v1/me/player/${endpoint}`, {}, { headers: { Authorization: `Bearer ${process.env.SPOTIFY_ACCESS_TOKEN}` } });
  return { response: `Spotify ${endpoint} command sent.` };
}

async function calendar() {
  return { response: process.env.GOOGLE_ACCESS_TOKEN ? 'Calendar authentication is configured; event parsing is the next integration step.' : 'Calendar is not configured. Add a Google OAuth access token to .env.' };
}

async function word(command) {
  const documentPath = path.join(workspace, 'jarvis-document.txt');
  await fs.appendFile(documentPath, `${command}\n`, 'utf8');
  return { response: 'Saved the Word-compatible note to jarvis-document.txt. Install a document library to generate .docx files.' };
}

module.exports = { executeAction };