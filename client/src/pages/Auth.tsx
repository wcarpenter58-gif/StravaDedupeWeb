import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthPage() {
  const handleLogin = () => {
    // Redirect to backend auth endpoint
    window.location.href = "/api/auth/strava/login";
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-background px-4 py-16 text-center overflow-hidden relative">
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-orange-200/20 blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl"
      >
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-600 text-white shadow-xl shadow-orange-500/20">
          <Activity className="h-10 w-10" />
        </div>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
          Clean up your <br />
          <span className="bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
            Strava Activity Feed
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Automatically detect and manage duplicate activities recorded from multiple devices. 
          Keep your stats accurate and your feed clean.
        </p>

        <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="h-14 bg-[#fc4c02] px-8 text-lg font-semibold hover:bg-[#e34402] shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
          >
            Connect with Strava
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 text-left">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-bold">Instant Scan</h3>
            <p className="text-sm text-muted-foreground">
              Analyze your last 50 activities in seconds to find overlapping times and dates.
            </p>
          </div>
          
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-bold">Safe & Secure</h3>
            <p className="text-sm text-muted-foreground">
              Read-only access to find duplicates. You choose what to delete on Strava.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-bold">Device Conflict</h3>
            <p className="text-sm text-muted-foreground">
              Perfect for users who record with a Garmin/Wahoo and an Apple Watch simultaneously.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
