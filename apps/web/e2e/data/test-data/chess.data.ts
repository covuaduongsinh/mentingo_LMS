export const CHESS_TEST_DATA = {
  exercise: {
    titlePrefix: "E2E Chess Exercise",
    /**
     * White king g1, rook a1; Black king g8, pawns f7/g7/h7 (unmoved back rank).
     * Ra8 is a back-rank checkmate in one, with no other legal reply for White
     * that mates in one — safe as a "chess_find_best" fixture.
     */
    mateInOneFen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    mateInOneSolutionUci: "a1a8",
  },
} as const;
