import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X, Filter, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CustomerFilter, Gender } from "@shared/schema";

interface FiltersPanelProps {
  filters: CustomerFilter;
  onFiltersChange: (filters: CustomerFilter) => void;
  onApply: () => void;
  onClear: () => void;
  distinctTags: string[];
  distinctCountries: string[];
  distinctCities: string[];
  isLoading?: boolean;
}

export function FiltersPanel({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  distinctTags,
  distinctCountries,
  distinctCities,
  isLoading,
}: FiltersPanelProps) {
  const updateFilter = <K extends keyof CustomerFilter>(
    key: K,
    value: CustomerFilter[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleGenderChange = (gender: Gender) => {
    const current = filters.genderInferred || [];
    const updated = current.includes(gender)
      ? current.filter((g) => g !== gender)
      : [...current, gender];
    updateFilter("genderInferred", updated.length > 0 ? updated : undefined);
  };

  const genderOptions: Gender[] = ["male", "female", "unknown"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Filters</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Gender
          </Label>
          <div className="flex flex-wrap gap-2">
            {genderOptions.map((gender) => (
              <Badge
                key={gender}
                variant={filters.genderInferred?.includes(gender) ? "default" : "outline"}
                className="cursor-pointer capitalize toggle-elevate"
                onClick={() => handleGenderChange(gender)}
                data-testid={`filter-gender-${gender}`}
              >
                {gender}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Created Date Range
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.createdFrom && "text-muted-foreground"
                    )}
                    data-testid="filter-created-from"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.createdFrom
                      ? format(new Date(filters.createdFrom), "MMM d, yyyy")
                      : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.createdFrom ? new Date(filters.createdFrom) : undefined}
                    onSelect={(date) =>
                      updateFilter("createdFrom", date?.toISOString())
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.createdTo && "text-muted-foreground"
                    )}
                    data-testid="filter-created-to"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.createdTo
                      ? format(new Date(filters.createdTo), "MMM d, yyyy")
                      : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.createdTo ? new Date(filters.createdTo) : undefined}
                    onSelect={(date) =>
                      updateFilter("createdTo", date?.toISOString())
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Last Order Date Range
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.lastOrderFrom && "text-muted-foreground"
                    )}
                    data-testid="filter-last-order-from"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.lastOrderFrom
                      ? format(new Date(filters.lastOrderFrom), "MMM d, yyyy")
                      : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.lastOrderFrom ? new Date(filters.lastOrderFrom) : undefined}
                    onSelect={(date) =>
                      updateFilter("lastOrderFrom", date?.toISOString())
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.lastOrderTo && "text-muted-foreground"
                    )}
                    data-testid="filter-last-order-to"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.lastOrderTo
                      ? format(new Date(filters.lastOrderTo), "MMM d, yyyy")
                      : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.lastOrderTo ? new Date(filters.lastOrderTo) : undefined}
                    onSelect={(date) =>
                      updateFilter("lastOrderTo", date?.toISOString())
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Country
          </Label>
          <Select
            value={filters.country || "all"}
            onValueChange={(value) =>
              updateFilter("country", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger data-testid="filter-country">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {distinctCountries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            City
          </Label>
          <Select
            value={filters.city || "all"}
            onValueChange={(value) =>
              updateFilter("city", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger data-testid="filter-city">
              <SelectValue placeholder="All cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {distinctCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Tag
          </Label>
          <Select
            value={filters.tag || "all"}
            onValueChange={(value) =>
              updateFilter("tag", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger data-testid="filter-tag">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {distinctTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Email Contains
          </Label>
          <Input
            placeholder="Search by email..."
            value={filters.emailContains || ""}
            onChange={(e) => updateFilter("emailContains", e.target.value || undefined)}
            data-testid="filter-email-contains"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Name Contains
          </Label>
          <Input
            placeholder="Search by name..."
            value={filters.nameContains || ""}
            onChange={(e) => updateFilter("nameContains", e.target.value || undefined)}
            data-testid="filter-name-contains"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Min Confidence: {Math.round((filters.minConfidence || 0) * 100)}%
          </Label>
          <Slider
            value={[filters.minConfidence || 0]}
            onValueChange={([value]) => updateFilter("minConfidence", value || undefined)}
            max={1}
            step={0.05}
            className="w-full"
            data-testid="filter-min-confidence"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Total Spent Range
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Min</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minTotalSpent ?? ""}
                onChange={(e) => updateFilter("minTotalSpent", e.target.value ? parseFloat(e.target.value) : undefined)}
                data-testid="filter-min-total-spent"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Max</Label>
              <Input
                type="number"
                placeholder="No limit"
                value={filters.maxTotalSpent ?? ""}
                onChange={(e) => updateFilter("maxTotalSpent", e.target.value ? parseFloat(e.target.value) : undefined)}
                data-testid="filter-max-total-spent"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Orders Count Range
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Min</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minOrdersCount ?? ""}
                onChange={(e) => updateFilter("minOrdersCount", e.target.value ? parseInt(e.target.value) : undefined)}
                data-testid="filter-min-orders-count"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Max</Label>
              <Input
                type="number"
                placeholder="No limit"
                value={filters.maxOrdersCount ?? ""}
                onChange={(e) => updateFilter("maxOrdersCount", e.target.value ? parseInt(e.target.value) : undefined)}
                data-testid="filter-max-orders-count"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <Button
          className="w-full"
          onClick={onApply}
          disabled={isLoading}
          data-testid="button-apply-filters"
        >
          <Filter className="mr-2 h-4 w-4" />
          Apply Filters
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={onClear}
          disabled={isLoading}
          data-testid="button-clear-filters"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
