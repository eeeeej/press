import React, { useState } from 'react';
import { Radio, Copy, Check, Loader2, AlertCircle } from 'lucide-react';

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

  if (compact) {
    // In compact mode the started link copies to the clipboard on tap instead
    // of expanding into a full link box, to keep the banner uncluttered.
    const handleClick = liveShareUrl
      ? () => copyToClipboard(liveShareUrl)
      : handleStartLiveShare;

    return (
      <div className="flex items-center">
        <button
          onClick={handleClick}
          disabled={liveSharePending}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-colors ${
            liveShareUrl ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title={
            liveShareUrl
              ? 'Live — tap to copy the link others can watch'
              : 'Create a live link that updates after each hole'
          }
        >
          {liveSharePending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Radio className={`w-3.5 h-3.5 ${liveShareUrl ? 'animate-pulse' : ''}`} />
          )}
          <span>{copied ? 'Copied' : liveShareUrl ? 'Live' : 'Share Live'}</span>
        </button>
        {shareError && (
          <AlertCircle className="w-4 h-4 text-red-600 ml-1 flex-shrink-0" title={shareError} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleStartLiveShare}
        disabled={liveSharePending}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm self-end"
        title="Create a live link that updates after each hole"
      >
        {liveSharePending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Radio className="w-4 h-4" />
        )}
        <span>{liveShareUrl ? 'Live Link' : 'Share Live'}</span>
      </button>

      {liveShareUrl && (
        <div className="flex flex-col gap-1 self-end max-w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 max-w-full">
            <Radio className="w-4 h-4 text-blue-600 flex-shrink-0 animate-pulse" />
            <input
              readOnly
              value={liveShareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="bg-transparent text-xs text-blue-800 w-56 max-w-full outline-none"
            />
            <button
              onClick={() => copyToClipboard(liveShareUrl)}
              className="flex items-center space-x-1 text-blue-700 hover:text-blue-900 text-xs font-medium flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-blue-700 leading-snug">
            {copied
              ? 'Link copied — share it so others can watch this scorecard update live after each hole.'
              : 'Anyone with this link can watch this scorecard update live after each hole.'}
          </p>
        </div>
      )}

      {shareError && (
        <div className="flex items-start gap-2 self-end max-w-full bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 leading-snug">{shareError}</p>
        </div>
      )}
    </div>
  );
};

export default LiveShareButton;
