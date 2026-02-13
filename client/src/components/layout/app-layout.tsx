import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MediaPlayer } from "./media-player";
import { useMedia } from "@/hooks/use-media";

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: media } = useMedia();
  // Adjust padding bottom if player exists
  const hasMedia = media && media.length > 0;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden lg:block w-64 fixed inset-y-0 z-20">
        <Sidebar />
      </aside>
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header />
        <main className={`flex-1 p-6 overflow-y-auto ${hasMedia ? 'pb-24' : ''}`}>
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <MediaPlayer />
    </div>
  );
}
