import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { SyncStatus } from "@shared/schema";

interface SyncStatusProps {
  status: SyncStatus | undefined;
  onSync: () => void;
  isSyncing: boolean;
  isLoading: boolean;
}

export function SyncStatusPanel({
  status,
  onSync,
  isSyncing,
  isLoading,
}: SyncStatusProps) {
  const getStatusBadge = () => {
    if (isSyncing) {
      return (
        <Badge variant="secondary" className="animate-pulse">
          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
          Syncing...
        </Badge>
      );
    }
    if (!status?.lastSync) {
      return (
        <Badge variant="outline">
          <AlertCircle className="mr-1 h-3 w-3" />
          Never synced
        </Badge>
      );
    }
    return (
      <Badge variant="default">
        <CheckCircle className="mr-1 h-3 w-3" />
        Synced
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {status?.lastSync && (
          <span className="text-sm text-muted-foreground">
            Last sync: {format(new Date(status.lastSync), "MMM d, h:mm a")}
          </span>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={isSyncing || isLoading}
        data-testid="button-sync-customers"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : "Sync Customers"}
      </Button>
    </div>
  );
}
