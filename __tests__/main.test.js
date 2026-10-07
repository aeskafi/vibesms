import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { extractOtp } from "../utils/otpExtractor.js";
import {
  initStorage,
  getNumbers,
  saveMessage,
  getMessages,
  clearMessages
} from "../utils/storage.js";
import { startWebServer } from "../utils/webServer.js";

const TEST_PORT = 4899;

describe("⚡ VibeSMS Comprehensive Test Suite", () => {
  let server;

  before(async () => {
    await clearMessages();
    server = startWebServer({ port: TEST_PORT });
  });

  after(async () => {
    await clearMessages();
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("1. OTP & Verification Code Extraction", () => {
    it("should extract 6-digit verification code with keyword", () => {
      const res = extractOtp("Your verification code is 482019. Valid for 10 minutes.");
      assert.equal(res.code, "482019");
      assert.equal(res.confidence, "high");
    });

    it("should extract 4-digit PIN with prefix", () => {
      const res = extractOtp("Use OTP: 9821 to log into your account.");
      assert.equal(res.code, "9821");
      assert.equal(res.confidence, "high");
    });

    it("should extract Google-style G-XXXXXX codes", () => {
      const res = extractOtp("G-749201 is your Google verification code.");
      assert.equal(res.code, "G-749201");
      assert.equal(res.confidence, "high");
    });

    it("should return null when no code is present", () => {
      const res = extractOtp("Hey, where are you meeting us for dinner tonight?");
      assert.equal(res.code, null);
      assert.equal(res.confidence, "none");
    });
  });

  describe("2. Storage & Virtual Numbers Engine", () => {
    it("should provide available virtual numbers", async () => {
      const numbers = await getNumbers();
      assert.ok(Array.isArray(numbers));
      assert.ok(numbers.length >= 3);
      assert.ok(numbers.some((n) => n.country === "United States"));
      assert.ok(numbers.some((n) => n.country === "United Kingdom"));
    });

    it("should store inbound SMS and extract OTP automatically", async () => {
      const msg = await saveMessage({
        from: "+15551234567",
        to: "+12025550199",
        body: "Your secret login code is 882910."
      });

      assert.ok(msg.id.startsWith("sms_"));
      assert.equal(msg.otp, "882910");
      assert.equal(msg.from, "+15551234567");

      const all = await getMessages("+12025550199");
      assert.ok(all.length > 0);
      assert.equal(all[0].id, msg.id);
    });
  });

  describe("3. Webhook Receiver Ingestion APIs", () => {
    it("should ingest standard JSON webhook at /api/sms/inbound", async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/sms/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "DiscordAuth",
          to: "+12025550199",
          body: "Your Discord security key is 391827."
        })
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.message.otp, "391827");
    });

    it("should handle Twilio webhook format at /api/sms/twilio", async () => {
      const formData = new URLSearchParams();
      formData.append("From", "+19998887777");
      formData.append("To", "+12025550199");
      formData.append("Body", "Your Twilio OTP is 551920.");
      formData.append("MessageSid", "SM123456789");

      const res = await fetch(`http://localhost:${TEST_PORT}/api/sms/twilio`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "text/xml");
      const xml = await res.text();
      assert.ok(xml.includes("<Response></Response>"));

      const messages = await getMessages();
      const found = messages.find((m) => m.from === "+19998887777");
      assert.ok(found);
      assert.equal(found.otp, "551920");
    });
  });

  describe("4. Web Studio HTTP & Real-Time Endpoints", () => {
    it("should serve Web Studio dashboard at /", async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("VibeSMS"));
      assert.ok(html.includes("Autonomous OTP Studio"));
    });

    it("should return virtual numbers at /api/numbers", async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/numbers`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
    });

    it("should stream real-time events at /api/events via SSE", async () => {
      const controller = new AbortController();
      const res = await fetch(`http://localhost:${TEST_PORT}/api/events`, {
        signal: controller.signal
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "text/event-stream");
      controller.abort();
    });
  });
});
