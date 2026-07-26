/**
 * Static Learn curriculum content — hand-authored for mentingo's beginner chess program,
 * not derived from any external reference system. See chess-learn-business-spec.md.
 *
 * Each level's `fen`/`solutionUci` pair is deliberately built on sparse, easy-to-verify
 * positions (few pieces) rather than realistic middlegame positions, so correctness can
 * be checked by hand rather than requiring an engine.
 */

export type ChessLearnLevel = {
  id: string;
  fen: string;
  /** Any one of these UCI sequences counts as correct. */
  solutionUci: string[];
  hint: string;
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
        hint: "Xe đi thẳng theo hàng ngang hoặc hàng dọc. Hãy đưa xe từ a1 lên a4.",
      },
      {
        id: "knight-move",
        fen: "4k3/8/8/8/8/8/4N3/4K3 w - - 0 1",
        solutionUci: ["e2f4"],
        hint: "Mã đi theo hình chữ L. Hãy đưa mã từ e2 đến f4.",
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
        hint: "Mã có thể ăn quân tốt đen đang đứng ở d5.",
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
        hint: "Xe đang bị tượng đen tấn công theo đường chéo. Hãy di chuyển xe đến d1 để an toàn.",
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
        hint: "Đưa xe vào cột e để chiếu vua đen đứng ở e8.",
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
        hint: "Nhập thành cánh vua: vua đi hai ô về phía xe.",
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
        hint: "Mã có thể ăn tốt ở c4 hoặc hậu ở g4 — hãy chọn quân đáng giá hơn.",
      },
    ],
  },
];
