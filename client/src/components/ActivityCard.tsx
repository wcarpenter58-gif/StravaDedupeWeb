import { StravaActivity } from "@/hooks/use-strava";
import { format } from "date-fns";
import { Clock, Navigation, Zap, ExternalLink, Watch } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActivityCardProps {
  activity: StravaActivity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  // Helpers for formatting
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${secs}s`;
  };

  const formatDistance = (meters: number) => {
    return `${(meters / 1000).toFixed(2)} km`;
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Badge variant="outline" className="mb-2 border-primary/20 bg-primary/5 text-primary">
            {activity.type}
          </Badge>
          <h4 className="line-clamp-1 font-semibold text-lg">{activity.name}</h4>
          <p className="text-xs text-muted-foreground">ID: {activity.id}</p>
        </div>
        <a 
          href={`https://www.strava.com/activities/${activity.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 text-primary/70" />
          <span>{formatDuration(activity.moving_time)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Navigation className="h-4 w-4 text-primary/70" />
          <span>{formatDistance(activity.distance)}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="h-4 w-4 text-primary/70" />
          <span>{activity.total_elevation_gain}m elev</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Watch className="h-4 w-4 text-primary/70" />
          <span className="truncate max-w-[100px]" title={activity.device_name || "Unknown Device"}>
            {activity.device_name || "Unknown Device"}
          </span>
        </div>
      </div>
      
      {/* Decorative gradient overlay on hover */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
