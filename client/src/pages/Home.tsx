import { useAuth, useScanActivities } from "@/hooks/use-strava";
import { Button } from "@/components/ui/button";
import { Loader2, Search, CheckCircle2, RotateCcw, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DuplicateGroup } from "@/components/DuplicateGroup";
import AuthPage from "./Auth";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { format, subDays, startOfYear, endOfYear } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Home() {
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const years = Array.from({ length: 2026 - 2008 + 1 }, (_, i) => 2026 - i);

  const handleYearSelect = (year: string) => {
    const yearNum = parseInt(year);
    setStartDate(startOfYear(new Date(yearNum, 0, 1)));
    setEndDate(endOfYear(new Date(yearNum, 0, 1)));
  };

  const { data: auth, isLoading: authLoading } = useAuth();
  const { 
    data: scanResults, 
    refetch: scan, 
    isFetching: isScanning, 
    isError, 
    error 
  } = useScanActivities(
    endDate?.toISOString(),
    startDate?.toISOString()
  );

  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
      </div>
    );
  }

  // If not logged in, show Auth Page
  if (!auth?.isAuthenticated) {
    return <AuthPage />;
  }

  const hasResults = scanResults !== undefined;
  const duplicateCount = scanResults?.duplicatesFound || 0;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Activity Scanner</h1>
        <p className="text-muted-foreground">
          Welcome back, {auth.user?.displayName}. Ready to clean up your feed?
        </p>
      </div>

      <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center justify-center rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 w-full">
          <label className="mb-2 block text-sm font-medium">Quick Year Select</label>
          <Select onValueChange={handleYearSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a full year to scan" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  Full Year {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-8 grid w-full gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {!hasResults && !isScanning && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Start Scanning</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              We'll check your activities for overlapping times between the selected dates.
            </p>
            <Button 
              size="lg" 
              onClick={() => scan()}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={!startDate || !endDate}
            >
              Scan Now
            </Button>
          </div>
        )}

        {isScanning && (
          <div className="text-center">
             <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Scanning Strava...</h2>
            <p className="text-sm text-muted-foreground">
              Fetching your activities and analyzing timestamps for the selected period.
            </p>
          </div>
        )}

        {hasResults && !isScanning && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${duplicateCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
              {duplicateCount > 0 ? (
                <span className="text-2xl font-bold">{duplicateCount}</span>
              ) : (
                <CheckCircle2 className="h-8 w-8" />
              )}
            </div>
            <h2 className="mb-2 text-xl font-bold">
              {duplicateCount > 0 ? 'Duplicates Found' : 'No Duplicates Found'}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Scanned {scanResults?.scannedCount} activities from {startDate && format(startDate, "MMM d")} to {endDate && format(endDate, "MMM d")}.
            </p>
            <Button variant="outline" onClick={() => scan()} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Scan Again
            </Button>
          </motion.div>
        )}
      </div>

      {isError && (
        <div className="mx-auto mb-8 max-w-lg rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive">
          <p>Error scanning activities: {(error as Error).message}</p>
        </div>
      )}

      {/* Results List */}
      <AnimatePresence>
        {scanResults?.groups && scanResults.groups.length > 0 && (
          <div className="space-y-6">
            <h3 className="mb-4 text-xl font-bold">Duplicate Sets</h3>
            {scanResults.groups.map((group, i) => (
              <DuplicateGroup key={group.startTime} group={group} index={i} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
