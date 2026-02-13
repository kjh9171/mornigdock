import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export function Header() {
  const [isSilverMode, setIsSilverMode] = useState(false);

  useEffect(() => {
    if (isSilverMode) {
      document.body.classList.add("silver-mode");
    } else {
      document.body.classList.remove("silver-mode");
    }
  }, [isSilverMode]);

  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold silver-text-lg">Welcome to Antigravity</h1>
      </div>

      <div className="flex items-center gap-3">
        {isSilverMode ? <Eye className="text-primary" size={20} /> : <EyeOff className="text-muted-foreground" size={20} />}
        <Label htmlFor="silver-mode" className="text-sm font-medium cursor-pointer silver-text-base">
          Silver Mode
        </Label>
        <Switch
          id="silver-mode"
          checked={isSilverMode}
          onCheckedChange={setIsSilverMode}
        />
      </div>
    </header>
  );
}
