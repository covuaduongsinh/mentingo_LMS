import { useMutation } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

function triggerTextDownload(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const linkElement = document.createElement("a");

  linkElement.href = url;
  linkElement.download = filename;
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);

  URL.revokeObjectURL(url);
}

export function useExportTournamentTrf(tournamentId: string) {
  return useMutation({
    mutationFn: async () => {
      const response = await ApiClient.api.chessTournamentControllerExportTrf(tournamentId, {
        format: "text",
      });
      return response.data as unknown as string;
    },
    onSuccess: (text) => {
      triggerTextDownload(text, `tournament-${tournamentId}.trf.txt`);
    },
  });
}
