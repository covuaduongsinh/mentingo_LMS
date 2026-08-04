/**
 * Static Learn curriculum content — hand-authored for mentingo's beginner chess program,
 * not derived from any external reference system. See chess-learn-business-spec.md and
 * chess-learn-interactive-engine-business-spec.md.
 *
 * Each level's fen/solution/rules are built on sparse, easy-to-verify positions.
 * NEVER import CHESS_LEARN_STAGES from the web app (answer leak). API only.
 */

export type ChessLearnShape =
  | { kind: "arrow"; from: string; to: string; color?: "green" | "red" | "blue" | "yellow" }
  | { kind: "circle"; square: string; color?: "green" | "red" | "blue" | "yellow" };

/** Whitelist rule DSL evaluated server-side only (LEARN-2). */
export type ChessLearnRule =
  | { op: "piece_on"; piece: string; square: string }
  | { op: "piece_not_on"; piece: string; square: string }
  | { op: "empty_squares"; squares: string[] }
  | { op: "board_empty_of"; color: "w" | "b" }
  | { op: "in_check"; color?: "w" | "b" }
  | { op: "checkmate" }
  | { op: "stalemate" }
  | { op: "last_move_uci"; uci: string }
  | { op: "and"; rules: ChessLearnRule[] }
  | { op: "or"; rules: ChessLearnRule[] }
  | { op: "not"; rule: ChessLearnRule };

export type ChessLearnMode =
  | "exact_line"
  | "predicate"
  | "collect_targets"
  | "clear_side"
  | "scripted";

export type ChessLearnScriptStep = {
  actor: "player" | "opponent";
  uci: string;
};

export type ChessLearnLevel = {
  id: string;
  fen: string;
  /** Default exact_line. */
  mode?: ChessLearnMode;
  /**
   * exact_line: each entry is one accepted line.
   * Multi-move lines use space-separated UCI tokens, e.g. "a1a4 a4a8".
   * Optional for non-exact modes (may be empty).
   */
  solutionUci: string[];
  /** predicate mode success condition (server-only). */
  successRule?: ChessLearnRule;
  failureRule?: ChessLearnRule;
  /** collect_targets: squares the learner must visit (public). */
  targets?: string[];
  /** clear_side: remove all pieces of this color (usually "b"). */
  clearColor?: "w" | "b";
  /** clear_side: fail if a hanging capture is left for the static opponent. */
  detectHanging?: boolean;
  /** scripted: alternating player/opponent UCI steps (server-only answers). */
  scriptSteps?: ChessLearnScriptStep[];
  /** Public goal text for the learner. */
  goal?: string;
  hint: string;
  /** Public board shapes (safe to send to client). */
  shapes?: ChessLearnShape[];
  /** Override optimal move count for scoring; default derived from solutions/targets. */
  optimalMoves?: number;
};

export type ChessLearnStage = {
  id: string;
  label: string;
  description: string;
  levels: ChessLearnLevel[];
};

