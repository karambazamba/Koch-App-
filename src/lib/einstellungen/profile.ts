// Datenmodell des Haushaltsprofils – öffentlicher Einstieg. Alle Importe
// laufen weiter über diese Datei; die Inhalte stehen nach Bereichen in
// profileModel.ts (Modell, Startwerte), profileHelper.ts (Begleitung),
// profileHousehold.ts (Haushalt, Personen) und profileFood.ts (Essen).
// Speichern und Migration in profileStore.ts.

export * from "@/lib/einstellungen/profileModel";
export * from "@/lib/einstellungen/profileHelper";
export * from "@/lib/einstellungen/profileHousehold";
export * from "@/lib/einstellungen/profileFood";
