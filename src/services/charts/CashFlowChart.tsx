import * as React from "react";
import useRecharts from "@/hooks/useRecharts";
import dayjs from "dayjs";
import { MonthlySummaryRow } from "../analytics/summary";

const nf = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

export default function CashFlowChart({ data }: { data: MonthlySummaryRow[] }) {
  const chartData = data.map((r) => ({
    ...r,
    label: dayjs(`${r.month}-01`).format("MMM"),
  }));

  const R = useRecharts();

  return (
    <div style={{ width: "100%", height: 320 }}>
      {!R ? (
        <div style={{ width: "100%", height: 320 }} />
      ) : (
        <R.ResponsiveContainer>
          <R.LineChart data={chartData}>
            <R.CartesianGrid strokeDasharray="3 3" />
            <R.XAxis dataKey="label" />
            <R.YAxis />
            <R.Tooltip formatter={(value: any) => nf.format(Number(value || 0))} />
            <R.Line type="monotone" dataKey="inExpected" stroke="#8884d8" dot={false} />
            <R.Line type="monotone" dataKey="inPaid" stroke="#82ca9d" dot={false} />
            <R.Line type="monotone" dataKey="outExpected" stroke="#ff7f50" dot={false} />
            <R.Line type="monotone" dataKey="outPaid" stroke="#ff0000" dot={false} />
          </R.LineChart>
        </R.ResponsiveContainer>
      )}
    </div>
  );
}
