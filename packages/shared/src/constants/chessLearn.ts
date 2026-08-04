/**
 * Static Learn curriculum content — hand-authored for mentingo's beginner chess program,
 * not derived from any external reference system. See chess-learn-business-spec.md and
 * chess-learn-interactive-engine-business-spec.md.
 *
 * NEVER import CHESS_LEARN_STAGES from the web app (answer leak). API only.
 */

export type ChessLearnShape =
  | { kind: "arrow"; from: string; to: string; color?: "green" | "red" | "blue" | "yellow" }
  | { kind: "circle"; square: string; color?: "green" | "red" | "blue" | "yellow" };

/** Whitelist rule DSL evaluated server-side only. */
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
  mode?: ChessLearnMode;
  solutionUci: string[];
  successRule?: ChessLearnRule;
  failureRule?: ChessLearnRule;
  targets?: string[];
  clearColor?: "w" | "b";
  detectHanging?: boolean;
  scriptSteps?: ChessLearnScriptStep[];
  goal?: string;
  hint: string;
  shapes?: ChessLearnShape[];
  optimalMoves?: number;
};

export type ChessLearnStage = {
  id: string;
  label: string;
  description: string;
  intro?: string;
  complete?: string;
  levels: ChessLearnLevel[];
};

export type ChessLearnCategory = {
  id: string;
  label: string;
  description: string;
  stageIds: string[];
};

/**
 * When true, stage N+1 stays locked until stage N has every level completed.
 * Default off for LMS flexibility (LEARN-4).
 */
export const CHESS_LEARN_SEQUENTIAL_LOCK = false;

