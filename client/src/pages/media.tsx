import { useMedia } from "@/hooks/use-media";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Music, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Media() {
  const { data: media, isLoading } = useMedia();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-display font-bold mb-2 silver-text-lg">Media Lounge</h2>
          <p className="text-muted-foreground silver-text-base">Listen to briefings and community playlists.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {media?.map((item) => (
            <Card key={item.id} className="group overflow-hidden card-hover">
              <div className="aspect-square bg-muted relative">
                {item.coverUrl ? (
                  <img 
                    src={item.coverUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <Music className="text-muted-foreground opacity-20" size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                   <Button size="icon" className="rounded-full h-14 w-14 btn-primary">
                     <Play size={24} className="ml-1" />
                   </Button>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                    {item.type === 'briefing' ? <Radio size={10} /> : <Music size={10} />}
                    <span className="capitalize">{item.type}</span>
                  </span>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-bold truncate silver-text-base">{item.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{item.artist || "Antigravity Original"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
