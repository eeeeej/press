import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ScorePickerProps {
  playerName: string;
  par: number;
  value: number;
  onSelect: (score: number) => void;
  onClose: () => void;
  min?: number;
  max?: number;
}

const relativeLabel = (score: number, par: number): string => {
  const diff = score - par;
  if (diff === 0) return 'Par';
  return diff > 0 ? `+${diff}` : `${diff}`;
};

const ScorePicker: React.FC<ScorePickerProps> = ({
  playerName,
  par,
  value,
  onSelect,
  onClose,
  min = 1,
  max = 12,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const scores: number[] = [];
  for (let n = min; n <= max; n++) scores.push(n);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Select score for ${playerName}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-xl p-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold text-gray-900">{playerName}</div>
            <div className="text-sm text-gray-500">Par {par}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {scores.map((n) => {
            const isSelected = n === value;
            const isPar = n === par;
            return (
              <button
                key={n}
                onClick={() => onSelect(n)}
                className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center border-2 transition-colors ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : isPar
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl font-bold leading-none">{n}</span>
                <span
                  className={`text-[11px] leading-none mt-1 ${
                    isSelected ? 'text-emerald-100' : 'text-gray-500'
                  }`}
                >
                  {relativeLabel(n, par)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScorePicker;
