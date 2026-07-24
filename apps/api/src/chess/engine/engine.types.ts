export const CHESS_ENGINE_LEVELS = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export type ChessEngineLevel = (typeof CHESS_ENGINE_LEVELS)[keyof typeof CHESS_ENGINE_LEVELS];

export type EngineBestMoveRequest = {
  fen: string;
  movesUci?: string[];
  level?: ChessEngineLevel;
};

export type EngineBestMoveResult = {
  bestMoveUci: string;
  engine: "arasan" | "builtin";
  depth: number;
};

export type EngineAnalyzeRequest = {
  fen: string;
  movesUci?: string[];
  depth?: number;
};

export type EngineAnalyzeResult = {
  bestMoveUci: string | null;
  scoreCp: number | null;
  mate: number | null;
  pv: string[];
  depth: number;
  engine: "arasan" | "builtin";
};

export type LevelSearchParams = {
  depth: number;
  movetimeMs: number;
};
