"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateGlobalSettings } from "@/lib/actions";
import { GlobalSettings as Settings, TDEEFormula } from "@/lib/types";

interface Props {
  settings: Settings;
}

const FORMULA_LABELS: Record<TDEEFormula, string> = {
  mifflin_st_jeor: "Mifflin-St Jeor (recommended)",
  harris_benedict: "Harris-Benedict (revised)",
  katch_mcardle: "Katch-McArdle (lean mass)",
};

export function GlobalSettingsPanel({ settings }: Props) {
  const [formula, setFormula] = useState<TDEEFormula>(settings.tdeeFormula);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateGlobalSettings({ tdeeFormula: formula });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="space-y-1.5">
        <Label>Default TDEE Formula</Label>
        <Select value={formula} onValueChange={(v) => setFormula(v as TDEEFormula)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FORMULA_LABELS) as TDEEFormula[]).map((f) => (
              <SelectItem key={f} value={f}>{FORMULA_LABELS[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} disabled={isPending}>
        {saved ? "Saved!" : isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
