import { useEffect, useState } from "react";
import { Users, Droplets, Wrench, IndianRupee, MapPin, Layers3, Package, FileWarning } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "@/services/api";
import { useLanguage } from "@/context/LanguageContext";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/dashboard/summary")
      .then((response) => { if (active) setData(response.data.data); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to load dashboard data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = data?.stats || {};
  const cards = [
    { title: t("Total Villages"), value: stats.villages ?? 0, description: `${stats.schemes ?? 0} ${t("registered schemes")}`, icon: MapPin },
    { title: t("Total Consumers"), value: stats.consumers ?? 0, description: t("Registered water connections"), icon: Users },
    { title: t("Water Assets"), value: stats.assets ?? 0, description: t("Across registered schemes"), icon: Droplets },
    { title: t("Open Maintenance"), value: stats.openMaintenance ?? 0, description: t("Reported or in progress"), icon: Wrench },
    { title: t("Monthly Collection"), value: money(stats.monthlyCollection), description: t("Payments received this month"), icon: IndianRupee },
    { title: t("Pending Bills"), value: stats.pendingBills ?? 0, description: t("Bills with outstanding balances"), icon: FileWarning },
    { title: t("Low Stock Items"), value: stats.lowStock ?? 0, description: t("At or below reorder level"), icon: Package },
    { title: t("Active Schemes"), value: stats.schemes ?? 0, description: t("Water supply schemes"), icon: Layers3 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold tracking-tight">{t("Panchayat Overview")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("Live operational snapshot of your water infrastructure.")}</p></div><Badge variant="outline">{t("Live database data")}</Badge></div>
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <StatCard key={card.title} {...card} />)}</div>
      {loading && <p className="text-sm text-muted-foreground">{t("Loading current Panchayat statistics...")}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>{t("Asset Distribution")}</CardTitle><CardDescription>{t("Registered infrastructure by type")}</CardDescription></CardHeader><CardContent><div className="h-[280px]">{data?.assetDistribution?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.assetDistribution}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("No asset records yet.")}</div>}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("Collection Trend")}</CardTitle><CardDescription>{t("Successful bill payments over the last six months")}</CardDescription></CardHeader><CardContent><div className="h-[280px]">{data?.monthlyRevenue?.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthlyRevenue}><defs><linearGradient id="collectionGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} /><stop offset="95%" stopColor="#0d9488" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} /><Tooltip formatter={(value) => money(value)} /><Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fill="url(#collectionGradient)" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("No payment records yet.")}</div>}</div></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{t("Recent Maintenance")}</CardTitle><CardDescription>{t("Latest infrastructure reports")}</CardDescription></div><Button size="sm" variant="outline" render={<Link to="/maintenance" />}>{t("View all")}</Button></CardHeader><CardContent className="space-y-3">{data?.maintenance?.length ? data.maintenance.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.asset?.name} · {new Date(item.reportedAt).toLocaleDateString("en-IN")}</p></div><Badge variant={item.status === "COMPLETED" ? "secondary" : "outline"}>{t(item.status.replaceAll("_", " "))}</Badge></div>) : <p className="py-5 text-center text-sm text-muted-foreground">{t("No maintenance records yet.")}</p>}</CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{t("Recently Added Consumers")}</CardTitle><CardDescription>{t("Latest water connections")}</CardDescription></div><Button size="sm" variant="outline" render={<Link to="/consumers" />}>{t("View all")}</Button></CardHeader><CardContent className="space-y-3">{data?.recentConsumers?.length ? data.recentConsumers.map((consumer) => <div key={consumer.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="text-sm font-medium">{consumer.name}</p><p className="text-xs text-muted-foreground">{consumer.consumerNo} · {consumer.village?.name}</p></div><Badge variant={consumer.status === "ACTIVE" ? "secondary" : "outline"}>{t(consumer.status)}</Badge></div>) : <p className="py-5 text-center text-sm text-muted-foreground">{t("No consumers registered yet.")}</p>}</CardContent></Card>
      </div>
    </div>
  );
}
