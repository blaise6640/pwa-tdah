import * as React from "react";
import useRecharts from "@/hooks/useRecharts";
import { PropertySummaryRow } from "../../components/DashboardWidgets/PropertySummaryHeader";

export function PropertyRankingChart({ rows }: { rows: PropertySummaryRow[] }) {
  const data = [...rows]
    .sort((a, b) => b.net - a.net)
    .slice(0, 10)
    .map((r) => ({
      name: r.propertyName,
      net: r.net,
      color: r.net >= 0 ? "#4caf50" : "#f44336",
      recouvrement: (r.recouvrement * 100).toFixed(1),
    }));

  const fmt = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

  const R = useRecharts();

  if (!R) {
    return <div style={{ width: "100%", height: 300 }} />;
  }

  return (
    <R.ResponsiveContainer width="100%" height={300}>
      <R.BarChart layout="vertical" data={data} margin={{ left: 0, right: 10 }}>
        <R.XAxis type="number" tickFormatter={(v: any) => fmt.format(v)} />
        <R.YAxis dataKey="name" type="category" width={120} />
        <R.Tooltip
          formatter={(value: any) => fmt.format(Number(value || 0))}
          labelFormatter={(label: any) => `Propriété : ${label}`}
        />
        <R.Bar dataKey="net" barSize={14}>
          {data.map((entry, index) => (
            <R.Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </R.Bar>
      </R.BarChart>
    </R.ResponsiveContainer>
  );
}
