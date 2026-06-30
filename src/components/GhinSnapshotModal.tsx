import { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Upload, X, Loader2, ScanLine, AlertCircle } from 'lucide-react';
import { Player } from '../types';
import { parseGhinSnapshot, deriveDisplayName } from '../utils/ghinSnapshot';

interface GhinSnapshotModalProps {
  existingCount: number;
  maxPlayers: number;
  onClose: () => void;
  onAddPlayers: (players: Player[]) => void;
}

interface ReviewPlayer {
  id: string;
  name: string;
  displayName: string;
  handicap: number;
  selected: boolean;
}

type Stage = 'upload' | 'processing' | 'review';

export default function GhinSnapshotModal({
  existingCount,
  maxPlayers,
  onClose,
  onAddPlayers,
}: GhinSnapshotModalProps) {
  const [stage, setStage] = useState<Stage>('upload');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reviewPlayers, setReviewPlayers] = useState<ReviewPlayer[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = Math.max(0, maxPlayers - existingCount);

  const handleFile = async (file: File) => {
    setError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStage('processing');
    setProgress(0);

    try {
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const parsed = parseGhinSnapshot(data.text);

      if (parsed.length === 0) {
        setError(
          "Couldn't read any players from that image. Make sure it shows the GHIN Handicap Calculator list (names with C.H. handicaps) and try again."
        );
        setStage('upload');
        return;
      }

      const selectedDefault = (idx: number) => idx < remainingSlots;
      setReviewPlayers(
        parsed.map((p, idx) => ({
          id: `${Date.now()}-${idx}`,
          name: p.name,
          displayName: deriveDisplayName(p.name),
          handicap: p.handicap,
          selected: selectedDefault(idx),
        }))
      );
      setStage('review');
    } catch (err) {
      console.error('GHIN OCR failed:', err);
      setError('Something went wrong reading the image. Please try again.');
      setStage('upload');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so selecting the same file again re-triggers change.
    e.target.value = '';
  };

  const updateReviewPlayer = (id: string, patch: Partial<ReviewPlayer>) => {
    setReviewPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const selectedCount = reviewPlayers.filter((p) => p.selected).length;
  const tooMany = selectedCount > remainingSlots;
  const canConfirm =
    selectedCount > 0 &&
    !tooMany &&
    reviewPlayers
      .filter((p) => p.selected)
      .every((p) => p.name.trim() && p.displayName.trim());

  const handleConfirm = () => {
    if (!canConfirm) return;
    const newPlayers: Player[] = reviewPlayers
      .filter((p) => p.selected)
      .map((p) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: p.name.trim(),
        displayName: p.displayName.trim(),
        handicap: p.handicap,
      }));
    onAddPlayers(newPlayers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <ScanLine className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Add via GHIN Snapshot</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Upload stage */}
          {stage === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload or take a picture of your GHIN Handicap Calculator page. We'll read each
                golfer's name and their Course Handicap (the value under <strong>C.H.</strong>).
              </p>

              {error && (
                <div className="flex items-start space-x-2 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center space-y-2 border-2 border-dashed border-emerald-300 text-emerald-600 py-8 px-4 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
                >
                  <Camera className="w-7 h-7" />
                  <span>Take a Picture</span>
                </button>
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex flex-col items-center justify-center space-y-2 border-2 border-dashed border-emerald-300 text-emerald-600 py-8 px-4 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
                >
                  <Upload className="w-7 h-7" />
                  <span>Upload Image</span>
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFileChange}
                className="hidden"
              />
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Processing stage */}
          {stage === 'processing' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="GHIN snapshot preview"
                  className="max-h-40 rounded-lg border border-gray-200 object-contain"
                />
              )}
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-sm text-gray-600">Reading handicaps… {progress}%</p>
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Review stage */}
          {stage === 'review' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Review the golfers we found. Edit names or handicaps as needed, then add the ones
                you want.
              </p>

              {tooMany && (
                <div className="flex items-start space-x-2 bg-amber-50 text-amber-700 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    You can add at most {remainingSlots} more {remainingSlots === 1 ? 'player' : 'players'} (max{' '}
                    {maxPlayers}). Deselect {selectedCount - remainingSlots}.
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {reviewPlayers.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      p.selected ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={p.selected}
                        onChange={(e) => updateReviewPlayer(p.id, { selected: e.target.checked })}
                        className="mt-1 w-5 h-5 accent-emerald-600 flex-shrink-0"
                      />
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => updateReviewPlayer(p.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Full name"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Display
                          </label>
                          <input
                            type="text"
                            value={p.displayName}
                            onChange={(e) =>
                              updateReviewPlayer(p.id, { displayName: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Name"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            C.H.
                          </label>
                          <input
                            type="number"
                            value={p.handicap}
                            onChange={(e) =>
                              updateReviewPlayer(p.id, {
                                handicap: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add {selectedCount > 0 ? selectedCount : ''}{' '}
                  {selectedCount === 1 ? 'Player' : 'Players'}
                </button>
                <button
                  onClick={() => {
                    setStage('upload');
                    setReviewPlayers([]);
                    setError(null);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Retake
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
