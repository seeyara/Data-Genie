import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserX, UserMinus, Clock, CalendarDays, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import type { StatsSummary } from "@shared/schema";

interface StatsCardsProps {
  stats: StatsSummary | undefined;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statItems = [
    {
      label: "TOTAL CUSTOMERS",
      value: stats?.totalCustomers ?? 0,
      subtext: `${stats?.pendingEnrichment ?? 0} pending enrichment`,
      icon: Users,
      testId: "stat-total-customers",
    },
    {
      label: "FEMALE",
      value: stats?.femaleCount ?? 0,
      subtext: `${stats?.totalCustomers ? Math.round((stats.femaleCount / stats.totalCustomers) * 100) : 0}% of total`,
      icon: UserCheck,
      testId: "stat-female-count",
    },
    {
      label: "MALE",
      value: stats?.maleCount ?? 0,
      subtext: `${stats?.totalCustomers ? Math.round((stats.maleCount / stats.totalCustomers) * 100) : 0}% of total`,
      icon: UserMinus,
      testId: "stat-male-count",
    },
    {
      label: "UNKNOWN",
      value: stats?.unknownCount ?? 0,
      subtext: `${stats?.totalCustomers ? Math.round((stats.unknownCount / stats.totalCustomers) * 100) : 0}% of total`,
      icon: UserX,
      testId: "stat-unknown-count",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold" data-testid={stat.testId}>
                {stat.value.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stat.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                TOTAL REVENUE
              </span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-total-revenue">
              ${(stats?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground mt-1">from all customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                AVG ORDER VALUE
              </span>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-avg-order-value">
              ${(stats?.averageOrderValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground mt-1">per order</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                AVG CUSTOMER LTV
              </span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-avg-ltv">
              ${(stats?.averageLtv ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground mt-1">per customer</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                NEW LAST 7 DAYS
              </span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-last-7-days">
              {(stats?.customersLast7Days ?? 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">customers added</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                NEW LAST 30 DAYS
              </span>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold" data-testid="stat-last-30-days">
              {(stats?.customersLast30Days ?? 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">customers added</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
