import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  User,
  CornerDownRight,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser } from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostReviewsViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostReviewsView: React.FC<HostReviewsViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await apiClient.getHostReviews(hostId);
      setReviews(data);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
      setFeedback({ type: 'error', message: err.message || 'Could not load reviews' });
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleReplySubmit = async (reviewId: string) => {
    const reply = replyTextMap[reviewId]?.trim();
    if (!reply) return;

    setSubmittingId(reviewId);
    setFeedback(null);
    try {
      await apiClient.replyToReview(hostId, reviewId, reply);
      setFeedback({ type: 'success', message: 'Reply posted successfully!' });
      setReplyTextMap({ ...replyTextMap, [reviewId]: '' });
      await loadReviews();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to post reply' });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F3] text-[#132A24] font-sans">
      <header className="h-16 bg-[#12211C] border-b border-[#1e342d] px-8 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center">
            H
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">Host Studio</span>
            <span className="text-[10px] text-emerald-400 block -mt-0.5">Reviews &amp; Reputation</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/host')}>
            Back to Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <HostSubNav activeSection="reviews" onNavigate={onNavigate} />

      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
              Customer Reviews &amp; Ratings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verified feedback from drivers who completed bookings at your facilities.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadReviews} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {reviews.length === 0 ? (
          <Card className="p-8 text-center bg-white border-slate-200">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-800">No Reviews Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Reviews left by drivers after parking check-out will appear here, and you can reply to them directly.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <Card key={r.id} className="p-6 bg-white border-slate-200 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-xs text-slate-700">({r.rating}/5)</span>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">
                      By <strong>{r.customer_first_name} {r.customer_last_name}</strong> at <strong>{r.facility_name}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {r.created_at_utc ? new Date(r.created_at_utc).toLocaleDateString() : ''}
                  </span>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  &ldquo;{r.comments}&rdquo;
                </p>

                {r.host_reply ? (
                  <div className="pl-4 border-l-2 border-emerald-500 space-y-1 bg-emerald-50/50 p-3 rounded-r-lg">
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5" /> Your Response:
                    </span>
                    <p className="text-xs text-slate-700">{r.host_reply}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      placeholder="Write a response to this customer review..."
                      className="text-xs"
                      value={replyTextMap[r.id] || ''}
                      onChange={(e) => setReplyTextMap({ ...replyTextMap, [r.id]: e.target.value })}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={submittingId === r.id || !replyTextMap[r.id]?.trim()}
                      onClick={() => handleReplySubmit(r.id)}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Reply
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
