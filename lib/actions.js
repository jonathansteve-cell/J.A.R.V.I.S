const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const dgram = require('dgram');
const { execFile } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');

const execFileAsync = promisify(execFile);
const workspace = path.resolve(process.env.JARVIS_WORKSPACE || process.cwd());
const appCommands = { chrome: 'google-chrome', firefox: 'firefox', code: 'code', vscode: 'code', calculator: 'gnome-calculator' };
let pendingDangerousAction = null;

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
  if (pendingDangerousAction && /^(confirm|yes|proceed|do it)$/i.test(command.trim())) {
    const action = pendingDangerousAction;
    pendingDangerousAction = null;
    if (action.type === 'write') {
      await fs.writeFile(path.resolve(action.fileName), action.content, 'utf8');
      return { response: `Wrote ${action.fileName}.` };
    }
    return { response: await performPowerAction(action.action) };
  }

  const typingMatch = command.match(/^(?:type|write)\s+(.+)$/i);
  if (typingMatch) return { response: await desktopAction('type', [typingMatch[1]]) };
  const keyMatch = command.match(/^press\s+(.+)$/i);
  if (keyMatch) return { response: await desktopAction('key', [keyMatch[1]]) };
  const clickMatch = command.match(/^click(?: at)?\s+(\d+)\s+(\d+)$/i);
  if (clickMatch) return { response: await desktopAction('click', clickMatch.slice(1, 3)) };
  const moveMatch = command.match(/^move mouse to\s+(\d+)\s+(\d+)$/i);
  if (moveMatch) return { response: await desktopAction('move', moveMatch.slice(1, 3)) };

  const readMatch = command.match(/^read file\s+(.+)$/i);
  if (readMatch) return readArbitraryFile(readMatch[1]);
  const writeMatch = command.match(/^write file\s+(.+?)\s+with\s+([\s\S]+)$/i);
  if (writeMatch) return writeArbitraryFile(writeMatch[1], writeMatch[2]);

  if (/^(wake|turn on|power on) (?:my )?pc/.test(normalized)) return wakeComputer();

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

  if (/^(shutdown|restart|sleep|lock)/.test(normalized)) return requestPowerAction(normalized.split(/\s+/)[0]);

  if (normalized.startsWith('send whatsapp')) return sendWhatsApp(command);
  if (normalized.startsWith('send email')) return sendEmail(command);
  if (normalized.startsWith('spotify')) return spotify(command);
  if (normalized.startsWith('calendar')) return calendar(command);
  if (normalized.startsWith('zoom')) return { response: 'Zoom integration is ready for a meeting URL; provide `ZOOM_URL` or a URL in the command.' };
  if (normalized.startsWith('word')) return word(command);
  return null;
}

async function desktopAction(action, args) {
  if (process.platform === 'linux') {
    const executable = action === 'type' ? 'xdotool' : 'xdotool';
    const commandArgs = action === 'type' ? ['type', '--clearmodifiers', args[0]] : action === 'key' ? ['key', args[0].replace(/\s+/g, '+')] : action === 'click' ? ['mousemove', args[0], args[1], 'click', '1'] : ['mousemove', args[0], args[1]];
    try {
      await execFileAsync(executable, commandArgs);
      return `${action === 'type' ? 'Text entered' : `Mouse or keyboard action ${action} completed`}.`;
    } catch {
      return 'Desktop control needs xdotool on Linux. Install it with your system package manager and run J.A.R.V.I.S on the logged-in desktop.';
    }
  }
  if (process.platform === 'win32') return 'Windows desktop control requires the PowerShell desktop adapter; this environment is not Windows.';
  return 'Desktop control is not implemented for this operating system.';
}

async function readArbitraryFile(fileName) {
  try {
    const content = await fs.readFile(path.resolve(fileName.trim()), 'utf8');
    return { response: `Read ${content.length} characters from ${fileName}.`, data: { path: path.resolve(fileName.trim()), content: content.slice(0, 20000) } };
  } catch (error) {
    return { response: `I could not read ${fileName}: ${error.code || error.message}.` };
  }
}

async function writeArbitraryFile(fileName, content) {
  pendingDangerousAction = { type: 'write', fileName: fileName.trim(), content };
  return { response: `This will overwrite ${fileName.trim()}. Say confirm to continue.` };
}

async function performPowerAction(action) {
  if (process.env.ALLOW_POWER_ACTIONS !== 'true') return 'Power actions remain disabled. Set ALLOW_POWER_ACTIONS=true only on a machine you control.';
  const commands = process.platform === 'win32' ? { shutdown: ['shutdown', ['/s', '/t', '0']], restart: ['shutdown', ['/r', '/t', '0']], sleep: ['rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']], lock: ['rundll32.exe', ['user32.dll,LockWorkStation']] } : { shutdown: ['shutdown', ['-h', 'now']], restart: ['shutdown', ['-r', 'now']], sleep: ['systemctl', ['suspend']], lock: ['loginctl', ['lock-session']] };
  const selected = commands[action];
  if (!selected) return 'Unknown power action.';
  await execFileAsync(selected[0], selected[1]);
  return `${action} command sent.`;
}

function requestPowerAction(action) {
  pendingDangerousAction = { type: 'power', action };
  return { response: `${action} is a destructive power action. Say confirm to continue.` };
}

async function wakeComputer() {
  const mac = process.env.PC_MAC_ADDRESS;
  if (!mac) return { response: 'Wake-on-LAN is not configured. Add PC_MAC_ADDRESS to .env and enable Wake-on-LAN in BIOS and the network adapter.' };
  const bytes = mac.split(/[:-]/).map((part) => Number.parseInt(part, 16));
  if (bytes.length !== 6 || bytes.some(Number.isNaN)) return { response: 'PC_MAC_ADDRESS must contain six hexadecimal pairs.' };
  const packet = Buffer.concat([Buffer.alloc(6, 0xff), ...Array.from({ length: 16 }, () => Buffer.from(bytes))]);
  const socket = dgram.createSocket('udp4');
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.bind(() => socket.setBroadcast(true)); socket.send(packet, 0, packet.length, 9, process.env.PC_BROADCAST || '255.255.255.255', (error) => { socket.close(); error ? reject(error) : resolve(); }); });
  return { response: 'Wake-on-LAN packet sent. The PC must support Wake-on-LAN and be connected to power and the network.' };
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