import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { dirname } from "node:path";

import type { EngineAnalyzeResult, EngineBestMoveResult } from "./engine.types";

/**
 * Minimal UCI client for Arasan (MIT, https://arasanchess.org).
 *
 * Use the console UCI binary: `arasanx-64.exe` (Windows) / `arasanx` (Linux).
 * `arasan-64.exe` is the GUI app and will not speak UCI on stdin/stdout.
 *
 * Working directory is set to the binary folder so book.bin / NNUE resolve correctly.
 */
export class ArasanUciManager {
  constructor(private readonly binaryPath: string) {}

  static isBinaryAvailable(path: string | undefined | null): path is string {
    if (!path?.trim()) return false;
    try {
      accessSync(path, constants.X_OK);
      return true;
    } catch {
      try {
        accessSync(path, constants.F_OK);
        return true;
      } catch {
        return false;
      }
    }
  }

  async bestMove(input: {
    fen: string;
    movesUci?: string[];
    depth: number;
    movetimeMs: number;
  }): Promise<EngineBestMoveResult> {
    const lines = await this.runUciSession(
      [
        "uci",
        "isready",
        "ucinewgame",
        "isready",
        `position fen ${input.fen}${this.movesSuffix(input.movesUci)}`,
        `go depth ${input.depth}`,
      ],
      30_000,
    );

    const bestMoveLine = [...lines].reverse().find((line) => line.startsWith("bestmove "));
    if (!bestMoveLine) {
      throw new Error("Arasan did not return bestmove");
    }

    const parts = bestMoveLine.split(/\s+/);
    const bestMoveUci = parts[1];
    if (!bestMoveUci || bestMoveUci === "(none)") {
      throw new Error("Arasan returned no move");
    }

    return {
      bestMoveUci,
      engine: "arasan",
      depth: input.depth,
    };
  }

  async analyze(input: {
    fen: string;
    movesUci?: string[];
    depth: number;
  }): Promise<EngineAnalyzeResult> {
    const lines = await this.runUciSession(
      [
        "uci",
        "isready",
        "ucinewgame",
        "isready",
        `position fen ${input.fen}${this.movesSuffix(input.movesUci)}`,
        `go depth ${input.depth}`,
      ],
      45_000,
    );

    let scoreCp: number | null = null;
    let mate: number | null = null;
    let pv: string[] = [];
    let depth = input.depth;

    for (const line of lines) {
      if (!line.startsWith("info ")) continue;
      const depthMatch = line.match(/\bdepth\s+(\d+)/);
      if (depthMatch) depth = Number(depthMatch[1]);

      const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
      if (mateMatch) {
        mate = Number(mateMatch[1]);
        scoreCp = null;
      } else {
        const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
        if (cpMatch) {
          scoreCp = Number(cpMatch[1]);
          mate = null;
        }
      }

      const pvMatch = line.match(/\bpv\s+(.+)$/);
      if (pvMatch) {
        pv = pvMatch[1].trim().split(/\s+/).filter(Boolean);
      }
    }

    const bestMoveLine = [...lines].reverse().find((line) => line.startsWith("bestmove "));
    const bestMoveUci = bestMoveLine?.split(/\s+/)[1] ?? pv[0] ?? null;

    return {
      bestMoveUci: bestMoveUci && bestMoveUci !== "(none)" ? bestMoveUci : null,
      scoreCp,
      mate,
      pv,
      depth,
      engine: "arasan",
    };
  }

  private movesSuffix(movesUci?: string[]): string {
    if (!movesUci?.length) return "";
    return ` moves ${movesUci.join(" ")}`;
  }

  private runUciSession(commands: string[], timeoutMs = 30_000): Promise<string[]> {
    return new Promise((resolve, reject) => {
      let child: ChildProcessWithoutNullStreams;
      const cwd = dirname(this.binaryPath);

      try {
        child = spawn(this.binaryPath, [], {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          cwd,
          env: {
            ...process.env,
          },
        });
      } catch (error) {
        reject(error);
        return;
      }

      const output: string[] = [];
      let settled = false;
      let buffer = "";
      let commandIndex = 0;
      let waitingForReady = false;

      const cleanup = () => {
        if (!child.killed) {
          try {
            child.stdin.write("quit\n");
          } catch {
            // ignore
          }
          try {
            child.kill();
          } catch {
            // ignore
          }
        }
      };

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        if (err) reject(err);
        else resolve(output);
      };

      const timer = setTimeout(() => {
        finish(
          new Error(
            `Arasan UCI timed out after ${timeoutMs}ms. Use arasanx-64.exe (UCI), not arasan-64.exe (GUI). CWD=${cwd}`,
          ),
        );
      }, timeoutMs);

      const sendCommand = (cmd: string) => {
        try {
          child.stdin.write(`${cmd}\n`);
        } catch (error) {
          finish(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const sendNext = () => {
        if (settled || commandIndex >= commands.length) return;
        const cmd = commands[commandIndex++];
        if (cmd === "isready") {
          waitingForReady = true;
        }
        sendCommand(cmd);
        // Non-ready commands after ready can be paced lightly
        if (cmd !== "isready" && cmd !== "go depth" && !cmd.startsWith("go ")) {
          setTimeout(() => {
            if (!waitingForReady) sendNext();
          }, 30);
        } else if (cmd.startsWith("go ")) {
          // wait for bestmove
        } else if (cmd !== "isready") {
          setTimeout(sendNext, 20);
        }
      };

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");

      child.stdout.on("data", (chunk: string) => {
        buffer += chunk;
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop() ?? "";
        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          output.push(trimmed);

          if (trimmed === "uciok") {
            // start sending remaining after first uci
            if (commandIndex === 1) {
              // first command was uci; continue
              setTimeout(sendNext, 20);
            }
          }

          if (trimmed === "readyok") {
            waitingForReady = false;
            sendNext();
          }

          if (trimmed.startsWith("bestmove ")) {
            finish();
          }
        }
      });

      child.stderr.on("data", () => {
        // Arasan may log to stderr; ignore
      });

      child.on("error", (error) => finish(error));
      child.on("exit", (code) => {
        if (!settled) {
          if (output.some((l) => l.startsWith("bestmove "))) {
            finish();
          } else {
            finish(new Error(`Arasan exited with code ${code}`));
          }
        }
      });

      // Kick off: send first command (uci)
      sendNext();
    });
  }
}
