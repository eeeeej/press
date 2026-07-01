import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Radio, Copy, Check, Loader2, AlertCircle, X } from 'lucide-react';

const SHARE_EXPLAINER =
  'Anyone with this link can watch this scorecard update live after each hole.';

interface LiveShareButtonProps {
  // Existing public link for this game, if live sharing was already started.
  liveShareUrl?: string | null;
  // Starts (or refreshes) live sharing for this game; resolves to the link.
  onShareLive?: () => Promise<string | null> | void;
  // Compact rendering for tight spaces (e.g. the scoring banner).
  compact?: boolean;
}

const LiveShareButton: React.FC<LiveShareButtonProps> = ({
  liveShareUrl = null,
  onShareLive,
  compact = false,
}) => {
  const [liveSharePending, setLiveSharePending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; the link is still shown for manual copy.
    }
  };

  const handleStartLiveShare = async () => {
    if (!onShareLive) return;
    setLiveSharePending(true);
    setShareError(null);
    try {
      const url = (await onShareLive()) || liveShareUrl;
      if (url) {
        await copyToClipboard(url);
      } else {
        setShareError("Couldn't create the live link. Please try again.");
      }
    } catch (error) {
      setShareError(
        error instanceof Error && error.message
          ? `Couldn't create the live link: ${error.message}`
          : "Couldn't create the live link. Please try again."
      );
    } finally {
      setLiveSharePending(false);
    }
  };

  // Once a link exists, the button reveals a QR code (with copy) instead of
  // re-creating the share.
  const handleClick = () => {
    if (liveShareUrl) {
      setShowQR(true);
    } else {
      handleStartLiveShare();
    }
  };

  const buttonClasses = compact
    ? 'flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-xs font-medium'
    : 'flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm self-end';
  const iconSize = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={compact ? 'flex items-center' : 'flex flex-col gap-2'}>
      <button
        onClick={handleClick}
        disabled={liveSharePending}
        className={buttonClasses}
        title={SHARE_EXPLAINER}
      >
        {liveSharePending ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <Radio className={`${iconSize} ${liveShareUrl ? 'animate-pulse' : ''}`} />
        )}
        <span>{liveShareUrl ? 'Live' : 'Share Live'}</span>
      </button>

      {shareError &&
        (compact ? (
          <AlertCircle
            className="w-4 h-4 text-red-600 ml-1 flex-shrink-0"
            title={shareError}
          />
        ) : (
          <div className="flex items-start gap-2 self-end max-w-full bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-700 leading-snug">{shareError}</p>
          </div>
        ))}

      {showQR && liveShareUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-blue-700">
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium">Live scorecard</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <QRCodeSVG value={liveShareUrl} size={200} />
            </div>

            <p className="text-xs text-gray-500 text-center leading-snug">
              {SHARE_EXPLAINER}
            </p>

            <div className="flex items-center gap-2 w-full">
              <input
                readOnly
                value={liveShareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"
              />
              <button
                onClick={() => copyToClipboard(liveShareUrl)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveShareButton;
