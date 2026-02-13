import { useQuery } from "@tanstack/react-query";
import type { Media } from "@shared/schema";

export function useMedia() {
  return useQuery<Media[]>({
    queryKey: ["/api/media"],
  });
}
