import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

// Types derived from backend logic
export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  device_name?: string;
  external_id?: string;
}

export interface DuplicateGroup {
  startTime: string;
  activities: StravaActivity[];
  durationDifference: number;
}

export interface ScanResult {
  scannedCount: number;
  duplicatesFound: number;
  groups: DuplicateGroup[];
}

export interface AuthStatus {
  isAuthenticated: boolean;
  user?: {
    stravaId?: number;
    displayName?: string | null;
  };
}

export function useAuth() {
  return useQuery({
    queryKey: [api.auth.status.path],
    queryFn: async () => {
      const res = await fetch(api.auth.status.path);
      if (!res.ok) throw new Error("Failed to fetch auth status");
      return await res.json() as AuthStatus;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate auth query to trigger UI update (redirect to login)
      queryClient.invalidateQueries({ queryKey: [api.auth.status.path] });
      // Reset scan results
      queryClient.setQueryData([api.activities.scan.path], null);
    },
  });
}

export function useScanActivities(before?: string, after?: string) {
  return useQuery({
    queryKey: [api.activities.scan.path, before, after],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (before) params.append("before", before);
      if (after) params.append("after", after);
      const url = `${api.activities.scan.path}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to scan activities");
      }
      return await res.json() as ScanResult;
    },
    enabled: false, // Don't run automatically, wait for user action
    retry: false,
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(api.activities.delete.path.replace(":id", id.toString()), {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete activity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activities.scan.path] });
    },
  });
}
