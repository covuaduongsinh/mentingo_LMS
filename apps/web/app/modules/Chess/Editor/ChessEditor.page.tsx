import { useNavigate, useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ChessPiece } from "~/modules/Chess/board/pieces/ChessPiece";
import { setPageTitle } from "~/utils/setPageTitle";

import { BoardEditorGrid } from "./BoardEditorGrid";
import {
  clearEditorBoard,
  editorStateFromFen,
  fenFromEditorState,
  setSquarePiece,
  standardEditorState,
  validateEditorFen,
  type EditorPiece,
  type EditorState,
  type PieceColor,
  type PieceType,
} from "./editorFen";

import type { MetaFunction } from "@remix-run/react";
import type { Square } from "chess.js";
import type { BoardOrientation } from "~/modules/Chess/board/squareGeometry";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessEditor");

const PALETTE_PIECE_TYPES: PieceType[] = ["k", "q", "r", "b", "n", "p"];
type EditorTool = EditorPiece | "erase";

function toolsEqual(a: EditorTool, b: EditorTool): boolean {
  if (a === "erase" || b === "erase") return a === b;
  return a.color === b.color && a.type === b.type;
}

export default function ChessEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [editorState, setEditorState] = useState<EditorState>(() => {
    const fromQuery = searchParams.get("fen");
    return (fromQuery ? editorStateFromFen(fromQuery) : null) ?? standardEditorState();
  });
  const [orientation, setOrientation] = useState<BoardOrientation>("white");
  const [selectedTool, setSelectedTool] = useState<EditorTool>("erase");
  const [fenInputText, setFenInputText] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const currentFen = fenFromEditorState(editorState);
  const validation = validateEditorFen(currentFen);

  useEffect(() => {
    setFenInputText(currentFen);
    // Only re-sync the textarea when the board itself changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFen]);

  const handleSquareClick = (square: Square) => {
    setEditorState((state) => {
      if (selectedTool === "erase") {
        return state.squares[square] ? setSquarePiece(state, square, null) : state;
      }
      const existing = state.squares[square];
      const isSamePiece =
        existing && existing.color === selectedTool.color && existing.type === selectedTool.type;
      return setSquarePiece(state, square, isSamePiece ? null : selectedTool);
    });
  };

  const handleLoadFen = () => {
    const parsed = editorStateFromFen(fenInputText.trim());
    if (!parsed) {
      setLoadError(t("chess.editor.errors.unparseable", { defaultValue: "Could not parse FEN" }));
      return;
    }
    setLoadError(null);
    setEditorState(parsed);
  };

  const handleCopyFen = () => {
    navigator.clipboard
      .writeText(currentFen)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  const handleOpenInAnalysis = () => {
    if (!validation.valid) return;
    navigate(`/chess/analysis?fen=${encodeURIComponent(currentFen)}`);
  };

  const enPassantRank = editorState.turn === "w" ? 6 : 3;
  const enPassantOptions = ["a", "b", "c", "d", "e", "f", "g", "h"].map(
    (file) => `${file}${enPassantRank}`,
  );

  const breadcrumbs = [
    { title: t("chess.nav.editor", { defaultValue: "Board editor" }), href: "/chess/editor" },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="space-y-3">
          <div>
            <h1 className="h4">{t("chess.editor.title", { defaultValue: "Board editor" })}</h1>
            <p className="body-base text-neutral-600">
              {t("chess.editor.subtitle", {
                defaultValue: "Set up any position, then send it to the analysis board.",
              })}
            </p>
          </div>

          <BoardEditorGrid
            squares={editorState.squares}
            orientation={orientation}
            size={400}
            onSquareClick={handleSquareClick}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditorState(standardEditorState())}
            >
              {t("chess.editor.standardPosition", { defaultValue: "Standard position" })}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditorState((state) => clearEditorBoard(state))}
            >
              {t("chess.editor.clearBoard", { defaultValue: "Clear board" })}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
            >
              {t("chess.editor.flipBoard", { defaultValue: "Flip board" })}
            </Button>
          </div>
        </div>

        <div className="w-full max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="space-y-2">
            <Label>{t("chess.editor.palette", { defaultValue: "Pieces" })}</Label>
            <div className="flex flex-wrap gap-1">
              {(["w", "b"] as PieceColor[]).map((color) =>
                PALETTE_PIECE_TYPES.map((type) => {
                  const tool: EditorTool = { color, type };
                  const isSelected = toolsEqual(selectedTool, tool);
                  return (
                    <button
                      key={`${color}${type}`}
                      type="button"
                      data-testid={`chess-editor-palette-${color}${type}`}
                      onClick={() => setSelectedTool(tool)}
                      className={`flex size-10 items-center justify-center rounded border ${
                        isSelected
                          ? "border-sky-500 bg-sky-50"
                          : "border-neutral-200 hover:bg-neutral-50"
                      }`}
                      aria-label={`${color} ${type}`}
                    >
                      <ChessPiece color={color} type={type} size={28} />
                    </button>
                  );
                }),
              )}
              <button
                type="button"
                data-testid="chess-editor-palette-erase"
                onClick={() => setSelectedTool("erase")}
                className={`flex h-10 items-center justify-center rounded border px-3 text-sm ${
                  selectedTool === "erase"
                    ? "border-sky-500 bg-sky-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {t("chess.editor.erase", { defaultValue: "Erase" })}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("chess.editor.turn", { defaultValue: "Side to move" })}</Label>
            <select
              value={editorState.turn}
              onChange={(event) =>
                setEditorState((state) => ({ ...state, turn: event.target.value as PieceColor }))
              }
              className="h-9 w-full rounded border border-neutral-200 px-2 text-sm"
            >
              <option value="w">{t("chess.editor.white", { defaultValue: "White" })}</option>
              <option value="b">{t("chess.editor.black", { defaultValue: "Black" })}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("chess.editor.castling", { defaultValue: "Castling rights" })}</Label>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {(
                [
                  ["whiteKingside", "chess.editor.castlingWhiteKingside", "White O-O"],
                  ["whiteQueenside", "chess.editor.castlingWhiteQueenside", "White O-O-O"],
                  ["blackKingside", "chess.editor.castlingBlackKingside", "Black O-O"],
                  ["blackQueenside", "chess.editor.castlingBlackQueenside", "Black O-O-O"],
                ] as const
              ).map(([key, labelKey, defaultLabel]) => (
                <label key={key} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={editorState.castling[key]}
                    onChange={(event) =>
                      setEditorState((state) => ({
                        ...state,
                        castling: { ...state.castling, [key]: event.target.checked },
                      }))
                    }
                  />
                  {t(labelKey, { defaultValue: defaultLabel })}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("chess.editor.enPassant", { defaultValue: "En passant target" })}</Label>
            <select
              value={editorState.enPassantSquare}
              onChange={(event) =>
                setEditorState((state) => ({
                  ...state,
                  enPassantSquare: event.target.value as EditorState["enPassantSquare"],
                }))
              }
              className="h-9 w-full rounded border border-neutral-200 px-2 text-sm"
            >
              <option value="">{t("chess.editor.none", { defaultValue: "None" })}</option>
              {enPassantOptions.map((square) => (
                <option key={square} value={square}>
                  {square}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>FEN</Label>
            <Textarea
              className="font-mono text-xs"
              rows={3}
              value={fenInputText}
              onChange={(event) => setFenInputText(event.target.value)}
            />
            {!validation.valid ? (
              <p className="text-xs text-red-600">
                {t("chess.editor.errors.invalidPosition", { defaultValue: "Invalid position" })}
                {validation.error ? `: ${validation.error}` : ""}
              </p>
            ) : null}
            {loadError ? <p className="text-xs text-red-600">{loadError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleLoadFen}>
                {t("chess.editor.loadFen", { defaultValue: "Load FEN" })}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyFen}>
                {isCopied
                  ? t("chess.editor.copied", { defaultValue: "Copied!" })
                  : t("chess.editor.copyFen", { defaultValue: "Copy FEN" })}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!validation.valid}
                onClick={handleOpenInAnalysis}
              >
                {t("chess.editor.openInAnalysis", { defaultValue: "Open in analysis" })}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
