import { useCallback, useEffect, useState } from "react";
import { UserPlus, Pencil, RefreshCw, UserRoundCheck, UserRoundX } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const emptyForm = { name: "", email: "", password: "", role: "OPERATOR" };

export default function Users() {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadUsers = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/users");
      setUsers(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load Panchayat users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get("/users")
      .then((response) => { if (active) setUsers(response.data.data || []); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to load Panchayat users."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const edit = (record) => {
    setEditingId(record.id);
    setForm({ name: record.name, email: record.email, password: "", role: record.role });
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = { ...form };
      if (editingId && !payload.password) delete payload.password;
      if (editingId) await api.patch(`/users/${editingId}`, payload);
      else await api.post("/users", payload);
      reset();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save this user.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (record) => {
    if (record.id === currentUser?.id) return;
    try {
      setError("");
      if (record.isActive) {
        const confirmed = window.confirm(`Deactivate ${record.name}? They will no longer be able to sign in.`);
        if (!confirmed) return;
        await api.delete(`/users/${record.id}`);
      } else {
        await api.patch(`/users/${record.id}`, { isActive: true });
      }
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update user status.");
    }
  };

  const activeCount = users.filter((record) => record.isActive).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("User Management")}</h2>
          <p className="text-sm text-muted-foreground">{t("Create and manage accounts belonging to your Gram Panchayat.")}</p>
        </div>
        <Badge variant="outline">{activeCount} active / {users.length} total</Badge>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? t("Edit Panchayat User") : t("Add Panchayat User")}</CardTitle>
          <CardDescription>{t("Administrators can create operator or administrator accounts. Passwords are stored as bcrypt hashes.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 text-sm font-medium">{t("Full name")}
              <Input value={form.name} onChange={(event) => setField("name", event.target.value)} minLength={2} maxLength={100} required placeholder={t("User name")} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">{t("Email address")}
              <Input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} required placeholder="user@example.com" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">{editingId ? t("New password (optional)") : t("Password")}
              <Input type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} minLength={8} maxLength={72} required={!editingId} placeholder={editingId ? t("Leave blank to keep current") : t("At least 8 characters")} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">{t("Role")}
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={(event) => setField("role", event.target.value)}>
                <option value="OPERATOR">{t("Operator")}</option>
                <option value="PANCHAYAT_ADMIN">{t("Panchayat Administrator")}</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={saving}>{saving ? t("Saving...") : <><UserPlus className="mr-2 size-4" />{editingId ? t("Save Changes") : t("Create User")}</>}</Button>
              {editingId && <Button type="button" variant="outline" onClick={reset}>{t("Cancel")}</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>{t("Panchayat Accounts")}</CardTitle><CardDescription>{t("Only accounts under your Panchayat are shown here.")}</CardDescription></div>
          <Button variant="outline" size="icon" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} title={t("Refresh")}><RefreshCw className="size-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="py-8 text-center text-sm text-muted-foreground">{t("Loading users...")}</p> : users.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t("No users found.")}</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>{t("Name")}</TableHead><TableHead>{t("Email")}</TableHead><TableHead>{t("Role")}</TableHead><TableHead>{t("Status")}</TableHead><TableHead>{t("Created")}</TableHead><TableHead className="text-right">{t("Actions")}</TableHead></TableRow></TableHeader>
                <TableBody>{users.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.name}{record.id === currentUser?.id ? ` (${t("You")})` : ""}</TableCell>
                    <TableCell>{record.email}</TableCell>
                    <TableCell><Badge variant="outline">{record.role === "PANCHAYAT_ADMIN" ? t("Administrator") : t("Operator")}</Badge></TableCell>
                    <TableCell><Badge variant={record.isActive ? "secondary" : "destructive"}>{record.isActive ? t("Active") : t("Inactive")}</Badge></TableCell>
                    <TableCell>{new Date(record.createdAt).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell><div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" title={t("Edit user")} onClick={() => edit(record)}><Pencil className="size-4" /></Button>
                      {record.id !== currentUser?.id && (record.isActive ? (
                        <Button variant="outline" size="icon" title={t("Deactivate user")} onClick={() => toggleActive(record)}><UserRoundX className="size-4 text-red-600" /></Button>
                      ) : (
                        <Button variant="outline" size="icon" title={t("Reactivate user")} onClick={() => toggleActive(record)}><UserRoundCheck className="size-4 text-emerald-600" /></Button>
                      ))}
                    </div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
