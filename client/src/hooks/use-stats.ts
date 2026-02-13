import { useQuery } from "@tanstack/react-query";

export function useStats() {
  return useQuery<{
    usersCount: number;
    newsCount: number;
    activeUsers: number;
  }>({
    queryKey: ["/api/stats"],
  });
}
