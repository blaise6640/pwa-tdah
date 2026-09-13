import * as XLSX from "xlsx";

export function exportDashboardToExcel({
  month,
  monthlySummary,
  propertySummary,
  flowBreakdown,
  metrics,
}: {
  month: string;
  monthlySummary: any[];
  propertySummary: any[];
  flowBreakdown: { inbound: any[]; outbound: any[] };
  metrics: any;
}) {
  const wb = XLSX.utils.book_new();

  const addSheet = (name: string, data: any[]) => {
    // protect against null/undefined entries which break json_to_sheet (Object.keys on undefined)
    const safeData = Array.isArray(data) ? data.filter((d) => d !== null && d !== undefined) : [];
    const ws = XLSX.utils.json_to_sheet(safeData.length ? safeData : []);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  // Feuille Synthèse mensuelle avec en-têtes lisibles et nouvelles colonnes
  const monthlyExport = (monthlySummary || []).map((r) => ({
    Mois: r.month,
    "In attendu": r.inExpected,
    "Out attendu": r.outExpected,
    "In payé": r.inPaid,
    "Out payé": r.outPaid,
    "Cash Net": r.cashNet,
    "Sans capital": r.sansCapital,
    "In restant": r.inRemaining,
    "Out restant": r.outRemaining,
    "Overdue (in)": r.inOverdue,
    "Overdue (out)": r.outOverdue,
    "Recouvrement": r.recouvrement,
  }));
  addSheet("Synthèse mensuelle", monthlyExport);
  addSheet("Par propriété", propertySummary);
  addSheet("Revenus", flowBreakdown.inbound);
  addSheet("Dépenses", flowBreakdown.outbound);
  // metrics can be undefined; protect the sheet creation
  addSheet("Indicateurs", metrics ? [metrics] : []);

  const filename = `Tableau_de_bord_${month}.xlsx`;
  XLSX.writeFile(wb, filename);
}
