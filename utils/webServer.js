/**
 * @fileoverview Web Studio Server for VibeSMS.
 * Real-time SSE live stream, Dark/Light theme, 1-click OTP copy,
 * virtual phone number picker, and SMS simulator.
 *
 * Curated by Arham Eskafi (https://arham.dev) - Walk Cook Live
 */

import http from "http";
import {
  getMessages,
  getMessageById,
  clearMessages,
  getNumbers,
  addNumber,
  saveMessage,
  eventBus
} from "./storage.js";
import { handleWebhookRequest } from "./webhookReceiver.js";

function getHtmlTemplate() {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VibeSMS | Autonomous Disposable SMS & OTP Studio</title>
  <style>
    :root[data-theme="dark"] {
      --bg: #0b0f19;
      --card-bg: #131b2e;
      --card-hover: #1a253e;
      --border: #23314a;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0284c7;
      --accent: #a855f7;
      --success: #10b981;
      --danger: #ef4444;
      --otp-bg: #fef08a;
      --otp-text: #854d0e;
    }

    :root[data-theme="light"] {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-hover: #f1f5f9;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --primary: #0284c7;
      --primary-hover: #0369a1;
      --accent: #9333ea;
      --success: #059669;
      --danger: #dc2626;
      --otp-bg: #fef9c3;
      --otp-text: #713f12;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 24px;
      transition: background 0.2s, color 0.2s;
    }

    .container { max-width: 1150px; margin: 0 auto; }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand-wrap h1 {
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge {
      background: rgba(168, 85, 247, 0.15);
      color: var(--accent);
      font-size: 0.72rem;
      padding: 3px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(168, 85, 247, 0.3);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .header-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.85rem;
      margin-right: 14px;
      transition: color 0.2s;
    }
    .header-links a:hover { color: var(--primary); }

    .btn {
      cursor: pointer;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-pri { background: var(--primary); color: #090d16; }
    .btn-pri:hover { background: var(--primary-hover); color: #fff; }

    .btn-sec { background: rgba(125, 125, 125, 0.12); color: var(--text); border-color: var(--border); }
    .btn-sec:hover { background: rgba(125, 125, 125, 0.2); }

    .btn-dan { background: rgba(239, 68, 68, 0.12); color: var(--danger); border-color: rgba(239, 68, 68, 0.3); }
    .btn-dan:hover { background: var(--danger); color: #fff; }

    /* Studio Layout */
    .studio-grid {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 22px;
      min-height: 520px;
    }

    @media (max-width: 860px) {
      .studio-grid { grid-template-columns: 1fr; }
    }

    .panel {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-head {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.95rem;
      font-weight: 700;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      display: inline-block;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* Numbers List */
    .number-item {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.15s;
    }
    .number-item:hover, .number-item.active { background: var(--card-hover); }

    .num-title { font-size: 0.88rem; font-weight: 700; color: var(--text); }
    .num-sub { font-size: 0.75rem; color: var(--text-muted); }

    /* Feed Panel */
    .feed-scroll {
      flex: 1;
      overflow-y: auto;
      max-height: 580px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .sms-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      transition: transform 0.15s, border-color 0.15s;
    }
    .sms-card:hover { border-color: var(--primary); transform: translateY(-1px); }

    .sms-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .sms-sender { font-weight: 700; color: var(--primary); }

    .sms-body {
      font-size: 0.92rem;
      color: var(--text);
      line-height: 1.45;
      margin-bottom: 12px;
      word-break: break-word;
    }

    .otp-banner {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--otp-bg);
      color: var(--otp-text);
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .otp-code {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 1.1rem;
      letter-spacing: 2px;
    }

    .copy-chip {
      background: rgba(0, 0, 0, 0.1);
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .copy-chip:hover { background: rgba(0, 0, 0, 0.2); }

    .empty-state {
      padding: 60px 24px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    footer {
      text-align: center;
      padding: 32px 0 10px;
      font-size: 0.85rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      margin-top: 40px;
    }
    footer a { color: var(--primary); text-decoration: none; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-wrap">
        <h1>⚡ VibeSMS <span class="badge">Autonomous OTP Studio</span></h1>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="header-links">
          <a href="https://arham.dev" target="_blank" rel="noopener">Arham Eskafi</a>
          <a href="https://youtube.com/@walkcooklive" target="_blank" rel="noopener">Walk Cook Live</a>
          <a href="https://github.com/aeskafi/vibesms" target="_blank" rel="noopener">GitHub</a>
        </div>
        <button class="btn btn-sec" onclick="simulateTestSms()">🧪 Simulate Test SMS</button>
        <button class="btn btn-sec" onclick="toggleTheme()">🌓 Theme</button>
      </div>
    </header>

    <div class="studio-grid">
      <!-- Numbers Panel -->
      <div class="panel">
        <div class="panel-head">
          <span>📱 Virtual Numbers</span>
          <button class="btn btn-sec" style="padding:4px 8px; font-size:0.75rem;" onclick="copyActiveNumber()">📋 Copy</button>
        </div>
        <div id="numbersList">
          <!-- Rendered numbers -->
        </div>
      </div>

      <!-- Live SMS Feed Panel -->
      <div class="panel">
        <div class="panel-head">
          <span id="feedTitle">📬 Inbound Messages (0)</span>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <span class="pulse-dot"></span>
              <span>Live Webhook Stream</span>
            </div>
            <button class="btn btn-dan" style="padding:4px 8px; font-size:0.75rem;" onclick="clearAllMessages()">🧹 Clear</button>
          </div>
        </div>

        <div class="feed-scroll" id="smsFeed">
          <div class="empty-state">
            Waiting for incoming SMS webhooks...<br>
            Post to <code>/api/sms/inbound</code> or click <b>"🧪 Simulate Test SMS"</b>
          </div>
        </div>
      </div>
    </div>

    <footer>
      Curated by <a href="https://arham.dev" target="_blank" rel="noopener">Arham Eskafi</a> • Overland Tech Nomad on <a href="https://youtube.com/@walkcooklive" target="_blank" rel="noopener">Walk Cook Live</a> • Open Source Rapid MVP Tools
    </footer>
  </div>

  <script>
    let numbers = [];
    let selectedNumber = null;
    let messages = [];

    function playChime() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        osc.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.18); // E6
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch (e) {}
    }

    function toggleTheme() {
      const root = document.documentElement;
      const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nextTheme);
      localStorage.setItem('vibesms_theme', nextTheme);
    }

    const savedTheme = localStorage.getItem('vibesms_theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

    async function loadNumbers() {
      try {
        const res = await fetch('/api/numbers');
        numbers = await res.json();
        if (numbers.length > 0 && !selectedNumber) selectedNumber = numbers[0].rawNumber;
        renderNumbers();
      } catch (e) {}
    }

    function renderNumbers() {
      const container = document.getElementById('numbersList');
      container.innerHTML = numbers.map(n => \`
        <div class="number-item \${n.rawNumber === selectedNumber ? 'active' : ''}" onclick="selectNumber('\${n.rawNumber}')">
          <div>
            <div class="num-title">\${n.flag || '🌐'} \${n.number}</div>
            <div class="num-sub">\${n.country}</div>
          </div>
          <button class="copy-chip" onclick="event.stopPropagation(); copyText('\${n.rawNumber}')">Copy</button>
        </div>
      \`).join('');
    }

    function selectNumber(raw) {
      selectedNumber = raw;
      renderNumbers();
      loadMessages();
    }

    function copyActiveNumber() {
      if (selectedNumber) copyText(selectedNumber);
    }

    async function loadMessages() {
      try {
        const url = selectedNumber ? \`/api/messages?to=\${encodeURIComponent(selectedNumber)}\` : '/api/messages';
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) {
          if (data.length > messages.length && messages.length > 0) playChime();
          messages = data;
          renderMessages();
        }
      } catch (e) {}
    }

    function renderMessages() {
      document.getElementById('feedTitle').innerText = \`📬 Inbound Messages (\${messages.length})\`;
      const container = document.getElementById('smsFeed');
      if (messages.length === 0) {
        container.innerHTML = '<div class="empty-state">No messages received for this number yet.<br>Click "🧪 Simulate Test SMS" above to test!</div>';
        return;
      }

      container.innerHTML = messages.map(m => \`
        <div class="sms-card">
          <div class="sms-meta">
            <span class="sms-sender">From: \${escapeHtml(m.from)}</span>
            <span>\${new Date(m.createdAt).toLocaleTimeString()}</span>
          </div>
          <div class="sms-body">\${escapeHtml(m.body)}</div>
          \${m.otp ? \`
            <div class="otp-banner">
              <span>🔑 Verification Code:</span>
              <span class="otp-code">\${escapeHtml(m.otp)}</span>
              <button class="copy-chip" onclick="copyText('\${m.otp}')">📋 Copy Code</button>
            </div>
          \` : ''}
        </div>
      \`).join('');
    }

    async function simulateTestSms() {
      const code = Math.floor(100000 + Math.random() * 900000);
      const target = selectedNumber || '+12025550199';
      await fetch('/api/sms/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'GoogleAuth',
          to: target,
          body: \`G-\${code} is your Google verification code. Never share your passcode.\`
        })
      });
    }

    async function clearAllMessages() {
      if (!confirm('Clear all messages?')) return;
      await fetch('/api/messages', { method: 'DELETE' });
      messages = [];
      renderMessages();
    }

    function copyText(str) {
      navigator.clipboard.writeText(str).then(() => alert('Copied: ' + str));
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Connect SSE
    function initSse() {
      const sse = new EventSource('/api/events');
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_sms' || data.type === 'sms_cleared') {
            loadMessages();
          }
        } catch (e) {}
      };
    }

    loadNumbers();
    loadMessages();
    initSse();
  </script>
</body>
</html>`;
}

export function startWebServer(options = {}) {
  const port = options.port || process.env.PORT || 4000;
  const host = options.host || "0.0.0.0";

  const sseClients = new Set();

  eventBus.on("new_sms", (sms) => {
    const payload = JSON.stringify({ type: "new_sms", message: sms });
    for (const client of sseClients) {
      client.write(`data: ${payload}\n\n`);
    }
  });

  eventBus.on("sms_cleared", () => {
    const payload = JSON.stringify({ type: "sms_cleared" });
    for (const client of sseClients) {
      client.write(`data: ${payload}\n\n`);
    }
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    // Main Web Studio HTML
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getHtmlTemplate());
      return;
    }

    // SSE Real-Time Stream
    if (req.method === "GET" && url.pathname === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write("data: {}\n\n");
      sseClients.add(res);

      req.on("close", () => {
        sseClients.delete(res);
      });
      return;
    }

    // Inbound Webhooks
    if (req.method === "POST" && url.pathname.startsWith("/api/sms/")) {
      return handleWebhookRequest(req, res, url);
    }

    // Virtual Numbers
    if (req.method === "GET" && url.pathname === "/api/numbers") {
      const numbers = await getNumbers();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(numbers));
      return;
    }

    // Inbound Messages List
    if (req.method === "GET" && url.pathname === "/api/messages") {
      const toFilter = url.searchParams.get("to");
      const messages = await getMessages(toFilter);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(messages));
      return;
    }

    // Clear Messages
    if (req.method === "DELETE" && url.pathname === "/api/messages") {
      await clearMessages();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  server.listen(port, host, () => {
    console.log(`\n======================================================`);
    console.log(`⚡ VibeSMS Autonomous Web Studio running at:`);
    console.log(`   http://localhost:${port}`);
    console.log(`======================================================\n`);
  });

  return server;
}
