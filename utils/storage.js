/**
 * @fileoverview Unified In-Memory & File Storage for VibeSMS.
 * Handles virtual numbers, SMS messages, and real-time SSE event publishing.
 *
 * Curated by Arham Eskafi (https://arham.dev) - Walk Cook Live
 */

import { EventEmitter } from "events";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { extractOtp } from "./otpExtractor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");
const messagesFile = path.join(dataDir, "messages.json");
const numbersFile = path.join(dataDir, "numbers.json");

export const eventBus = new EventEmitter();

let memoryMessages = [];
let memoryNumbers = [
  { country: "United States", number: "+1 (202) 555-0199", rawNumber: "+12025550199", isLocal: true, flag: "🇺🇸" },
  { country: "United Kingdom", number: "+44 7700 900142", rawNumber: "+447700900142", isLocal: true, flag: "🇬🇧" },
  { country: "Canada", number: "+1 (613) 555-0182", rawNumber: "+16135550182", isLocal: true, flag: "🇨🇦" },
  { country: "Germany", number: "+49 151 23456789", rawNumber: "+4915123456789", isLocal: true, flag: "🇩🇪" },
  { country: "France", number: "+33 6 12 34 56 78", rawNumber: "+33612345678", isLocal: true, flag: "🇫🇷" }
];

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {}
}

export async function initStorage() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(messagesFile, "utf-8");
    memoryMessages = JSON.parse(raw);
  } catch {
    memoryMessages = [];
  }

  try {
    const rawNums = await fs.readFile(numbersFile, "utf-8");
    const parsed = JSON.parse(rawNums);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryNumbers = parsed;
    }
  } catch {}
}

export async function persistMessages() {
  await ensureDataDir();
  try {
    await fs.writeFile(messagesFile, JSON.stringify(memoryMessages.slice(0, 200), null, 2));
  } catch {}
}

export async function persistNumbers() {
  await ensureDataDir();
  try {
    await fs.writeFile(numbersFile, JSON.stringify(memoryNumbers, null, 2));
  } catch {}
}

/**
 * Save incoming SMS message
 */
export async function saveMessage(payload) {
  await initStorage();
  const id = "sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const otpInfo = extractOtp(payload.body || payload.text || "");

  const message = {
    id,
    from: payload.from || "Unknown",
    to: payload.to || "+12025550199",
    body: payload.body || payload.text || "",
    otp: otpInfo.code,
    otpConfidence: otpInfo.confidence,
    createdAt: new Date().toISOString(),
    origin: payload.origin || "webhook" // webhook, public, or test
  };

  memoryMessages.unshift(message);
  await persistMessages();

  eventBus.emit("new_sms", message);
  return message;
}

/**
 * Get all messages (optional filter by 'to' number)
 */
export async function getMessages(filterNumber = null) {
  await initStorage();
  if (filterNumber) {
    const cleanFilter = filterNumber.replace(/\D/g, "");
    return memoryMessages.filter((m) => m.to.replace(/\D/g, "").includes(cleanFilter));
  }
  return memoryMessages;
}

/**
 * Get message by ID
 */
export async function getMessageById(id) {
  await initStorage();
  return memoryMessages.find((m) => m.id === id) || null;
}

/**
 * Clear all messages
 */
export async function clearMessages() {
  await initStorage();
  memoryMessages = [];
  await persistMessages();
  eventBus.emit("sms_cleared");
}

/**
 * Get available virtual phone numbers
 */
export async function getNumbers() {
  await initStorage();
  return memoryNumbers;
}

/**
 * Add custom virtual number
 */
export async function addNumber(numberObj) {
  await initStorage();
  memoryNumbers.push(numberObj);
  await persistNumbers();
  return numberObj;
}
