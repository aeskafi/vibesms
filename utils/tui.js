/**
 * @fileoverview Full-screen Interactive Terminal TUI for VibeSMS.
 * Real-time curses-style terminal SMS feed with instant OTP highlights.
 *
 * Curated by Arham Eskafi (https://arham.dev) - Walk Cook Live
 */

import readline from "readline";
import chalk from "chalk";
import { getMessages, getNumbers, saveMessage, eventBus } from "./storage.js";

export async function startTui() {
  const isRaw = process.stdin.isTTY;
  if (!isRaw) {
    console.log(chalk.yellow("Interactive TUI requires a TTY terminal. Starting standard CLI..."));
    return;
  }

  const numbers = await getNumbers();
  let currentNumIndex = 0;
  let statusMessage = "Listening for inbound SMS webhooks...";

  process.stdout.write("\x1b[?25l\x1b[2J");

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  const cleanup = () => {
    process.stdout.write("\x1b[?25h\x1b[2J\x1b[0;0H");
    process.stdin.setRawMode(false);
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  async function render() {
    process.stdout.write("\x1b[0;0H\x1b[2J");

    const width = Math.min(process.stdout.columns || 80, 100);
    const border = "═".repeat(width - 2);

    console.log(chalk.magenta(`╔${border}╗`));
    console.log(
      chalk.magenta(`║ `) +
        chalk.bold.yellow("⚡ VIBESMS TERMINAL STUDIO") +
        chalk.gray(" — Autonomous OTP & Virtual Phone Receiver") +
        " ".repeat(Math.max(0, width - 68)) +
        chalk.magenta(` ║`)
    );
    console.log(chalk.magenta(`╚${border}╝`));

    const activeNum = numbers[currentNumIndex];
    console.log(
      chalk.bold(" Active Virtual Number: ") +
        chalk.bgMagenta.white(` ${activeNum.flag} ${activeNum.number} `) +
        chalk.gray(` (${activeNum.country})`)
    );

    console.log(
      chalk.gray(
        ` Shortcuts: [n/p] Next/Prev Number | [s] Simulate SMS | [q] Quit`
      )
    );
    console.log(chalk.blue("─".repeat(width)));

    const messages = await getMessages(activeNum.rawNumber);
    console.log(chalk.bold(`📬 INBOUND MESSAGES (${messages.length}):\n`));

    if (messages.length === 0) {
      console.log(
        chalk.gray(
          `  No messages received for ${activeNum.number} yet.\n  Press [s] to simulate an inbound OTP test message!`
        )
      );
    } else {
      messages.slice(0, 15).forEach((msg) => {
        const time = new Date(msg.createdAt).toLocaleTimeString();
        const sender = chalk.cyan(msg.from.padEnd(16).substring(0, 16));
        console.log(`[${chalk.gray(time)}] ${sender}: ${chalk.white(msg.body)}`);
        if (msg.otp) {
          console.log(
            `       └─ 🔑 ` +
              chalk.bgYellow.black(` VERIFICATION CODE: ${msg.otp} `) +
              `\n`
          );
        }
      });
    }

    console.log(chalk.blue("─".repeat(width)));
    console.log(chalk.gray("Status: ") + statusMessage);
  }

  eventBus.on("new_sms", () => {
    statusMessage = chalk.green("⚡ New incoming SMS message received!");
    render();
  });

  process.stdin.on("keypress", async (str, key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      cleanup();
      return;
    }

    if (key.name === "n") {
      currentNumIndex = (currentNumIndex + 1) % numbers.length;
      statusMessage = `Switched to ${numbers[currentNumIndex].number}`;
      render();
    } else if (key.name === "p") {
      currentNumIndex = (currentNumIndex - 1 + numbers.length) % numbers.length;
      statusMessage = `Switched to ${numbers[currentNumIndex].number}`;
      render();
    } else if (str === "s") {
      const code = Math.floor(100000 + Math.random() * 900000);
      statusMessage = "Simulated incoming test SMS...";
      await saveMessage({
        from: "VerifyService",
        to: numbers[currentNumIndex].rawNumber,
        body: `Your verification code is ${code}. Valid for 10 minutes.`,
        origin: "test"
      });
      render();
    }
  });

  await render();
}
