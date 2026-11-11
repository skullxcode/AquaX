import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import api from "@/services/api";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const controlClass = "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function getPath(record, path) {
  return path.split(".").reduce((value, key) => value?.[key], record);
}
function initialValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? ""]));
}
function editValues(fields, record) {
  return Object.fromEntries(fields.map((field) => {
    let value = record[field.name];
    if (field.type === "date" && value) value = new Date(value).toISOString().slice(0, 10);
    if (value == null) value = "";
    return [field.name, String(value)];
  }));
}

export default function ResourcePage({ config, refreshKey = 0, onChanged, extraActions }) {
  const { title, description, endpoint, fields, columns, deleteEnabled = true, createEnabled = true } = config;
  const { t } = useLanguage();
  const { user } = useAuth();
  const role = user?.role;
  const canCreate = createEnabled && (config.createRoles || ["SUPER_ADMIN", "PANCHAYAT_ADMIN"]).includes(role);
  const canEdit = (config.editRoles || ["SUPER_ADMIN", "PANCHAYAT_ADMIN"]).includes(role);
  const canDelete = deleteEnabled && (config.deleteRoles || ["SUPER_ADMIN", "PANCHAYAT_ADMIN"]).includes(role);
  const [rows, setRows] = useState([]);
  const [values, setValues] = useState(() => initialValues(fields));
  const [editingId, setEditingId] = useState(null);
  const [options, setOptions] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadRows = useCallback(async () => {
    try {
      setError("");
      const response = await api.get(endpoint);
      setRows(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, title]);

  useEffect(() => {
    let active = true;
    api.get(endpoint)
      .then((response) => { if (active) setRows(response.data.data || []); })
      .catch((err) => { if (active) setError(err.response?.data?.message || `Unable to load ${title.toLowerCase()}.`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint, title, refreshKey]);

  useEffect(() => {
    let active = true;
    const optionFields = fields.filter((field) => field.optionsEndpoint);
    Promise.all(optionFields.map(async (field) => {
      const response = await api.get(field.optionsEndpoint);
      return [field.name, response.data.data || []];
    }))
      .then((entries) => { if (active) setOptions(Object.fromEntries(entries)); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to load form options."); });
    return () => { active = false; };
  }, [fields]);

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => columns.some((column) => String(column.value ? column.value(row) : getPath(row, column.key) ?? "").toLowerCase().includes(needle)));
  }, [rows, search, columns]);

  const resetForm = () => {
    setEditingId(null);
    setValues(initialValues(fields));
  };
  const updateField = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = {};
      for (const field of fields) {
        if (editingId && field.createOnly) continue;
        const raw = values[field.name];
        if (field.type === "number") payload[field.name] = raw === "" ? null : Number(raw);
        else if (field.type === "date") payload[field.name] = raw || null;
        else payload[field.name] = raw;
      }
      if (editingId) await api.patch(`${endpoint}/${editingId}`, payload);
      else await api.post(endpoint, payload);
      resetForm();
      await loadRows();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to save ${title.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const label = columns[0]?.value ? columns[0].value(row) : getPath(row, columns[0]?.key || "id");
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      setError("");
      await api.delete(`${endpoint}/${row.id}`);
      await loadRows();
      onChanged?.();
      if (editingId === row.id) resetForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete this record.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t(title)}</h2>
          <p className="text-sm text-muted-foreground">{t(description)}</p>
        </div>
        <Badge variant="outline">{rows.length} {t("records")}</Badge>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {(canCreate || (editingId && canEdit)) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? `${t("Edit")} ${t(config.singular)}` : `${t("Add")} ${t(config.singular)}`}</CardTitle>
            <CardDescription>{editingId ? t("Update the details and save your changes.") : t(config.formDescription || `Enter the details to register a new ${config.singular.toLowerCase()}.`)}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fields.filter((field) => !(editingId && field.createOnly)).map((field) => (
                  <label key={field.name} className={`space-y-1.5 ${field.span ? "sm:col-span-2" : ""}`}>
                    <span className="text-sm font-medium">{t(field.label)}{field.required !== false ? " *" : ""}</span>
                    {field.type === "select" ? (
                      <select className={controlClass} value={values[field.name] ?? ""} onChange={(event) => updateField(field.name, event.target.value)} required={field.required !== false}>
                        <option value="">{t("Select")} {t(field.label).toLowerCase()}</option>
                        {(field.options || options[field.name] || []).map((option) => (
                          <option key={option.value ?? option.id} value={option.value ?? option.id}>{t(option.label ?? option.name)}</option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea className={`${controlClass} min-h-24`} value={values[field.name] ?? ""} onChange={(event) => updateField(field.name, event.target.value)} required={field.required !== false} placeholder={t(field.placeholder || "")} />
                    ) : (
                      <Input type={field.type || "text"} value={values[field.name] ?? ""} onChange={(event) => updateField(field.name, event.target.value)} required={field.required !== false} min={field.min} max={field.max} step={field.step} placeholder={t(field.placeholder || "")} />
                    )}
                  </label>
                ))}
              </div>
              {fields.some((field) => field.optionsEndpoint && !(options[field.name]?.length)) && (
                <p className="text-xs text-amber-700">{t("Some dropdowns have no records yet. Create their parent records first.")}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving || (editingId ? !canEdit : !canCreate)}>{saving ? t("Saving...") : <><Plus className="mr-2 size-4" />{editingId ? t("Save Changes") : `${t("Add")} ${t(config.singular)}`}</>}</Button>
                {editingId && <Button type="button" variant="outline" onClick={resetForm}><X className="mr-2 size-4" />{t("Cancel")}</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div><CardTitle>{t(config.listTitle || `All ${title}`)}</CardTitle><CardDescription>{t("Records belonging to your Gram Panchayat.")}</CardDescription></div>
          <div className="flex gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input className="w-48 pl-8" placeholder={t("Search records...")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <Button variant="outline" size="icon" onClick={loadRows} disabled={loading} title={t("Refresh")}><RefreshCw className="size-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="py-8 text-center text-sm text-muted-foreground">{t("Loading records...")}</p> : visibleRows.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t("No records found. Add your first record above.")}</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{t(column.label)}</TableHead>)}<TableHead className="text-right">{t("Actions")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((column) => {
                        const value = column.value ? column.value(row) : getPath(row, column.key);
                        const rawDisplay = column.format ? column.format(value, row) : value ?? "—";
                        const display = typeof rawDisplay === "string" || typeof rawDisplay === "number" ? t(String(rawDisplay)) : rawDisplay;
                        return <TableCell key={column.key}>{column.badge ? <Badge variant={column.badgeVariant?.(value, row) || "secondary"}>{display || "—"}</Badge> : display}</TableCell>;
                      })}
                      <TableCell><div className="flex justify-end gap-2">
                        {canEdit && (config.canEditRow ? config.canEditRow(row) : row.category !== "Water bill payment") && <Button variant="outline" size="icon" title={t("Edit")} onClick={() => { setEditingId(row.id); setValues(editValues(fields, row)); }}><Pencil className="size-4" /></Button>}
                        {canDelete && (config.canDeleteRow ? config.canDeleteRow(row) : row.category !== "Water bill payment") && <Button variant="outline" size="icon" title={t("Delete")} onClick={() => handleDelete(row)}><Trash2 className="size-4 text-red-600" /></Button>}
                        {extraActions?.(row, loadRows)}
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
