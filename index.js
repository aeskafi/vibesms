#!/usr/bin/env node
/**
 * ⚡ VIBESMS — Autonomous Disposable SMS & OTP Verification Studio
 *
 * Curated by Arham Eskafi (https://arham.dev) - Walk Cook Live
 */

import { Command } from "commander";
import { startWebServer } from "./utils/webServer.js";
import { startTui } from "./utils/tui.js";
import { getNumbers, getMessages, saveMessage } from "./utils/storage.js";
import chalk from "chalk";
import fs from "fs";

const program = new Command();

const version = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url))
).version;

program
  .name("vibesms")
  .version(version, "-v, --version", "Output current version")
  .description("⚡ Autonomous Disposable SMS & Local OTP Verification Studio");

// Default action
program.action(() => {
  console.log(chalk.magenta(`
╔══════════════════════════════════════════════════════════════════╗
║  ⚡ VIBESMS — Autonomous Disposable SMS & OTP Studio             ║
╚══════════════════════════════════════════════════════════════════╝
`));
  console.log(chalk.bold("Quick Commands:"));
  console.log(`  ${chalk.cyan("vibesms web")}       Launch Web Studio dashboard (http://localhost:4000)`);
  console.log(`  ${chalk.cyan("vibesms tui")}       Launch full-screen Terminal Studio`);
  console.log(`  ${chalk.cyan("vibesms list")}      List available virtual phone numbers`);
  console.log(`  ${chalk.cyan("vibesms messages")}  List recent inbound SMS messages`);
  console.log(`  ${chalk.cyan("vibesms simulate")}  Simulate an incoming test OTP SMS`);
  console.log(chalk.gray(`\nRun 'vibesms --help' for all options.\n`));
});

// Launch Web Studio
program
  .command("web")
  .alias("ui")
  .description("Launch autonomous Web Studio dashboard")
  .option("-p, --port <port>", "Port for the Web Studio", "4000")
  .action((options) => {
    startWebServer({ port: parseInt(options.port, 10) });
  });

// Launch Terminal TUI
program
  .command("tui")
  .alias("live")
  .description("Launch full-screen interactive Terminal Studio")
  .action(() => {
    startTui();
  });

// List Numbers
program
  .command("list")
  .alias("numbers")
  .description("List available virtual phone numbers")
  .action(async () => {
    const numbers = await getNumbers();
    console.log(chalk.bold("\n📱 Available Virtual Phone Numbers:\n"));
    numbers.forEach((n, idx) => {
      console.log(`  ${idx + 1}. ${n.flag} ${chalk.green(n.number)} - ${chalk.gray(n.country)}`);
    });
    console.log("");
  });

// List Messages
program
  .command("messages")
  .alias("inbox")
  .description("List recent inbound SMS messages")
  .option("-n, --number <number>", "Filter by virtual number")
  .action(async (options) => {
    const messages = await getMessages(options.number);
    console.log(chalk.bold(`\n📬 Inbound Messages (${messages.length}):\n`));
    if (messages.length === 0) {
      console.log(chalk.gray("  No messages received yet."));
      return;
    }
    messages.slice(0, 10).forEach((m) => {
      console.log(`  ${chalk.cyan(m.from)} → ${chalk.gray(m.to)} [${new Date(m.createdAt).toLocaleTimeString()}]:`);
      console.log(`  ${m.body}`);
      if (m.otp) {
        console.log(`  └─ 🔑 ${chalk.bgYellow.black(` OTP: ${m.otp} `)}`);
      }
      console.log("");
    });
  });

// Simulate SMS
program
  .command("simulate")
  .description("Simulate an incoming SMS message with OTP code")
  .option("-f, --from <sender>", "Sender name or number", "AuthService")
  .option("-t, --to <number>", "Recipient number", "+12025550199")
  .option("-c, --code <code>", "Specific verification code")
  .action(async (options) => {
    const code = options.code || Math.floor(100000 + Math.random() * 900000);
    const body = `Your VibeSMS verification passcode is ${code}. Never share your code.`;
    const message = await saveMessage({
      from: options.from,
      to: options.to,
      body,
      origin: "test"
    });
    console.log(chalk.green(`\n✓ Simulated SMS sent to ${message.to}`));
    console.log(`  Body: ${message.body}`);
    console.log(`  Detected OTP: ${chalk.bold.yellow(message.otp)}\n`);
  });

program.parse(process.argv);
