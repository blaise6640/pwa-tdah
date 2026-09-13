import * as React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { sumAnnual } from "../analytics/summary";
import { MonthlySummaryRow } from "../analytics/summary";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);
}

export default function KPICards({ rows }: { rows: MonthlySummaryRow[] }) {
  const agg = sumAnnual(rows);

  return (
    <Box display="flex" gap={2} flexWrap="wrap">
      <Card sx={{ minWidth: 180 }}>
        <CardContent>
          <Typography variant="subtitle2">Encaissements attendus</Typography>
          <Typography variant="h6">{fmt(agg.inExpected)}</Typography>
        </CardContent>
      </Card>
      <Card sx={{ minWidth: 180 }}>
        <CardContent>
          <Typography variant="subtitle2">Encaissements payés</Typography>
          <Typography variant="h6">{fmt(agg.inPaid)}</Typography>
        </CardContent>
      </Card>
      <Card sx={{ minWidth: 180 }}>
        <CardContent>
          <Typography variant="subtitle2">Taux de recouvrement</Typography>
          <Typography variant="h6">{Math.round((agg.recouvrement || 0) * 100)}%</Typography>
        </CardContent>
      </Card>
      <Card sx={{ minWidth: 180 }}>
        <CardContent>
          <Typography variant="subtitle2">Décaissements payés</Typography>
          <Typography variant="h6">{fmt(agg.outPaid)}</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
