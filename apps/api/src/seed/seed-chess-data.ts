import {
  CHESS_AUDIENCES,
  CHESS_CONTENT_SOURCE,
  CHESS_EXERCISE_FORMATS,
  CHESS_GAME_LEVELS,
  CHESS_TOPICS,
} from "@repo/shared";

import { chessExercises, chessGames } from "src/storage/schema";

import type { DatabasePg, UUIDType } from "../common";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Demo bank content for Cờ Vua Học Đường (student + teacher tracks).
 */
export async function seedChessBanks(db: DatabasePg, tenantId: UUIDType, authorId: UUIDType) {
  const exerciseRows = [
    {
      title: "Nước đi đầu tiên — e4",
      audience: CHESS_AUDIENCES.STUDENT,
      topics: [CHESS_TOPICS.INTRO, CHESS_TOPICS.OPENING],
      difficulty: 1,
      format: CHESS_EXERCISE_FORMATS.CHESS_FIND_BEST,
      fen: START_FEN,
      solution: { movesUci: ["e2e4"] },
      explanation: "1.e4 kiểm soát trung tâm và mở đường cho Hậu, Tượng.",
      source: CHESS_CONTENT_SOURCE.ORIGINAL,
      pieceCount: 32,
      published: true,
      authorId,
      tenantId,
    },
    {
      title: "Bắt Tốt không được bảo vệ",
      audience: CHESS_AUDIENCES.STUDENT,
      topics: [CHESS_TOPICS.TACTICS],
      difficulty: 2,
      format: CHESS_EXERCISE_FORMATS.CHESS_FIND_BEST,
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
      solution: { movesUci: ["b8c6"] },
      explanation: "Phát triển Mã và bảo vệ Tốt e5.",
      source: CHESS_CONTENT_SOURCE.ORIGINAL,
      pieceCount: 32,
      published: true,
      authorId,
      tenantId,
    },
    {
      title: "Luật: Phong cấp Tốt",
      audience: CHESS_AUDIENCES.STUDENT,
      topics: [CHESS_TOPICS.RULES],
      difficulty: 1,
      format: CHESS_EXERCISE_FORMATS.TRUE_FALSE,
      fen: null,
      solution: { isTrue: true },
      explanation: "Khi Tốt đến hàng cuối, phải phong cấp thành Hậu/Xe/Tượng/Mã.",
      source: CHESS_CONTENT_SOURCE.ORIGINAL,
      pieceCount: null,
      published: true,
      authorId,
      tenantId,
    },
    {
      title: "Tàn cuộc Vua + Xe vs Vua — ý tưởng",
      audience: CHESS_AUDIENCES.STUDENT,
      topics: [CHESS_TOPICS.ENDGAME],
      difficulty: 3,
      format: CHESS_EXERCISE_FORMATS.BRIEF_RESPONSE,
      fen: null,
      solution: { text: "cắt vua" },
      explanation: "Dùng Xe cắt đường Vua đối phương rồi áp Vua vào mép bàn.",
      source: CHESS_CONTENT_SOURCE.ORIGINAL,
      pieceCount: null,
      published: true,
      authorId,
      tenantId,
    },
    {
      title: "Sư phạm: Mục tiêu buổi học nhập môn",
      audience: CHESS_AUDIENCES.TEACHER,
      topics: [CHESS_TOPICS.PEDAGOGY, CHESS_TOPICS.INTRO],
      difficulty: 2,
      format: CHESS_EXERCISE_FORMATS.BRIEF_RESPONSE,
      fen: null,
      solution: { text: "nhận biết quân và nước đi hợp lệ" },
      explanation:
        "Buổi 1 nên tập trung nhận diện quân, nước đi hợp lệ, không ép học khai cuộc phức tạp.",
      source: CHESS_CONTENT_SOURCE.ORIGINAL,
      pieceCount: null,
      published: true,
      authorId,
      tenantId,
    },
    {
      title: "Tâm lý HS: Xử lý sợ thua",
      audience: CHESS_AUDIENCES.TEACHER,
      topics: [CHESS_TOPICS.STUDENT_PSYCHOLOGY, CHESS_TOPICS.PEDAGOGY],
      difficulty: 2,
      format: CHESS_EXERCISE_FORMATS.TRUE_FALSE,
      fen: null,
      solution: { isTrue: true },
      explanation:
        "Nên khen quá trình suy nghĩ và fair play trước kết quả thắng/thua với học sinh nhỏ.",
      source: CHESS_CONTENT_SOURCE.ORIGINAL,
      pieceCount: null,
      published: true,
      authorId,
      tenantId,
    },
    {
      title: "Quy tắc thi đấu học đường: bắt tay",
      audience: CHESS_AUDIENCES.BOTH,
      topics: [CHESS_TOPICS.TOURNAMENT_RULES],
      difficulty: 1,
      format: CHESS_EXERCISE_FORMATS.TRUE_FALSE,
      fen: null,
      solution: { isTrue: true },
      explanation: "Trước ván, hai bên bắt tay; sau ván cũng nên bắt tay bất kể kết quả.",
      source: CHESS_CONTENT_SOURCE.ORIGINAL,
      pieceCount: null,
      published: true,
      authorId,
      tenantId,
    },
  ];

  await db.insert(chessExercises).values(exerciseRows);

  await db.insert(chessGames).values([
    {
      title: "Minh họa Scholar's Mate (cảnh báo)",
      pgn: `[Event "Scholar's Mate teaching"]
[Site "covuahocduong.com"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6?? 4. Qxf7# 1-0`,
      topics: [CHESS_TOPICS.STORY, CHESS_TOPICS.OPENING, CHESS_TOPICS.TACTICS],
      level: CHESS_GAME_LEVELS.BEGINNER,
      teachingNotes:
        "Dùng để dạy HS phòng thủ f7/f2. Hỏi: Nước 3...Nf6 sai ở đâu? Gợi ý 3...g6 hoặc 3...Qe7.",
      tags: ["beginner", "mate"],
      published: true,
      authorId,
      tenantId,
    },
    {
      title: "Ván mẫu: Ý tưởng trung tâm (rút gọn)",
      pgn: `[Event "Center idea"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *`,
      topics: [CHESS_TOPICS.OPENING, CHESS_TOPICS.STRATEGY],
      level: CHESS_GAME_LEVELS.INTERMEDIATE,
      teachingNotes: "Ruy Lopez rút gọn: nhập thành, phát triển, áp lực e5.",
      tags: ["opening", "ruy-lopez"],
      published: true,
      authorId,
      tenantId,
    },
  ]);

  return {
    exercises: exerciseRows.length,
    games: 2,
  };
}
