/**
 * @fileoverview Webhook Receiver & SMS Ingestion Engine for VibeSMS.
 * Supports standard JSON, Twilio TwiML webhooks, and Telnyx event formats.
 *
 * Curated by Arham Eskafi (https://arham.dev) - Walk Cook Live
 */

import { saveMessage } from "./storage.js";

/**
 * Handle incoming SMS webhook request
 */
export async function handleWebhookRequest(req, res, url) {
  let bodyBuffer = "";

  req.on("data", (chunk) => {
    bodyBuffer += chunk;
  });

  req.on("end", async () => {
    try {
      const contentType = req.headers["content-type"] || "";
      let parsed = {};

      if (contentType.includes("application/json")) {
        parsed = JSON.parse(bodyBuffer || "{}");
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(bodyBuffer);
        parsed = Object.fromEntries(params.entries());
      } else {
        try {
          parsed = JSON.parse(bodyBuffer);
        } catch {
          parsed = { body: bodyBuffer };
        }
      }

      // 1. Twilio webhook format
      if (url.pathname === "/api/sms/twilio" || parsed.MessageSid || parsed.AccountSid) {
        const message = await saveMessage({
          from: parsed.From || parsed.from || "Twilio Caller",
          to: parsed.To || parsed.to || "+12025550199",
          body: parsed.Body || parsed.body || "",
          origin: "twilio"
        });

        res.writeHead(200, { "Content-Type": "text/xml" });
        res.end("<Response></Response>");
        return;
      }

      // 2. Telnyx webhook format
      if (url.pathname === "/api/sms/telnyx" || parsed.data?.event_type?.startsWith("message.")) {
        const payload = parsed.data?.payload || {};
        const fromNumber = payload.from?.phone_number || "Telnyx Sender";
        const toNumber = payload.to?.[0]?.phone_number || "+12025550199";
        const text = payload.text || "";

        const message = await saveMessage({
          from: fromNumber,
          to: toNumber,
          body: text,
          origin: "telnyx"
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, id: message.id }));
        return;
      }

      // 3. Standard JSON Inbound
      const fromNumber = parsed.from || parsed.sender || "Unknown Sender";
      const toNumber = parsed.to || parsed.recipient || "+12025550199";
      const messageBody = parsed.body || parsed.message || parsed.text || "";

      if (!messageBody) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing 'body' or 'text' field in SMS payload" }));
        return;
      }

      const message = await saveMessage({
        from: fromNumber,
        to: toNumber,
        body: messageBody,
        origin: "webhook"
      });

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}
