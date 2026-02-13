import { useStats } from "@/hooks/use-stats";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Newspaper, Activity, ArrowUpRight } from "lucide-react";
import { useNews } from "@/hooks/use-news";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats } = useStats();
  const { data: news } = useNews();

  const recentNews = news?.slice(0, 3) || [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-display font-bold mb-2 silver-text-lg">Dashboard</h2>
          <p className="text-muted-foreground silver-text-base">Overview of platform activity and recent updates.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold silver-text-lg">{stats?.usersCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                News Articles
              </CardTitle>
              <Newspaper className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold silver-text-lg">{stats?.newsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Updated hourly</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Now
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold silver-text-lg">{stats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Users online</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle className="silver-text-lg">Recent News</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentNews.map((item) => (
                  <div key={item.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="font-medium silver-text-base">{item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.summary || item.content}</p>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                          {item.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.publishedAt ? format(new Date(item.publishedAt), 'MMM d, yyyy') : 'Draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {recentNews.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No news available yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="silver-text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Engine</span>
                  <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database</span>
                  <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">MFA Service</span>
                  <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    Active
                  </span>
                </div>
                
                <div className="mt-8 pt-6 border-t border-primary/10">
                  <h4 className="font-semibold mb-2">Security Tip</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable MFA on your account to ensure maximum security for your data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
