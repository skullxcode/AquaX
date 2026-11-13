import { useEffect, useMemo, useState } from "react";
import { CreditCard, FilePlus2, RefreshCw, ReceiptText, RotateCcw } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/services/api";
import { toDateInputValue } from "@/utils/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const today = toDateInputValue();
const currentDate = new Date();
const monthStart = toDateInputValue(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
const className = "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Billing() {
  const { user } = useAuth();
  const canAdminister = ["SUPER_ADMIN", "PANCHAYAT_ADMIN"].includes(user?.role);
  const { t } = useLanguage();
  const [bills, setBills] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [consumerId, setConsumerId] = useState("");
  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setError("");
      const [billResponse, consumerResponse] = await Promise.all([api.get("/bills"), api.get("/consumers")]);
      setBills(billResponse.data.data || []);
      setConsumers(consumerResponse.data.data || []);
    } catch (err) { setError(err.response?.data?.message || "Unable to load billing information."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/bills"), api.get("/consumers")])
      .then(([billResponse, consumerResponse]) => {
        if (!active) return;
        setBills(billResponse.data.data || []);
        setConsumers(consumerResponse.data.data || []);
      })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to load billing information."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => bills.reduce((result, bill) => {
    const paid = bill.payments?.filter((payment) => payment.status === "SUCCESS").reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
    result.billed += Number(bill.amount);
    result.collected += paid;
    result.outstanding += Math.max(0, Number(bill.amount) - paid);
    return result;
  }, { billed: 0, collected: 0, outstanding: 0 }), [bills]);

  const createBill = async (event) => {
    event.preventDefault();
    try {
      setSaving(true); setError("");
      const payload = { consumerId, periodStart, periodEnd, dueDate };
      if (amount.trim()) payload.amount = Number(amount);
      await api.post("/bills", payload);
      setAmount("");
      await loadData();
    } catch (err) { setError(err.response?.data?.message || "Unable to generate bill."); }
    finally { setSaving(false); }
  };

  const startPayment = (bill) => {
    const paid = bill.payments?.filter((payment) => payment.status === "SUCCESS").reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
    const outstanding = Math.max(0, Number(bill.amount) - paid);
    setSelectedBill(bill);
    setPaymentAmount(outstanding.toFixed(2));
    setPaymentMethod("CASH");
    setPaymentReference("");
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!selectedBill) return;
    try {
      setSaving(true); setError("");
      await api.post(`/bills/${selectedBill.id}/payments`, { amount: Number(paymentAmount), method: paymentMethod, reference: paymentReference || undefined });
      setSelectedBill(null);
      await loadData();
    } catch (err) { setError(err.response?.data?.message || "Unable to record payment."); }
    finally { setSaving(false); }
  };

  const reversePayment = async (bill, payment) => {
    const reason = window.prompt("Enter the reason for reversing this payment (minimum 5 characters):");
    if (!reason || reason.trim().length < 5) return;
    try {
      setSaving(true);
      setError("");
      await api.post(`/bills/${bill.id}/payments/${payment.id}/reverse`, { reason: reason.trim() });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reverse this payment.");
    } finally {
      setSaving(false);
    }
  };

  const downloadReceipt = (bill, payment) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("AquaX", 18, 22);
    doc.setFontSize(11);
    doc.text("Water Fee Payment Receipt", 18, 31);
    doc.line(18, 36, 192, 36);
    const details = [
      ["Receipt reference", payment.reference || payment.id],
      ["Panchayat", user?.panchayat?.name || "Gram Panchayat"],
      ["Consumer", bill.consumer?.name || ""],
      ["Consumer number", bill.consumer?.consumerNo || ""],
      ["Village", bill.consumer?.village?.name || ""],
      ["Bill ID", bill.id],
      ["Payment date", payment.paidAt ? new Date(payment.paidAt).toLocaleString("en-IN") : ""],
      ["Payment method", payment.method?.replaceAll("_", " ") || ""],
      ["Amount received", money(payment.amount)],
    ];
    autoTable(doc, { startY: 44, theme: "grid", head: [["Particulars", "Details"]], body: details });
    doc.setFontSize(9);
    doc.text("This is a computer-generated receipt from AquaX.", 18, doc.lastAutoTable.finalY + 14);
    doc.save(`AquaX-receipt-${payment.id}.pdf`);
  };

  const deleteBill = async (bill) => {
    if (!window.confirm("Delete this bill? Bills with payment history cannot be deleted.")) return;
    try { await api.delete(`/bills/${bill.id}`); await loadData(); }
    catch (err) { setError(err.response?.data?.message || "Unable to delete bill."); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div><h2 className="text-2xl font-bold tracking-tight">{t("Billing & Payments")}</h2><p className="text-sm text-muted-foreground">{t("Generate water bills, record collections and track outstanding balances.")}</p></div>
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        {[{ label: t("Total billed"), value: totals.billed }, { label: t("Collected"), value: totals.collected }, { label: t("Outstanding"), value: totals.outstanding }].map((item) => <Card key={item.label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-bold">{money(item.value)}</p></CardContent></Card>)}
      </div>
      {canAdminister && <Card>
        <CardHeader><CardTitle>{t("Generate a Bill")}</CardTitle><CardDescription>{t("Leave the amount empty to use the consumer's configured monthly rate.")}</CardDescription></CardHeader>
        <CardContent><form onSubmit={createBill} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-sm font-medium lg:col-span-2">{t("Consumer")}<select className={className} value={consumerId} onChange={(event) => setConsumerId(event.target.value)} required><option value="">{t("Select consumer")}</option>{consumers.map((consumer) => <option key={consumer.id} value={consumer.id}>{consumer.consumerNo} — {consumer.name}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium">{t("Period start")}<Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} required /></label>
          <label className="space-y-1 text-sm font-medium">{t("Period end")}<Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} required /></label>
          <label className="space-y-1 text-sm font-medium">{t("Due date")}<Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label>
          <label className="space-y-1 text-sm font-medium">{t("Custom amount (₹), optional")}<Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={t("Use monthly rate")} /></label>
          <div className="flex items-end"><Button type="submit" disabled={saving || !consumerId}><FilePlus2 className="mr-2 size-4" />{saving ? t("Generating...") : t("Generate Bill")}</Button></div>
        </form></CardContent>
      </Card>}
      {selectedBill && <Card>
        <CardHeader><CardTitle>{t("Record Payment")}</CardTitle><CardDescription>{selectedBill.consumer?.consumerNo} · {selectedBill.consumer?.name} · {t("Outstanding")} {money(paymentAmount)}</CardDescription></CardHeader>
        <CardContent><form onSubmit={submitPayment} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm font-medium">{t("Payment amount")}<Input type="number" min="0.01" max={paymentAmount} step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
          <label className="space-y-1 text-sm font-medium">{t("Payment method")}<select className={className} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{["CASH", "UPI", "NET_BANKING", "CREDIT_CARD", "DEBIT_CARD", "OTHER"].map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium">{t("Reference (optional)")}<Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder={t("UPI transaction / receipt no.")} /></label>
          <div className="flex items-end gap-2"><Button type="submit" disabled={saving}>{saving ? t("Saving...") : <><CreditCard className="mr-2 size-4" />{t("Record Payment")}</>}</Button><Button type="button" variant="outline" onClick={() => setSelectedBill(null)}>{t("Cancel")}</Button></div>
        </form></CardContent>
      </Card>}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{t("Bill Register")}</CardTitle><CardDescription>{t("All bills generated for consumers in this Panchayat.")}</CardDescription></div><Button size="icon" variant="outline" onClick={loadData} disabled={loading}><RefreshCw className="size-4" /></Button></CardHeader>
        <CardContent>{loading ? <p className="py-8 text-center text-sm text-muted-foreground">{t("Loading bills...")}</p> : bills.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t("No bills generated yet.")}</p> : <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>{t("Consumer")}</TableHead><TableHead>{t("Period")}</TableHead><TableHead>{t("Amount")}</TableHead><TableHead>{t("Paid")}</TableHead><TableHead>{t("Balance")}</TableHead><TableHead>{t("Status")}</TableHead><TableHead>{t("Actions")}</TableHead></TableRow></TableHeader>
          <TableBody>{bills.map((bill) => {
            const paid = bill.payments?.filter((payment) => payment.status === "SUCCESS").reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
            const outstanding = Math.max(0, Number(bill.amount) - paid);
            return <TableRow key={bill.id}>
              <TableCell><div className="font-medium">{bill.consumer?.name}</div><div className="text-xs text-muted-foreground">{bill.consumer?.consumerNo} · {bill.consumer?.village?.name}</div></TableCell>
              <TableCell className="whitespace-nowrap">{new Date(bill.periodStart).toLocaleDateString("en-IN")} – {new Date(bill.periodEnd).toLocaleDateString("en-IN")}</TableCell>
              <TableCell>{money(bill.amount)}</TableCell><TableCell>{money(paid)}</TableCell><TableCell>{money(outstanding)}</TableCell>
              <TableCell><Badge variant={bill.status === "PAID" ? "secondary" : bill.status === "OVERDUE" ? "destructive" : "outline"}>{t(bill.status.replaceAll("_", " "))}</Badge></TableCell>
              <TableCell><div className="flex flex-wrap gap-2">
                {outstanding > 0 && <Button size="sm" onClick={() => startPayment(bill)}>{t("Collect")}</Button>}
                {bill.payments?.map((payment) => payment.status === "SUCCESS" ? <span key={payment.id} className="inline-flex gap-1">
                  <Button size="sm" variant="outline" title={`Receipt ${payment.id}`} onClick={() => downloadReceipt(bill, payment)}><ReceiptText className="mr-1 size-3" />{t("Receipt")}</Button>
                  {canAdminister && <Button size="sm" variant="outline" title={t("Reverse payment")} onClick={() => reversePayment(bill, payment)} disabled={saving}><RotateCcw className="size-3" /></Button>}
                </span> : payment.status === "REVERSED" ? <Badge key={payment.id} variant="destructive">{t("Payment reversed")}</Badge> : null)}
                {canAdminister && bill.payments?.length === 0 && <Button size="sm" variant="outline" onClick={() => deleteBill(bill)}>{t("Delete")}</Button>}
              </div></TableCell>
            </TableRow>;
          })}</TableBody>
        </Table></div>}</CardContent>
      </Card>
    </div>
  );
}
