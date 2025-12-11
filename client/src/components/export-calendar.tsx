import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import type { ExportActivityEntry } from "@shared/schema";

interface ExportActivityCalendarProps {
  activity?: ExportActivityEntry[];
  isLoading?: boolean;
}

export function ExportActivityCalendar({ activity, isLoading }: ExportActivityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const exportedDates = useMemo(() => {
    return (activity || []).map((entry) => new Date(entry.date));
  }, [activity]);

  const selectedKey = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : undefined;
  const selectedEntry = activity?.find((entry) => entry.date === selectedKey);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Export activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track CSV downloads by day.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{ exported: exportedDates }}
          modifiersClassNames={{ exported: "bg-primary/15 text-primary font-semibold" }}
          disabled={isLoading}
          defaultMonth={selectedDate}
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="bg-primary/15 text-primary">
              Exported
            </Badge>
            <span>dates are highlighted in the calendar.</span>
          </div>
          <Separator />
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading export history...</p>
          ) : selectedEntry ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">
                  {format(new Date(selectedEntry.date), "MMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedEntry.total} export{selectedEntry.total === 1 ? "" : "s"} completed.
                </p>
              </div>
              <div className="space-y-2">
                {selectedEntry.byFormat.map((entry) => (
                  <div
                    key={entry.format}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <span className="text-sm font-medium capitalize">{entry.format}</span>
                    <span className="text-sm text-muted-foreground">
                      {entry.count} export{entry.count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No exports recorded for this day yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
