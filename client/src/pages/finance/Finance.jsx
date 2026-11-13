import { RotateCcw } from "lucide-react";
import api from "@/services/api";
import ResourcePage from "@/components/data/ResourcePage";
import { financeConfig } from "@/config/modules";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";

export default function Finance() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canReverse = ["SUPER_ADMIN", "PANCHAYAT_ADMIN"].includes(user?.role);

  const reverseEntry = async (row, refresh) => {
    const reason = window.prompt(t("Enter the reason for reversing this entry (minimum 5 characters):"));
    if (!reason || reason.trim().length < 5) return;
    try {
      await api.post(`/finance/${row.id}/reverse`, { reason: reason.trim() });
      await refresh();
      window.alert(t("A linked reversal entry has been recorded. The original entry remains in the cash book."));
    } catch (error) {
      window.alert(error.response?.data?.message || t("Unable to reverse this entry."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        {t("Financial entries are preserved for audit. Incorrect manual entries can be reversed by an administrator; payment-generated receipts are corrected through the billing workflow.")}
      </div>
      <ResourcePage
        config={financeConfig}
        extraActions={(row, refresh) => {
          if (!canReverse || row.category === "Water bill payment" || row.reversalOfId || row.reversedBy) return null;
          return <Button key="reverse" variant="outline" size="icon" title={t("Reverse entry")} onClick={() => reverseEntry(row, refresh)}><RotateCcw className="size-4" /></Button>;
        }}
      />
    </div>
  );
}
