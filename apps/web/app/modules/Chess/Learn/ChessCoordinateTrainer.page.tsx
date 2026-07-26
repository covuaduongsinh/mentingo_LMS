import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { FILES, RANKS, type BoardOrientation } from "~/modules/Chess/board/squareGeometry";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.chessCoordinateTrainer");

const ROUND_SECONDS = 30;
const ALL_SQUARES = RANKS.flatMap((rank) => FILES.map((file) => `${file}${rank}`));

function randomSquare(exclude?: string): string {
  let square = ALL_SQUARES[Math.floor(Math.random() * ALL_SQUARES.length)];
  while (square === exclude) {
    square = ALL_SQUARES[Math.floor(Math.random() * ALL_SQUARES.length)];
  }
  return square;
}

export default function ChessCoordinateTrainerPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"find" | "name">("find");
  const [orientation, setOrientation] = useState<BoardOrientation>("white");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(() => randomSquare());
  const [nameInput, setNameInput] = useState("");
  const [flash, setFlash] = useState<"correct" | "incorrect" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) {
      setIsRunning(false);
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const start = () => {
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setTarget(randomSquare());
    setNameInput("");
    setIsRunning(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const registerAnswer = (isCorrect: boolean) => {
    setFlash(isCorrect ? "correct" : "incorrect");
    setTimeout(() => setFlash(null), 200);
    if (isCorrect) setScore((prev) => prev + 1);
    setTarget((prev) => randomSquare(prev));
  };

  const handleSquareClick = (square: string) => {
    if (!isRunning || mode !== "find") return;
    registerAnswer(square === target);
  };

  const handleNameSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isRunning || mode !== "name") return;
    registerAnswer(nameInput.trim().toLowerCase() === target);
    setNameInput("");
  };

  const displayFiles = orientation === "white" ? FILES : [...FILES].reverse();
  const displayRanks = orientation === "white" ? RANKS : [...RANKS].reverse();

  const breadcrumbs = [
    {
      title: t("chessLearn.coordinate.title", { defaultValue: "Coordinate trainer" }),
      href: "/chess/coordinate-trainer",
    },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={mode} onValueChange={(value) => setMode(value as "find" | "name")}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="find">
                {t("chessLearn.coordinate.modeFind", { defaultValue: "Tìm ô theo tên" })}
              </SelectItem>
              <SelectItem value="name">
                {t("chessLearn.coordinate.modeName", { defaultValue: "Gọi tên ô" })}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={orientation}
            onValueChange={(value) => setOrientation(value as BoardOrientation)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="white">
                {t("chess.editor.white", { defaultValue: "White" })}
              </SelectItem>
              <SelectItem value="black">
                {t("chess.editor.black", { defaultValue: "Black" })}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" onClick={start} disabled={isRunning}>
            {t("chessLearn.coordinate.start", { defaultValue: "Bắt đầu" })}
          </Button>
          <span className="body-base-md">
            {t("chessLearn.coordinate.time", {
              defaultValue: "Thời gian: {{seconds}}s",
              seconds: timeLeft,
            })}
          </span>
          <span className="body-base-md">
            {t("chessLearn.coordinate.score", { defaultValue: "Điểm: {{score}}", score })}
          </span>
        </div>

        {mode === "name" && isRunning && (
          <p className="body-base-md">
            {t("chessLearn.coordinate.whichSquare", {
              defaultValue: "Ô được tô sáng tên là gì?",
            })}
          </p>
        )}

        <div
          className="grid overflow-hidden rounded-md border border-neutral-300"
          style={{ gridTemplateColumns: "repeat(8, 48px)", gridTemplateRows: "repeat(8, 48px)" }}
        >
          {displayRanks.map((rank) =>
            displayFiles.map((file) => {
              const square = `${file}${rank}`;
              const fileIndex = FILES.indexOf(file);
              const rankIndex = RANKS.indexOf(rank as (typeof RANKS)[number]);
              const isLight = (fileIndex + rankIndex) % 2 === 0;
              const isTarget = mode === "name" && isRunning && square === target;
              return (
                <button
                  key={square}
                  type="button"
                  onClick={() => handleSquareClick(square)}
                  className={cn(
                    "flex items-center justify-center text-xs",
                    isLight ? "bg-amber-100" : "bg-amber-700",
                    isTarget && "ring-4 ring-blue-500",
                    flash === "correct" && "outline outline-2 outline-green-500",
                  )}
                >
                  {isTarget ? null : ""}
                </button>
              );
            }),
          )}
        </div>

        {mode === "find" && isRunning && (
          <p className="body-base-md">
            {t("chessLearn.coordinate.clickSquare", {
              defaultValue: "Bấm vào ô {{square}}",
              square: target,
            })}
          </p>
        )}

        {mode === "name" && (
          <form onSubmit={handleNameSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="e4"
              disabled={!isRunning}
              className="w-24"
            />
            <Button type="submit" disabled={!isRunning}>
              {t("chessLearn.coordinate.submit", { defaultValue: "Gửi" })}
            </Button>
          </form>
        )}

        {!isRunning && timeLeft === 0 && (
          <p className="body-base-md">
            {t("chessLearn.coordinate.finalScore", {
              defaultValue: "Hết giờ! Điểm của bạn: {{score}}",
              score,
            })}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
