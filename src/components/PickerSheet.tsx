import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface PickerSheetProps {
  title: string;
  subtitle?: string;
  values: number[];
  value: number;
  /** value to tint as a reference (e.g. par) */
  highlightValue?: number;
  columns?: number;
  formatValue?: (n: number) => string;
  formatSub?: (n: number) => string;
  onSelect: (value: number) => void;
  onClose: () => void;
}

const PickerSheet: React.FC<PickerSheetProps> = ({
  title,
  subtitle,
  values,
  value,
  highlightValue,
  columns = 4,
  formatValue = (n) => `${n}`,
  formatSub,
  onSelect,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-xl p-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold text-gray-900">{title}</div>
            {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {values.map((n) => {
            const isSelected = n === value;
            const isRef = highlightValue !== undefined && n === highlightValue;
            return (
              <button
                key={n}
                onClick={() => onSelect(n)}
                className={`min-h-[44px] py-1.5 rounded-xl flex flex-col items-center justify-center border-2 transition-colors ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : isRef
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg font-bold leading-none">{formatValue(n)}</span>
                {formatSub && (
                  <span
                    className={`text-[11px] leading-none mt-0.5 ${
                      isSelected ? 'text-emerald-100' : 'text-gray-500'
                    }`}
                  >
                    {formatSub(n)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PickerSheet;
