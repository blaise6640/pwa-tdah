import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { FlowBreakdownRow } from "@/services/analytics/getFlowBreakdown";
import useRecharts from "@/hooks/useRecharts";

export function FlowBreakdownChart({
  inbound,
  outbound,
}: {
  inbound: FlowBreakdownRow[];
  outbound: FlowBreakdownRow[];
}) {
  const dataIn = inbound.map(r => ({ name: r.tag, value: r.paid }));
  const dataOut = outbound.map(r => ({ name: r.tag, value: r.paid }));

  const R = useRecharts();

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      <Box sx={{ width: { xs: "100%", md: "50%" } }}>
        <Typography variant="subtitle1" align="center">Revenus</Typography>
        {!R ? (
          <div style={{ width: "100%", height: 300 }} />
        ) : (
          <R.ResponsiveContainer width="100%" height={300}>
            <R.PieChart>
              <R.Pie data={dataIn} dataKey="value" nameKey="name" outerRadius={100} label />
              <R.Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} €`} />
            </R.PieChart>
          </R.ResponsiveContainer>
        )}
      </Box>
      <Box sx={{ width: { xs: "100%", md: "50%" } }}>
        <Typography variant="subtitle1" align="center">Dépenses</Typography>
        {!R ? (
          <div style={{ width: "100%", height: 300 }} />
        ) : (
          <R.ResponsiveContainer width="100%" height={300}>
            <R.PieChart>
              <R.Pie data={dataOut} dataKey="value" nameKey="name" outerRadius={100} label />
              <R.Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} €`} />
            </R.PieChart>
          </R.ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
}