export const CHESS_LEARN_STAGES: ChessLearnStage[] = [
  {
    id: "piece-movement",
    label: "Nước đi từng quân",
    description: "Học cách mỗi quân cờ di chuyển trên bàn cờ.",
    levels: [
      {
        id: "rook-move",
        fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
        solutionUci: ["a1a4"],
        goal: "Đưa xe từ a1 lên a4.",
        hint: "Xe đi thẳng theo hàng ngang hoặc hàng dọc. Hãy đưa xe từ a1 lên a4.",
        shapes: [{ kind: "arrow", from: "a1", to: "a4", color: "green" }],
      },
      {
        id: "rook-collect-stars",
        fen: "4k3/8/8/8/8/8/4R3/4K3 w - - 0 1",
        mode: "collect_targets",
        solutionUci: [],
        targets: ["e7", "a7"],
        optimalMoves: 2,
        goal: "Đưa xe đến mọi ô có ngôi sao (e7 rồi a7, hoặc ngược lại).",
        hint: "Xe đi thẳng. Hãy chạm từng ô mục tiêu.",
        shapes: [
          { kind: "circle", square: "e7", color: "yellow" },
          { kind: "circle", square: "a7", color: "yellow" },
        ],
      },
      {
        id: "rook-two-moves",
        fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
        mode: "exact_line",
        solutionUci: ["a1a8 a8h8", "a1h1 h1h8"],
        optimalMoves: 2,
        goal: "Đưa xe đến góc h8 trong đúng hai nước.",
        hint: "Xe có thể đi dọc rồi ngang, hoặc ngang rồi dọc — miễn đến h8 sau hai nước.",
        shapes: [{ kind: "circle", square: "h8", color: "green" }],
      },
      {
        id: "knight-move",
        fen: "4k3/8/8/8/8/8/4N3/4K3 w - - 0 1",
        solutionUci: ["e2f4"],
        goal: "Đưa mã từ e2 đến f4.",
        hint: "Mã đi theo hình chữ L. Hãy đưa mã từ e2 đến f4.",
        shapes: [{ kind: "arrow", from: "e2", to: "f4", color: "green" }],
      },
    ],
  },
  {
    id: "capturing",
    label: "Ăn quân",
    description: "Học cách ăn quân đối phương.",
    levels: [
      {
        id: "knight-capture",
        fen: "4k3/8/8/3p4/8/4N3/8/4K3 w - - 0 1",
        solutionUci: ["e3d5"],
        goal: "Ăn tốt đen bằng mã.",
        hint: "Mã có thể ăn quân tốt đen đang đứng ở d5.",
      },
      {
        id: "rook-clear-pawns",
        // Both kings present so chess.js accepts the position; only pawns are targets.
        fen: "4k3/2p2p2/8/8/8/2R5/8/4K3 w - - 0 1",
        mode: "clear_side",
        solutionUci: [],
        clearColor: "b",
        optimalMoves: 2,
        goal: "Ăn hết tốt đen bằng xe (không cần chiếu vua).",
        hint: "Xe có thể ăn cả hai tốt trên cùng một hàng nếu đi đúng đường.",
      },
    ],
  },
  {
    id: "protecting-pieces",
    label: "Bảo vệ quân",
    description: "Học cách tránh để mất quân miễn phí.",
    levels: [
      {
        id: "rook-escape",
        fen: "4k3/8/1b6/8/3R4/8/8/4K3 w - - 0 1",
        solutionUci: ["d4d1"],
        goal: "Di chuyển xe ra khỏi đường tấn công của tượng.",
        hint: "Xe đang bị tượng đen tấn công theo đường chéo. Hãy di chuyển xe đến d1 để an toàn.",
      },
      {
        id: "protect-with-rook",
        fen: "8/N2q4/8/8/8/8/6R1/4K3 w - - 0 1",
        mode: "scripted",
        solutionUci: [],
        scriptSteps: [
          { actor: "player", uci: "g2a2" },
          { actor: "opponent", uci: "d7a7" },
        ],
        optimalMoves: 1,
        goal: "Bảo vệ mã bằng xe (đưa xe lên cùng cột a).",
        hint: "Xe có thể bảo vệ mã từ a2. Sau đó hậu đen sẽ ăn mã — bạn đã học được ý bảo vệ.",
        shapes: [{ kind: "arrow", from: "g2", to: "a2", color: "green" }],
      },
    ],
  },
  {
    id: "check",
    label: "Chiếu",
    description: "Học cách chiếu vua đối phương.",
    levels: [
      {
        id: "rook-check",
        fen: "4k3/8/8/8/R7/8/8/4K3 w - - 0 1",
        solutionUci: ["a4e4"],
        mode: "predicate",
        successRule: { op: "in_check", color: "b" },
        failureRule: { op: "not", rule: { op: "in_check", color: "b" } },
        optimalMoves: 1,
        goal: "Chiếu vua đen bằng một nước xe.",
        hint: "Đưa xe vào cột e để chiếu vua đen đứng ở e8.",
        shapes: [{ kind: "arrow", from: "a4", to: "e4", color: "green" }],
      },
    ],
  },
  {
    id: "checkmate",
    label: "Chiếu hết",
    description: "Học cách chiếu hết — kết thúc ván cờ.",
    levels: [
      {
        id: "fools-mate",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
        solutionUci: ["d8h4"],
        mode: "predicate",
        successRule: { op: "checkmate" },
        optimalMoves: 1,
        goal: "Chiếu hết vua trắng ngay.",
        hint: 'Đưa hậu ra h4 để chiếu hết ngay lập tức — đây là ván "chiếu hết của thằng ngốc" nổi tiếng.',
      },
    ],
  },
  {
    id: "draw",
    label: "Hòa cờ",
    description: "Học một trong những cách ván cờ kết thúc hòa: bắt bí (stalemate).",
    levels: [
      {
        id: "stalemate",
        fen: "k7/8/K6Q/8/8/8/8/8 w - - 0 1",
        solutionUci: ["h6b6"],
        mode: "predicate",
        successRule: { op: "stalemate" },
        optimalMoves: 1,
        goal: "Tạo thế bắt bí (hòa).",
        hint: "Đưa hậu về b6 — vua đen ở a8 sẽ không còn nước đi hợp lệ nào nhưng không bị chiếu, đó là bắt bí (hòa).",
      },
    ],
  },
  {
    id: "castling",
    label: "Nhập thành",
    description: "Học nước đi đặc biệt nhập thành.",
    levels: [
      {
        id: "kingside-castle",
        fen: "4k3/8/8/8/8/8/8/4K2R w K - 0 1",
        solutionUci: ["e1g1"],
        goal: "Nhập thành cánh vua.",
        hint: "Nhập thành cánh vua: vua đi hai ô về phía xe.",
        shapes: [{ kind: "arrow", from: "e1", to: "g1", color: "green" }],
      },
    ],
  },
  {
    id: "en-passant",
    label: "Bắt tốt qua đường",
    description: "Học nước đi đặc biệt bắt tốt qua đường.",
    levels: [
      {
        id: "en-passant-capture",
        fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
        solutionUci: ["e5d6"],
        goal: "Bắt tốt qua đường.",
        hint: "Tốt đen vừa đi hai ô từ d7 xuống d5. Tốt trắng có thể bắt qua đường tại d6.",
      },
    ],
  },
  {
    id: "fork",
    label: "Đòn đôi",
    description: "Học cách tấn công hai quân cùng lúc.",
    levels: [
      {
        id: "knight-fork",
        fen: "4k1r1/8/8/3N4/8/8/8/4K3 w - - 0 1",
        solutionUci: ["d5f6"],
        goal: "Tấn công đồng thời vua và xe bằng mã.",
        hint: "Đưa mã đến f6 — vừa chiếu vua đen, vừa tấn công xe đen ở g8 cùng lúc.",
      },
    ],
  },
  {
    id: "piece-value",
    label: "Giá trị quân",
    description: "Học cách nhận biết quân nào đáng giá hơn khi có nhiều lựa chọn ăn quân.",
    levels: [
      {
        id: "capture-the-queen",
        fen: "4k3/8/8/8/2p3q1/4N3/8/4K3 w - - 0 1",
        solutionUci: ["e3g4"],
        goal: "Ăn quân có giá trị cao hơn.",
        hint: "Mã có thể ăn tốt ở c4 hoặc hậu ở g4 — hãy chọn quân đáng giá hơn.",
      },
    ],
  },
];
