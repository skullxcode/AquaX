import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, MapPin } from "lucide-react";

import api from "@/services/api";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Villages() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canManage = ["SUPER_ADMIN", "PANCHAYAT_ADMIN"].includes(user?.role);
  const [villages, setVillages] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchVillages = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/villages");
      setVillages(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load villages.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the external API data on mount. The cleanup flag ignores late responses
  // if the user navigates away before the request finishes.
  useEffect(() => {
    let ignore = false;

    api.get("/villages")
      .then((response) => {
        if (!ignore) setVillages(response.data.data);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Unable to load villages.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      setError("");
      if (editingId) {
        await api.patch(`/villages/${editingId}`, { name: name.trim() });
      } else {
        await api.post("/villages", { name: name.trim() });
      }
      setName("");
      setEditingId(null);
      await fetchVillages();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save village.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (village) => {
    setEditingId(village.id);
    setName(village.name);
    setError("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setName("");
    setError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this village?")) return;
    try {
      setError("");
      await api.delete(`/villages/${id}`);
      await fetchVillages();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete village.");
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchVillages();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("Village Management")}</h2>
        <p className="text-sm text-muted-foreground">{t("Manage villages registered under your Gram Panchayat.")}</p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">{t("Total Villages")}</p>
              <p className="mt-1 text-2xl font-bold">{villages.length}</p>
            </div>
            <MapPin className="size-8 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      {canManage && <Card>
        <CardHeader>
          <CardTitle>{editingId ? t("Update Village") : t("Add New Village")}</CardTitle>
          <CardDescription>
            {editingId ? t("Modify the selected village name.") : t("Register a village under your Panchayat.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder={t("Enter village name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              className="sm:max-w-md"
            />
            <Button type="submit" disabled={saving || !name.trim()}>
              <Plus className="mr-2 size-4" />
              {saving ? t("Saving...") : editingId ? t("Update Village") : t("Add Village")}
            </Button>
            {editingId && <Button type="button" variant="outline" onClick={handleCancel}>{t("Cancel")}</Button>}
          </form>
        </CardContent>
      </Card>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("Registered Villages")}</CardTitle>
            <CardDescription>{t("All villages associated with your Panchayat.")}</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading} title={t("Refresh villages")}>
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("Loading villages...")}</p>
          ) : villages.length === 0 ? (
            <div className="py-10 text-center">
              <MapPin className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">{t("No villages registered yet")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("Add your first village using the form above.")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Village Name")}</TableHead>
                    <TableHead>{t("Schemes")}</TableHead>
                    <TableHead>{t("Consumers")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead className="text-right">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {villages.map((village) => (
                    <TableRow key={village.id}>
                      <TableCell className="font-medium">{village.name}</TableCell>
                      <TableCell>{village._count?.schemes ?? 0}</TableCell>
                      <TableCell>{village._count?.consumers ?? 0}</TableCell>
                      <TableCell><Badge variant="secondary">{t("Registered")}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {canManage && <>
                            <Button variant="outline" size="icon" title={t("Edit village")} onClick={() => handleEdit(village)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              title={t("Delete village")}
                              disabled={(village._count?.schemes ?? 0) > 0 || (village._count?.consumers ?? 0) > 0}
                              onClick={() => handleDelete(village.id)}
                            >
                              <Trash2 className="size-4 text-red-600" />
                            </Button>
                          </>}
                        </div>
                      </TableCell>
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
