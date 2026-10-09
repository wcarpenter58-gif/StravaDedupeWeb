import { Link } from "wouter";
import { LogOut, Activity } from "lucide-react";
import { useAuth, useLogout } from "@/hooks/use-strava";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: auth } = useAuth();
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">DeDupe<span className="text-primary">.run</span></span>
        </Link>

        {auth?.isAuthenticated && (
          <div className="flex items-center gap-4">
            <div className="hidden text-sm font-medium text-muted-foreground md:block">
              {auth.user?.displayName}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
