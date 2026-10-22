"use client";

// Daten & App, wenn angemeldet (DSGVO): „Meine Daten exportieren“ (JSON mit
// Konto, Haushalt und den Daten auf diesem Gerät) und „Konto löschen“ (mit
// Rückfrage; die Daten auf dem Handy bleiben).

import { useState } from "react";
import { Download, UserX } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CARD_LIST } from "@/components/ui/styles";
import { Row } from "@/components/einstellungen/settings/SettingsParts";
import { showToast } from "@/lib/core/toast";
import { createBackup } from "@/lib/core/backup";
import { nowIso } from "@/lib/core/now";
import { useCachedAccount } from "@/lib/konten/cache";
import { deleteAccount, exportAccount } from "@/lib/konten/account";

export function AccountDataSection() {
  const { user } = useCachedAccount();
  const [confirm, setConfirm] = useState(false);
  if (!user) return null;
  const exportData = async () => {
    const cloud = await exportAccount();
    const data = { app: "was-gibts", exportiert: nowIso(), konto: cloud.ok ? cloud.value : { hinweis: cloud.error }, aufDiesemGeraet: createBackup() };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `was-gibts-meine-daten-${nowIso().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <>
      <ul className={CARD_LIST} aria-label="Konto">
        <Row onClick={() => void exportData()} icon={Download} title="Meine Daten exportieren">
          <span>Alles, was zu deinem Konto gespeichert ist – als Datei</span>
        </Row>
        <Row onClick={() => setConfirm(true)} icon={UserX} title="Konto löschen">
          <span>Angemeldet als {user.email}</span>
        </Row>
      </ul>
      {confirm && (
        <ConfirmDialog
          title="Konto löschen?"
          text="Dein Konto und deine Mitgliedschaft im Haushalt werden gelöscht. Die Daten auf diesem Handy bleiben. Bist du die letzte Person im Haushalt, wird er mit gelöscht."
          confirmLabel="Konto löschen"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            void deleteAccount().then((r) => showToast({ text: r.ok ? "Dein Konto ist gelöscht." : r.error }));
          }}
        />
      )}
    </>
  );
}
