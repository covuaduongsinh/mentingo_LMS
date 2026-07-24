import { CHESS_BOARD_HANDLES, CHESS_PLAY_PAGE_HANDLES } from "../../data/chess/handles";

import type { Page } from "@playwright/test";

export const startNewGameAsWhiteFlow = async (page: Page) => {
  await page.goto("/chess/play");
  await page.getByTestId(CHESS_PLAY_PAGE_HANDLES.NEW_GAME_WHITE).click();
};

/** Clicks the from-square then the to-square. Auto-promotes to queen (board default). */
export const makeBoardMoveFlow = async (page: Page, uci: string) => {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);

  await page.getByTestId(CHESS_BOARD_HANDLES.square(from)).click();
  await page.getByTestId(CHESS_BOARD_HANDLES.square(to)).click();
};

export const resignGameFlow = async (page: Page) => {
  await page.getByTestId(CHESS_PLAY_PAGE_HANDLES.RESIGN_BUTTON).click();
  await page.getByTestId(CHESS_PLAY_PAGE_HANDLES.RESIGN_DIALOG).waitFor({ state: "visible" });
  await page.getByTestId(CHESS_PLAY_PAGE_HANDLES.RESIGN_CONFIRM).click();
};
