import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/services/api";
import { toDateInputValue } from "@/utils/date";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const defaultFrom = `${new Date().getFullYear()}-01-01`;
const today = toDateInputValue();

export default function Reports() {
  const { t } = useLanguage();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async (start = from, end = to) => {
    try {
      setLoading(true); setError("");
      const response = await api.get("/reports/summary", { params: { from: start, to: end } });
      setReport(response.data.data);
    } catch (err) { setError(err.response?.data?.message || "Unable to generate report."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    api.get("/reports/summary", { params: { from, to } })
      .then((response) => { if (active) setReport(response.data.data); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to generate report."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  const downloadCsv = async () => {
    try {
      const response = await api.get("/reports/transactions", { params: { from, to } });
      const entries = response.data.data || [];
      const headers = ["Date", "Type", "Category", "Description", "Amount (INR)", "Source"];
      const lines = [headers, ...entries.map((entry) => [new Date(entry.date).toLocaleDateString("en-IN"), entry.type, entry.category, entry.description || "", entry.amount, entry.source || ""])];
      const safeCsvValue = (value) => {
        let text = String(value ?? "");
        if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
        return `"${text.replaceAll('"', '""')}"`;
      };
      const csv = lines.map((line) => line.map(safeCsvValue).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `aquax-finance-${from}-to-${to}.csv`; anchor.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.response?.data?.message || "Unable to export transactions."); }
  };

  const downloadPdf = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("AquaX - Panchayat Operations Report", 14, 18);
    doc.setFontSize(10); doc.text(`Period: ${from} to ${to}`, 14, 26);
    autoTable(doc, { startY: 34, head: [["Metric", "Value"]], body: [
      ["Total receipts", money(report.finance.receipts)], ["Total expenses", money(report.finance.expenses)], [t("Net balance"), money(report.finance.net)],
      ["Villages", String(report.operations.villages)], [t("Consumers"), String(report.operations.consumers)], ["Maintenance reports", String(report.operations.maintenanceReported)],
    ] });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, head: [["Asset type", "Status", "Count"]], body: report.assets.map((item) => [item.type, item.status, String(item.count)]) });
    doc.save(`aquax-report-${from}-to-${to}.pdf`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div><h2 className="text-2xl font-bold tracking-tight">{t("Reports & Analytics")}</h2><p className="text-sm text-muted-foreground">{t("Review operational and financial performance for your Panchayat.")}</p></div>
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <Card><CardHeader><CardTitle>{t("Report period")}</CardTitle><CardDescription>{t("Select a date range for financial summaries and activity counts.")}</CardDescription></CardHeader><CardContent><div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm font-medium">{t("From")}<Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="space-y-1 text-sm font-medium">{t("To")}<Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><Button onClick={() => fetchReport()} disabled={loading || from > to}>{t("Generate report")}</Button><Button variant="outline" onClick={downloadCsv}><FileSpreadsheet className="mr-2 size-4" />{t("Export CSV")}</Button><Button variant="outline" onClick={downloadPdf} disabled={!report}><FileText className="mr-2 size-4" />{t("Export PDF")}</Button></div></CardContent></Card>
      {loading && <p className="text-sm text-muted-foreground">{t("Generating report...")}</p>}
      {report && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          [t("Receipts"), report.finance.receipts], [t("Expenses"), report.finance.expenses], [t("Net balance"), report.finance.net], [t("Consumers"), report.operations.consumers],
        ].map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{label === t("Consumers") ? value : money(value)}</p></CardContent></Card>)}</div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>{t("Assets by type and status")}</CardTitle><CardDescription>{t("Current registered asset distribution")}</CardDescription></CardHeader><CardContent><div className="h-[280px]">{report.assets.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={report.assets}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="type" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#2563eb" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("No asset records.")}</div>}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>{t("Billing status")}</CardTitle><CardDescription>{t("Bill values grouped by current status")}</CardDescription></CardHeader><CardContent className="space-y-3">{report.bills.length ? report.bills.map((bill) => <div key={bill.status} className="flex items-center justify-between border-b pb-3 last:border-0"><div className="flex items-center gap-2"><Badge variant="outline">{t(bill.status.replaceAll("_", " "))}</Badge><span className="text-sm text-muted-foreground">{bill.count} {t("bills")}</span></div><span className="text-sm font-semibold">{money(bill.amount)}</span></div>) : <p className="py-8 text-center text-sm text-muted-foreground">{t("No bills generated.")}</p>}</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle>{t("Low stock alerts")}</CardTitle><CardDescription>{t("Items at or below their configured reorder level")}</CardDescription></CardHeader><CardContent>{report.lowStock.length ? <div className="space-y-2">{report.lowStock.map((item) => <div key={item.name} className="flex items-center justify-between border-b py-2 last:border-0"><span className="text-sm font-medium">{item.name}</span><Badge variant="destructive">{item.quantity} {item.unit} {t("remaining")}</Badge></div>)}</div> : <p className="py-5 text-sm text-muted-foreground">{t("No low-stock items at this time.")}</p>}</CardContent></Card>
      </>}
    </div>
  );
}
