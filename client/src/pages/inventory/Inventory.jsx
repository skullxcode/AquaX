import { useEffect, useState } from "react";
import { ArrowDownToLine, RefreshCw } from "lucide-react";
import api from "@/services/api";
import { useLanguage } from "@/context/LanguageContext";
import ResourcePage from "@/components/data/ResourcePage";
import { inventoryConfig } from "@/config/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const controlClass = "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default function Inventory() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState("PURCHASE");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/inventory"), api.get("/suppliers")])
      .then(([inventoryResponse, supplierResponse]) => {
        if (!active) return;
        const data = inventoryResponse.data.data || [];
        setItems(data);
        setSuppliers(supplierResponse.data.data || []);
        setItemId((current) => data.some((item) => item.id === current) ? current : data[0]?.id || "");
      })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to load inventory data."); });
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;
    if (!itemId) return () => { active = false; };
    api.get(`/inventory/${itemId}/movements`)
      .then((response) => { if (active) setMovements(response.data.data || []); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to load movement history."); })
    return () => { active = false; };
  }, [itemId, refreshKey]);

  const submitMovement = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      setError("");
      await api.post(`/inventory/${itemId}/movements`, {
        type,
        quantity: Number(quantity),
        supplierId: type === "PURCHASE" ? supplierId : undefined,
        unitCost: unitCost === "" ? undefined : Number(unitCost),
        reference: reference || undefined,
        notes: notes || undefined,
      });
      setQuantity("");
      setUnitCost("");
      setReference("");
      setNotes("");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to record stock movement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Record Stock Movement")}</CardTitle>
          <CardDescription>
            {t("Purchases increase stock and require a registered supplier. Consumption reduces stock. Adjustments accept positive or negative quantities.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={submitMovement} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm font-medium">
              {t("Inventory item")}
              <select className={controlClass} value={itemId} onChange={(event) => setItemId(event.target.value)} required>
                <option value="">{t("Select item")}</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              {t("Movement type")}
              <select className={controlClass} value={type} onChange={(event) => { setType(event.target.value); if (event.target.value !== "PURCHASE") setSupplierId(""); }}>
                <option value="PURCHASE">{t("Purchase / Stock In")}</option>
                <option value="CONSUMPTION">{t("Consumption / Stock Out")}</option>
                <option value="ADJUSTMENT">{t("Stock Adjustment (+/-)")}</option>
              </select>
            </label>
            {type === "PURCHASE" && (
              <label className="space-y-1 text-sm font-medium">
                {t("Supplier")}
                <select className={controlClass} value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
                  <option value="">{t("Select supplier")}</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
            )}
            <label className="space-y-1 text-sm font-medium">
              {t("Quantity")}
              <Input type="number" step="any" required value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={type === "ADJUSTMENT" ? t("Use negative to reduce") : t("Enter quantity")} />
            </label>
            <label className="space-y-1 text-sm font-medium">
              {t("Unit cost (₹), optional")}
              <Input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium">
              {t("Invoice / challan reference")}
              <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={t("Invoice / challan")} />
            </label>
            <label className="space-y-1 text-sm font-medium">
              {t("Notes")}
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("Optional note")} />
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={busy || !itemId || !quantity || (type === "PURCHASE" && !supplierId)}>
                <ArrowDownToLine className="mr-2 size-4" />{busy ? t("Recording...") : t("Record Movement")}
              </Button>
            </div>
          </form>
          {type === "PURCHASE" && suppliers.length === 0 && <p className="mt-3 text-sm text-amber-700">{t("Register a supplier before recording a purchase.")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>{t("Stock Movement History")}</CardTitle><CardDescription>{t("Opening balances, purchases, consumption and adjustments for the selected item.")}</CardDescription></div>
          <Button size="icon" variant="outline" onClick={() => setRefreshKey((value) => value + 1)} title={t("Refresh history")}><RefreshCw className="size-4" /></Button>
        </CardHeader>
        <CardContent>
          {!itemId ? <p className="text-sm text-muted-foreground">{t("Create an inventory item to view its movement history.")}</p> : movements.length === 0 ? <p className="text-sm text-muted-foreground">{t("No stock movements recorded for this item yet.")}</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>{t("Date")}</TableHead><TableHead>{t("Type")}</TableHead><TableHead>{t("Quantity")}</TableHead><TableHead>{t("Supplier")}</TableHead><TableHead>{t("Reference")}</TableHead><TableHead>{t("Recorded by")}</TableHead></TableRow></TableHeader>
                <TableBody>{movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{new Date(movement.createdAt).toLocaleString("en-IN")}</TableCell>
                    <TableCell><Badge variant="outline">{t(movement.type)}</Badge></TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>{movement.supplier?.name || "—"}</TableCell>
                    <TableCell>{movement.reference || movement.notes || "—"}</TableCell>
                    <TableCell>{movement.user?.name || "—"}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ResourcePage config={inventoryConfig} refreshKey={refreshKey} onChanged={() => setRefreshKey((value) => value + 1)} />
    </div>
  );
}
