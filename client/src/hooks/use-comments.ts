import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Comment, User } from "@shared/schema";

type CommentWithUser = Comment & { user: User };

export function useComments(newsId: number) {
  return useQuery<CommentWithUser[]>({
    queryKey: [`/api/news/${newsId}/comments`],
    enabled: !!newsId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ newsId, content }: { newsId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/news/${newsId}/comments`, { content });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/news/${variables.newsId}/comments`] });
    },
  });
}
