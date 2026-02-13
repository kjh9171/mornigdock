import { useNews, useAnalyzeNews } from "@/hooks/use-news";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainCircuit, MessageCircle, Share2, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Briefing() {
  const { data: news, isLoading } = useNews();
  const analyzeMutation = useAnalyzeNews();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold mb-2 silver-text-lg">News Briefing</h2>
            <p className="text-muted-foreground silver-text-base">AI-curated insights and analysis.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news?.map((item) => (
            <Card key={item.id} className="flex flex-col h-full overflow-hidden card-hover border-t-4 border-t-primary">
              {item.imageUrl && (
                <div className="h-48 overflow-hidden bg-muted">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="capitalize">{item.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {item.publishedAt ? format(new Date(item.publishedAt), 'MMM d, yyyy') : 'Draft'}
                  </span>
                </div>
                <CardTitle className="leading-tight silver-text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {/* AI Summary Section */}
                <div className="bg-muted/30 p-4 rounded-lg border border-primary/10">
                  <div className="flex items-center gap-2 mb-2 text-primary font-medium text-sm">
                    <Sparkles size={14} />
                    <span>AI Summary</span>
                  </div>
                  <p className="text-sm text-muted-foreground silver-text-base">
                    {item.summary || "Pending analysis..."}
                  </p>
                </div>

                {/* Generational Reaction */}
                {item.generationalReaction && (
                  <div className="text-sm">
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      <BrainCircuit size={14} className="text-primary" />
                      Generational Impact
                    </h4>
                    <p className="text-muted-foreground text-xs italic silver-text-base">{item.generationalReaction}</p>
                  </div>
                )}
                
                {/* Discussion Question */}
                {item.discussionQuestion && (
                  <div className="text-sm border-l-2 border-primary pl-3 py-1">
                    <p className="font-medium text-foreground silver-text-base">"{item.discussionQuestion}"</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-4 border-t flex items-center justify-between gap-2">
                <Link href={`/community?newsId=${item.id}`}>
                   <Button variant="ghost" size="sm" className="gap-2">
                     <MessageCircle size={16} />
                     Discuss
                   </Button>
                </Link>
                
                {!item.analysis && (
                  <Button 
                    size="sm" 
                    onClick={() => analyzeMutation.mutate(item.id)}
                    disabled={analyzeMutation.isPending}
                    variant="outline"
                  >
                    {analyzeMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Analyze
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}

          {news?.length === 0 && (
            <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed">
              <h3 className="text-lg font-medium text-muted-foreground">No news articles found</h3>
              <p className="text-sm text-muted-foreground/60">Check back later for updates.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
