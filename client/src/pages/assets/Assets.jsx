import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "@/services/api";
import ResourcePage from "@/components/data/ResourcePage";
import { assetConfig } from "@/config/modules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function AssetMap({ assets }) {
  const mapped = assets.filter((asset) => Number.isFinite(asset.latitude) && Number.isFinite(asset.longitude));
  if (!mapped.length) {
    return <Card><CardHeader><CardTitle>GIS Asset Map</CardTitle><CardDescription>Geographical locations of registered infrastructure assets.</CardDescription></CardHeader><CardContent><div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No mapped assets yet. Add latitude and longitude when registering an asset to display it here.</div></CardContent></Card>;
  }
  const center = [mapped.reduce((sum, asset) => sum + asset.latitude, 0) / mapped.length, mapped.reduce((sum, asset) => sum + asset.longitude, 0) / mapped.length];
  return <Card><CardHeader><CardTitle>GIS Asset Map</CardTitle><CardDescription>{mapped.length} of {assets.length} assets have coordinates. Select a marker for details.</CardDescription></CardHeader><CardContent><div className="h-[380px] overflow-hidden rounded-lg"><MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{mapped.map((asset) => <CircleMarker key={asset.id} center={[asset.latitude, asset.longitude]} radius={8}><Popup><strong>{asset.name}</strong><br />{asset.type.replaceAll("_", " ")}<br />{asset.scheme?.name}<br />{asset.status.replaceAll("_", " ")}</Popup></CircleMarker>)}</MapContainer></div></CardContent></Card>;
}

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let active = true;
    api.get("/assets").then((response) => { if (active) setAssets(response.data.data || []); }).catch(() => {});
    return () => { active = false; };
  }, [refreshKey]);
  return <div className="space-y-6"><AssetMap assets={assets} /><ResourcePage config={assetConfig} refreshKey={refreshKey} onChanged={() => setRefreshKey((value) => value + 1)} /></div>;
}
