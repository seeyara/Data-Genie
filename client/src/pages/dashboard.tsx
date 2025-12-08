import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatsCards } from "@/components/stats-cards";
import { FiltersPanel } from "@/components/filters-panel";
import { CustomersTable } from "@/components/customers-table";
import { PaginationControls } from "@/components/pagination-controls";
import { SyncStatusPanel } from "@/components/sync-status";
import { ExportButton } from "@/components/export-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, Store } from "lucide-react";
import type { 
  CustomerFilter, 
  CustomerListResponse, 
  StatsSummary, 
  SyncStatus 
} from "@shared/schema";

const defaultFilters: CustomerFilter = {
  page: 1,
  pageSize: 25,
  sortBy: "createdAtShopify",
  sortOrder: "desc",
};

function buildQueryString(filters: CustomerFilter): string {
  const params = new URLSearchParams();
  
  if (filters.genderInferred?.length) {
    filters.genderInferred.forEach((g) => params.append("genderInferred", g));
  }
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  if (filters.lastOrderFrom) params.set("lastOrderFrom", filters.lastOrderFrom);
  if (filters.lastOrderTo) params.set("lastOrderTo", filters.lastOrderTo);
  if (filters.city) params.set("city", filters.city);
  if (filters.country) params.set("country", filters.country);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.emailContains) params.set("emailContains", filters.emailContains);
  if (filters.nameContains) params.set("nameContains", filters.nameContains);
  if (filters.minConfidence) params.set("minConfidence", String(filters.minConfidence));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  
  return params.toString();
}

export default function Dashboard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<CustomerFilter>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<CustomerFilter>(defaultFilters);
  const [isExporting, setIsExporting] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const queryString = buildQueryString(appliedFilters);

  const { data: customersData, isLoading: customersLoading } = useQuery<CustomerListResponse>({
    queryKey: ["/api/customers?" + queryString],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<StatsSummary>({
    queryKey: ["/api/stats/summary"],
  });

  const { data: syncStatus, isLoading: syncStatusLoading } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
  });

  const { data: filterOptions } = useQuery<{
    tags: string[];
    countries: string[];
    cities: string[];
  }>({
    queryKey: ["/api/customers/filter-options"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/sync/customers");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync started",
        description: "Customer sync has been initiated. This may take a few minutes.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/customers/filter-options"] });
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...filters, page: 1 });
    setMobileFiltersOpen(false);
  }, [filters]);

  const handleClearFilters = useCallback(() => {
    const cleared = { ...defaultFilters };
    setFilters(cleared);
    setAppliedFilters(cleared);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setAppliedFilters((prev) => ({ ...prev, page }));
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleSortChange = useCallback((sortBy: CustomerFilter["sortBy"]) => {
    setAppliedFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }));
    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }));
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const qs = buildQueryString({ ...appliedFilters, page: 1, pageSize: 10000 });
      const res = await fetch(`/api/customers/export?${qs}`);
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export complete",
        description: "Your CSV file has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [appliedFilters, toast]);

  const filtersPanel = (
    <FiltersPanel
      filters={filters}
      onFiltersChange={setFilters}
      onApply={handleApplyFilters}
      onClear={handleClearFilters}
      distinctTags={filterOptions?.tags || []}
      distinctCountries={filterOptions?.countries || []}
      distinctCities={filterOptions?.cities || []}
      isLoading={customersLoading}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Shopify Customer Segmenter</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <SyncStatusPanel
                status={syncStatus}
                onSync={() => syncMutation.mutate()}
                isSyncing={syncMutation.isPending}
                isLoading={syncStatusLoading}
              />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-80 border-r bg-card min-h-[calc(100vh-4rem)] p-6 sticky top-16">
          {filtersPanel}
        </aside>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl">
          <div className="md:hidden mb-4">
            <SyncStatusPanel
              status={syncStatus}
              onSync={() => syncMutation.mutate()}
              isSyncing={syncMutation.isPending}
              isLoading={syncStatusLoading}
            />
          </div>

          <div className="space-y-6">
            <StatsCards stats={stats} isLoading={statsLoading} />

            <div className="lg:hidden">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  {filtersPanel}
                </SheetContent>
              </Sheet>
            </div>

            <div>
              <ExportButton
                totalCount={customersData?.pagination.totalCount || 0}
                isExporting={isExporting}
                onExport={handleExport}
              />

              <CustomersTable
                customers={customersData?.data || []}
                isLoading={customersLoading}
                sortBy={appliedFilters.sortBy}
                sortOrder={appliedFilters.sortOrder}
                onSortChange={handleSortChange}
              />

              <PaginationControls
                page={customersData?.pagination.page || 1}
                pageSize={customersData?.pagination.pageSize || 25}
                totalCount={customersData?.pagination.totalCount || 0}
                totalPages={customersData?.pagination.totalPages || 1}
                onPageChange={handlePageChange}
                isLoading={customersLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