export const CHESS_LEARN_STAGES: ChessLearnStage[] = [
  {
    id: "piece-movement",
    label: "Nước đi từng quân",
    description: "Học cách mỗi quân cờ di chuyển trên bàn cờ.",
    intro: "Bắt đầu với xe, mã — những quân di chuyển rõ ràng nhất.",
    complete: "Bạn đã biết di chuyển xe và mã. Tiếp theo: ăn quân.",
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
      {
        id: "bishop-move",
        fen: "4k3/8/8/8/8/8/8/2B1K3 w - - 0 1",
        solutionUci: ["c1a3", "c1e3", "c1f4", "c1g5", "c1h6"],
        goal: "Di chuyển tượng theo đường chéo (một nước hợp lệ bất kỳ ra khỏi c1).",
        hint: "Tượng chỉ đi chéo. Thử a3, e3, f4…",
        shapes: [{ kind: "arrow", from: "c1", to: "f4", color: "green" }],
      },
    ],
  },
  {
    id: "capturing",
    label: "Ăn quân",
    description: "Học cách ăn quân đối phương.",
    intro: "Ăn quân là di chuyển đến ô đang có quân địch.",
    complete: "Bạn đã biết ăn quân. Hãy học bảo vệ quân của mình.",
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
    intro: "Đừng để quân bị ăn mà không được bảo vệ.",
    complete: "Bạn đã hiểu ý bảo vệ. Tiếp: chiếu và chiếu hết.",
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
        hint: "Xe có thể bảo vệ mã từ a2.",
        shapes: [{ kind: "arrow", from: "g2", to: "a2", color: "green" }],
      },
    ],
  },
  {
    id: "check",
    label: "Chiếu",
    description: "Học cách chiếu vua đối phương.",
    intro: "Chiếu là tấn công vua — đối phương phải xử lý ngay.",
    complete: "Bạn biết chiếu. Bước tiếp: chiếu hết.",
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
      {
        id: "queen-check",
        fen: "4k3/8/8/8/8/8/8/3QK3 w - - 0 1",
        solutionUci: ["d1d8", "d1a4", "d1h5"],
        mode: "predicate",
        successRule: { op: "in_check", color: "b" },
        optimalMoves: 1,
        goal: "Chiếu vua đen bằng hậu.",
        hint: "Hậu đi thẳng hoặc chéo. Nhiều ô có thể chiếu — ví dụ d8.",
      },
    ],
  },
  {
    id: "checkmate",
    label: "Chiếu hết",
    description: "Học cách chiếu hết — kết thúc ván cờ.",
    intro: "Chiếu hết: vua bị chiếu và không còn cách thoát.",
    complete: "Bạn biết chiếu hết! Học thêm hòa cờ và luật đặc biệt.",
    levels: [
      {
        id: "fools-mate",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
        solutionUci: ["d8h4"],
        mode: "predicate",
        successRule: { op: "checkmate" },
        optimalMoves: 1,
        goal: "Chiếu hết vua trắng ngay.",
        hint: 'Đưa hậu ra h4 — "chiếu hết của thằng ngốc".',
      },
    ],
  },
  {
    id: "draw",
    label: "Hòa cờ",
    description: "Học bắt bí (stalemate) — một cách hòa.",
    intro: "Bắt bí: không bị chiếu nhưng không còn nước đi hợp lệ.",
    complete: "Bạn phân biệt được chiếu hết và bắt bí.",
    levels: [
      {
        id: "stalemate",
        fen: "k7/8/K6Q/8/8/8/8/8 w - - 0 1",
        solutionUci: ["h6b6"],
        mode: "predicate",
        successRule: { op: "stalemate" },
        optimalMoves: 1,
        goal: "Tạo thế bắt bí (hòa).",
        hint: "Đưa hậu về b6 — vua đen không còn nước đi nhưng không bị chiếu.",
      },
    ],
  },
  {
    id: "castling",
    label: "Nhập thành",
    description: "Học nước đi đặc biệt nhập thành.",
    intro: "Nhập thành đưa vua an toàn và phát triển xe.",
    complete: "Bạn đã nhập thành được.",
    levels: [
      {
        id: "kingside-castle",
        fen: "4k3/8/8/8/8/8/8/4K2R w K - 0 1",
        solutionUci: ["e1g1"],
        goal: "Nhập thành cánh vua.",
        hint: "Nhập thành cánh vua: vua đi hai ô về phía xe.",
        shapes: [{ kind: "arrow", from: "e1", to: "g1", color: "green" }],
      },
      {
        id: "queenside-castle",
        fen: "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1",
        solutionUci: ["e1c1"],
        goal: "Nhập thành cánh hậu.",
        hint: "Vua đi hai ô về phía xe cánh hậu (e1 → c1).",
        shapes: [{ kind: "arrow", from: "e1", to: "c1", color: "green" }],
      },
    ],
  },
  {
    id: "en-passant",
    label: "Bắt tốt qua đường",
    description: "Học nước đi đặc biệt bắt tốt qua đường.",
    intro: "Khi tốt địch vừa đi hai ô, bạn có thể bắt như thể nó chỉ đi một ô.",
    complete: "Bạn đã nắm bắt qua đường.",
    levels: [
      {
        id: "en-passant-capture",
        fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
        solutionUci: ["e5d6"],
        goal: "Bắt tốt qua đường.",
        hint: "Tốt đen vừa đi hai ô từ d7 xuống d5. Tốt trắng bắt qua đường tại d6.",
      },
    ],
  },
  {
    id: "fork",
    label: "Đòn đôi",
    description: "Học cách tấn công hai quân cùng lúc.",
    intro: "Đòn đôi (fork) buộc đối phương mất ít nhất một quân.",
    complete: "Bạn nhận ra đòn đôi cơ bản bằng mã.",
    levels: [
      {
        id: "knight-fork",
        fen: "4k1r1/8/8/3N4/8/8/8/4K3 w - - 0 1",
        solutionUci: ["d5f6"],
        goal: "Tấn công đồng thời vua và xe bằng mã.",
        hint: "Đưa mã đến f6 — vừa chiếu vua, vừa tấn công xe g8.",
      },
    ],
  },
  {
    id: "piece-value",
    label: "Giá trị quân",
    description: "Học cách nhận biết quân nào đáng giá hơn.",
    intro: "Hậu > xe > mã/tượng > tốt. Ưu tiên ăn quân giá trị cao.",
    complete: "Chúc mừng — bạn đã hoàn thành lộ trình nhập môn cốt lõi!",
    levels: [
      {
        id: "capture-the-queen",
        fen: "4k3/8/8/8/2p3q1/4N3/8/4K3 w - - 0 1",
        solutionUci: ["e3g4"],
        goal: "Ăn quân có giá trị cao hơn.",
        hint: "Mã có thể ăn tốt c4 hoặc hậu g4 — hãy chọn hậu.",
      },
    ],
  },
];

/** Pedagogical grouping for the Learn map UI (LEARN-4). */
export const CHESS_LEARN_CATEGORIES: ChessLearnCategory[] = [
  {
    id: "pieces",
    label: "Quân cờ",
    description: "Di chuyển từng loại quân.",
    stageIds: ["piece-movement"],
  },
  {
    id: "fundamentals",
    label: "Nền tảng",
    description: "Ăn quân, bảo vệ, chiếu, chiếu hết.",
    stageIds: ["capturing", "protecting-pieces", "check", "checkmate"],
  },
  {
    id: "intermediate",
    label: "Trung cấp",
    description: "Hòa cờ và luật đặc biệt.",
    stageIds: ["draw", "castling", "en-passant"],
  },
  {
    id: "advanced",
    label: "Nâng cao",
    description: "Chiến thuật và giá trị quân.",
    stageIds: ["fork", "piece-value"],
  },
];

/** Total published levels — used for classroom completion %. */
export function countChessLearnLevels(): number {
  return CHESS_LEARN_STAGES.reduce((sum, stage) => sum + stage.levels.length, 0);
}
