import { DuplicateGroup as IDuplicateGroup, useDeleteActivity } from "@/hooks/use-strava";
import { ActivityCard } from "./ActivityCard";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface DuplicateGroupProps {
  group: IDuplicateGroup;
  index: number;
}

export function DuplicateGroup({ group, index }: DuplicateGroupProps) {
  const date = parseISO(group.startTime);
  const { mutate: deleteActivity, isPending: isDeleting } = useDeleteActivity();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteActivity(id, {
      onSuccess: () => {
        toast({
          title: "Activity deleted",
          description: "The activity has been removed from Strava.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete",
          description: error.message || "An error occurred while deleting.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{format(date, "MMMM d, yyyy")}</h3>
            <p className="text-sm text-muted-foreground">
              {format(date, "h:mm a")} • {group.activities.length} conflicting activities
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-orange-600">Potential Duplicate</p>
          <p className="text-xs text-muted-foreground">Recorded simultaneously</p>
        </div>
      </div>

      <div className="grid gap-6 bg-slate-50/50 p-6 md:grid-cols-2 lg:grid-cols-3">
        {group.activities.map((activity) => (
          <div key={activity.id} className="relative group">
             <ActivityCard activity={activity} />
             {activity.distance < 100 && ( // 0.1km = 100m
               <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button
                   size="icon"
                   variant="destructive"
                   className="h-8 w-8 rounded-full shadow-lg"
                   onClick={() => {
                     const url = `https://www.strava.com/activities/${activity.id}`;
                     window.open(url, '_blank');
                   }}
                   title="Delete on Strava"
                 >
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
             )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
