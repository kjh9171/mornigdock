import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useNews } from "@/hooks/use-news";
import { useComments, useCreateComment } from "@/hooks/use-comments";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Community() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialNewsId = searchParams.get("newsId");
  
  const [selectedNewsId, setSelectedNewsId] = useState<number | null>(
    initialNewsId ? parseInt(initialNewsId) : null
  );

  const { data: news } = useNews();
  
  // Select first news item if none selected and news loaded
  useEffect(() => {
    if (!selectedNewsId && news && news.length > 0) {
      setSelectedNewsId(news[0].id);
    }
  }, [news, selectedNewsId]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Topics List */}
        <Card className="col-span-1 h-full flex flex-col">
          <CardHeader>
            <CardTitle className="silver-text-lg">Discussion Topics</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-1 p-4">
                {news?.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedNewsId(item.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors text-sm hover:bg-muted",
                      selectedNewsId === item.id ? "bg-primary/10 border-l-4 border-primary" : "border-l-4 border-transparent"
                    )}
                  >
                    <p className={cn("font-medium silver-text-base", selectedNewsId === item.id ? "text-primary" : "text-foreground")}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                       <span>{item.comments?.length || 0} comments</span>
                       <span>•</span>
                       <span>{format(new Date(item.createdAt!), 'MMM d')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel: Chat Interface */}
        <Card className="col-span-1 lg:col-span-2 h-full flex flex-col border-none shadow-none bg-transparent lg:bg-card lg:border lg:shadow-sm">
           {selectedNewsId ? (
             <DiscussionThread newsId={selectedNewsId} />
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
               <MessageSquare size={48} className="mb-4 opacity-20" />
               <p>Select a topic to join the discussion</p>
             </div>
           )}
        </Card>
      </div>
    </AppLayout>
  );
}

function DiscussionThread({ newsId }: { newsId: number }) {
  const { data: comments, isLoading } = useComments(newsId);
  const createCommentMutation = useCreateComment();
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    createCommentMutation.mutate({ newsId, content }, {
      onSuccess: () => setContent("")
    });
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <>
      <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {comments?.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <Avatar className="h-8 w-8 mt-1 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {comment.user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm silver-text-base">{comment.user.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt!), 'h:mm a · MMM d')}
                    </span>
                  </div>
                  <div className="bg-card p-3 rounded-lg rounded-tl-none border shadow-sm text-sm silver-text-base">
                    {comment.content}
                  </div>
                </div>
              </div>
            ))}
            
            {comments?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No comments yet. Be the first to start the discussion!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <div className="p-4 bg-card border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..." 
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" className="h-[60px] w-[60px] shrink-0 btn-primary" disabled={createCommentMutation.isPending || !content.trim()}>
            {createCommentMutation.isPending ? <Loader2 className="animate-spin" /> : <Send size={20} />}
          </Button>
        </form>
      </div>
    </>
  );
}
