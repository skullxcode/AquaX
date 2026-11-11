import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>

            <h3 className="text-2xl font-bold tracking-tight">
              {value}
            </h3>
          </div>

          <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
            {Icon && <Icon size={21} />}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`font-semibold ${
                trend === "up" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {trend === "up" ? "↑" : "↓"} {trendLabel}
            </span>
          )}

          <span className="text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}