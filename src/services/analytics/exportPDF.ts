import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportDashboardToPDF({
  month,
  metrics,
  monthlySummary,
  propertySummary,
}: {
  month: string;
  metrics: any;
  monthlySummary: any[];
  propertySummary: any[];
}) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Rapport financier - ${month}`, 14, 20);

  let y = 30;

  if (metrics) {
    doc.setFontSize(12);
    doc.text("Indicateurs clés:", 14, y);
    y += 6;
    const metricsText = JSON.stringify(metrics, null, 2).slice(0, 1000);
    doc.setFontSize(10);
    doc.text(metricsText, 14, y);
    y += 20;
  }

  if (monthlySummary && monthlySummary.length) {
    autoTable(doc as any, {
      startY: y,
      head: [["Mois", "In attendu", "Out attendu", "In payé", "Out payé", "Cash Net", "Sans capital"]],
      body: monthlySummary.map((r) => [
        r.month,
        r.inExpected ?? 0,
        r.outExpected ?? 0,
        r.inPaid ?? 0,
        r.outPaid ?? 0,
        r.cashNet ?? 0,
        r.sansCapital ?? 0,
      ]),
    });
    // lastAutoTable should be set by the plugin
    // @ts-ignore
    y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;
  }

  if (propertySummary && propertySummary.length) {
    autoTable(doc as any, {
      startY: y,
      head: [["Propriété", "Net"]],
      body: propertySummary.map((p) => [p.name || p.propertyId || "-", p.net ?? "-"]),
    });
  }

  const filename = `Rapport_financier_${month}.pdf`;
  doc.save(filename);
}
