import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ArrowUp, ArrowDown, Users } from "lucide-react";
import { format } from "date-fns";
import type { Customer, CustomerFilter } from "@shared/schema";

interface CustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
  sortBy?: CustomerFilter["sortBy"];
  sortOrder?: CustomerFilter["sortOrder"];
  onSortChange: (sortBy: CustomerFilter["sortBy"]) => void;
}

export function CustomersTable({
  customers,
  isLoading,
  sortBy,
  sortOrder,
  onSortChange,
}: CustomersTableProps) {
  const getSortIcon = (column: CustomerFilter["sortBy"]) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const handleSort = (column: CustomerFilter["sortBy"]) => {
    onSortChange(column);
  };

  const getGenderBadgeVariant = (gender: string | null | undefined) => {
    switch (gender) {
      case "female":
        return "default";
      case "male":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Name</TableHead>
              <TableHead className="min-w-[220px]">Email</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(8)].map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No customers found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Try adjusting your filters or sync customers from your Shopify store to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 text-xs font-medium uppercase tracking-wide"
                onClick={() => handleSort("firstName")}
                data-testid="sort-name"
              >
                Name
                {getSortIcon("firstName")}
              </Button>
            </TableHead>
            <TableHead className="min-w-[220px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 text-xs font-medium uppercase tracking-wide"
                onClick={() => handleSort("email")}
                data-testid="sort-email"
              >
                Email
                {getSortIcon("email")}
              </Button>
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide">
              City
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide">
              Country
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide">
              Tags
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide">
              Gender
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 text-xs font-medium uppercase tracking-wide"
                onClick={() => handleSort("createdAtShopify")}
                data-testid="sort-created"
              >
                Created
                {getSortIcon("createdAtShopify")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 text-xs font-medium uppercase tracking-wide"
                onClick={() => handleSort("lastOrderAt")}
                data-testid="sort-last-order"
              >
                Last Order
                {getSortIcon("lastOrderAt")}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
              <TableCell className="font-medium">
                {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {customer.email || "—"}
              </TableCell>
              <TableCell>{customer.city || "—"}</TableCell>
              <TableCell>{customer.country || "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {customer.tags ? (
                    customer.tags.split(",").slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {customer.tags && customer.tags.split(",").length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{customer.tags.split(",").length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={getGenderBadgeVariant(customer.genderInferred)}
                    className="capitalize"
                  >
                    {customer.genderInferred || "pending"}
                  </Badge>
                  {customer.genderConfidence !== null && customer.genderConfidence !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(customer.genderConfidence * 100)}%
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {customer.createdAtShopify
                  ? format(new Date(customer.createdAtShopify), "MMM d, yyyy")
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {customer.lastOrderAt
                  ? format(new Date(customer.lastOrderAt), "MMM d, yyyy")
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
