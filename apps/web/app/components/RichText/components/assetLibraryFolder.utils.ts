import type { ResourceLibraryFolder } from "~/api/queries/useResourceLibraryFolders";

export const RESOURCE_FOLDER_COLORS = [
  "neutral",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const satisfies readonly ResourceLibraryFolder["color"][];

export const RESOURCE_FOLDER_COLOR_CLASSES: Record<ResourceLibraryFolder["color"], string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
};
