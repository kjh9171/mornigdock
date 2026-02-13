import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="h-8 w-8 text-orange-600" />
      </div>
      <h1 className="text-4xl font-display font-bold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you are looking for does not exist or has been moved to another location.
      </p>
      <Link href="/">
        <Button className="btn-primary">Return Home</Button>
      </Link>
    </div>
  );
}
