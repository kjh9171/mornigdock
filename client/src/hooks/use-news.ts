import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { News, InsertNews } from "@shared/schema";

export function useNews() {
  return useQuery<News[]>({
    queryKey: ["/api/news"],
  });
}

export function useNewsItem(id: number) {
  return useQuery<News>({
    queryKey: [`/api/news/${id}`],
    enabled: !!id,
  });
}

export function useCreateNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (news: InsertNews) => {
      const res = await apiRequest("POST", "/api/news", news);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
  });
}

export function useAnalyzeNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/news/${id}/analyze`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: [`/api/news/${data.id}`] });
    },
  });
}
