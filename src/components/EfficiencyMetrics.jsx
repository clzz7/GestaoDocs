import React from 'react';
import { Zap } from 'lucide-react';
export default function EfficiencyMetrics({ data }) {
  if (!data) return null;
  const MANUAL_MINUTES_PER_DOC = 1.3;
  const docsProcessed = data.totalEmployees;
  
  const manualTimeMinutes = docsProcessed * MANUAL_MINUTES_PER_DOC;
  const automatedTimeMinutes = data.processingTimeMs / 1000 / 60;
  
  const timeSavedMinutes = manualTimeMinutes - automatedTimeMinutes;
  const timeSavedHours = Math.floor(timeSavedMinutes / 60);
  const timeSavedRemainingMins = Math.round(timeSavedMinutes % 60);
  
  const efficiencyGain = Math.round((timeSavedMinutes / manualTimeMinutes) * 100);

  return (
    <div className="bg-white border border-border rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 p-2 rounded-lg shrink-0">
          <Zap className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-text">
            Tempo economizado: {timeSavedHours > 0 ? `${timeSavedHours}h ` : ''}{timeSavedRemainingMins}m
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Processamento em {(data.processingTimeMs / 1000).toFixed(1)}s (estimativa manual: {Math.round(manualTimeMinutes)}min)
          </p>
        </div>
      </div>
      <div className="hidden sm:flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
        +{efficiencyGain}% eficiência
      </div>
    </div>
  );
}
