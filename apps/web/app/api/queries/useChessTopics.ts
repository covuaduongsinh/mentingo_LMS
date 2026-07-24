import { CHESS_TOPIC_LABELS, CHESS_TOPIC_LIST, type ChessTopic } from "@repo/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { chessApi } from "~/api/chess-api";

export const CHESS_TOPICS_QUERY_KEY = ["chess-topics"] as const;

export const chessTopicsQueryOptions = (options: { enabled?: boolean } = { enabled: true }) =>
  queryOptions({
    queryKey: CHESS_TOPICS_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await chessApi.getTopics();
        return response.data;
      } catch {
        return CHESS_TOPIC_LIST.map((id) => ({
          id,
          labelKey: `chess.topics.${id}`,
        }));
      }
    },
    ...options,
  });

export function useChessTopics(options?: { enabled?: boolean }) {
  return useQuery(chessTopicsQueryOptions(options));
}

export function getChessTopicLabel(topic: ChessTopic): string {
  return CHESS_TOPIC_LABELS[topic] ?? topic;
}
