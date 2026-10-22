import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CornerDownRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Facility, Review, User } from '../../types';
import { api } from '../../api';

interface HostReviewsProps {
  facilities: Facility[];
  currentUser: User;
}

export const HostReviews: React.FC<HostReviewsProps> = ({ facilities, currentUser }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(facilities[0]?.id || '');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFacilityId) {
      loadReviews(selectedFacilityId);
    }
  }, [selectedFacilityId]);

  const loadReviews = async (facId: string) => {
    try {
      const list = await api.getReviews(facId);
      setReviews(list);
    } catch (err) {
      console.error('Failed to load reviews', err);
    }
  };

  const handleReply = async (reviewId: string) => {
    const text = replyTextMap[reviewId];
    if (!text || !text.trim()) return;

    try {
      setSubmittingId(reviewId);
      await api.replyToReview(reviewId, text);
      await loadReviews(selectedFacilityId);
      setReplyTextMap({ ...replyTextMap, [reviewId]: '' });
    } catch (err: any) {
      alert('Error replying to review: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Guest Satisfaction & Feedback
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Reviews & Host Responses
          </h2>
          <p className="text-xs text-slate-500">
            Maintain high host rankings by promptly answering driver reviews and addressing facility concerns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedFacilityId}
            onChange={e => setSelectedFacilityId(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Average Rating Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-sky-500/10 border border-amber-200/80 p-5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-md">
            {averageRating}
          </div>
          <div>
            <div className="flex items-center gap-1 text-amber-500 mb-1">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              Overall facility rating based on {reviews.length} verified parking sessions
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            No reviews yet for this facility. Once customers complete their parking session, reviews will appear here.
          </div>
        ) : (
          reviews.map(rev => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{rev.customerName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified Session
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 mt-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-current text-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>

                <span className="text-[11px] text-slate-400">
                  {new Date(rev.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                "{rev.comment}"
              </p>

              {/* Host Response */}
              {rev.hostResponse ? (
                <div className="ml-4 pl-3 border-l-2 border-sky-400 bg-sky-50/40 p-3 rounded-r-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-sky-900">
                    <span className="flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-sky-600" />
                      Host Response ({currentUser.fullName})
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(rev.hostResponse.respondedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    {rev.hostResponse.text}
                  </p>
                </div>
              ) : (
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Write a public reply to this review..."
                      value={replyTextMap[rev.id] || ''}
                      onChange={e => setReplyTextMap({ ...replyTextMap, [rev.id]: e.target.value })}
                      className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                    <button
                      disabled={submittingId === rev.id || !replyTextMap[rev.id]?.trim()}
                      onClick={() => handleReply(rev.id)}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-200 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
                    >
                      {submittingId === rev.id ? 'Sending...' : 'Reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
