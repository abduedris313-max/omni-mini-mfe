import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { MiniAppManifest, MiniAppReview } from '../types/miniapp';
import { repositoryService } from '../services/repositoryService';
import {
  Search,
  Star,
  ChevronRight,
  X,
  Sliders,
  Send,
} from 'lucide-react';

export const StorePage: React.FC = () => {
  const {
    availableApps,
    installedAppIds,
    installApp,
    openMiniApp,
    user,
    showToast,
    hapticFeedback,
    refreshApps,
    themeTokens,
  } = useSuperApp();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<MiniAppManifest | null>(null);
  const [reviews, setReviews] = useState<MiniAppReview[]>([]);
  const [, setIsLoadingDetails] = useState(false);
  const [downloadingAppId, setDownloadingAppId] = useState<string | null>(null);

  // Review form state
  const [userRating, setUserRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'finance', label: 'Finance' },
    { id: 'transport', label: 'Transit' },
    { id: 'food', label: 'Food & Drink' },
    { id: 'health', label: 'Health' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'developer', label: 'Developer' },
  ];

  const filteredApps = availableApps.filter((app) => {
    const matchesCategory = activeCategory === 'all' || app.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleInstallClick = async (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback('medium');

    if (installedAppIds.includes(appId)) {
      openMiniApp(appId);
      return;
    }

    setDownloadingAppId(appId);
    setTimeout(async () => {
      await installApp(appId);
      setDownloadingAppId(null);
    }, 800);
  };

  const handleOpenDetails = async (app: MiniAppManifest) => {
    setSelectedApp(app);
    setIsLoadingDetails(true);
    hapticFeedback('light');
    const details = await repositoryService.getMiniAppById(app.id);
    if (details) {
      setReviews(details.reviews || []);
    }
    setIsLoadingDetails(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (!reviewComment.trim()) {
      showToast('Please type a short review comment', 'warning');
      return;
    }

    setIsSubmittingReview(true);
    hapticFeedback('light');

    const newRev = await repositoryService.addReview(
      selectedApp.id,
      user?.name || 'Verified Explorer',
      userRating,
      reviewComment
    );

    setReviews([newRev, ...reviews]);
    setReviewComment('');
    setIsSubmittingReview(false);
    showToast('Review submitted to OmniMini Repository!', 'success');
    hapticFeedback('success');
    refreshApps();
  };

  return (
    <div
      className="p-4 space-y-5 pb-28 transition-colors duration-200"
      style={{ color: themeTokens.textPrimary }}
    >
      {/* Store Header */}
      <div className="space-y-1">
        <span
          className="text-[11px] font-bold uppercase tracking-widest transition-colors"
          style={{ color: themeTokens.accentPrimary }}
        >
          Mini App Registry
        </span>
        <h1
          className="text-2xl font-black tracking-tight"
          style={{ color: themeTokens.textPrimary }}
        >
          App Store
        </h1>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search
          className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: themeTokens.textMuted }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search mini apps, categories & creators..."
          style={{
            backgroundColor: themeTokens.bgInput,
            borderColor: themeTokens.borderDefault,
            color: themeTokens.textPrimary,
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs placeholder-slate-400 focus:outline-none transition"
        />
      </div>

      {/* Category Filter Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                hapticFeedback('light');
              }}
              style={{
                backgroundColor: isActive ? themeTokens.accentPrimary : themeTokens.bgSurface,
                borderColor: isActive ? 'transparent' : themeTokens.borderDefault,
                color: isActive ? themeTokens.accentContrast : themeTokens.textSecondary,
                boxShadow: isActive ? `0 2px 8px ${themeTokens.accentGlow}` : 'none',
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition"
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Featured Hero Banner */}
      {activeCategory === 'all' && !searchQuery && (
        <div
          onClick={() => {
            const paypulse = availableApps.find((a) => a.id === 'paypulse-wallet');
            if (paypulse) handleOpenDetails(paypulse);
          }}
          style={{
            background: `linear-gradient(135deg, ${themeTokens.accentPrimary}, ${themeTokens.accentHover})`,
            boxShadow: `0 8px 24px ${themeTokens.accentGlow}`,
            color: '#ffffff',
          }}
          className="rounded-3xl p-5 shadow-xl cursor-pointer relative overflow-hidden transition hover:opacity-95"
        >
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-90">Featured Mini App</div>
          <h3 className="text-lg font-black mt-1">PayPulse Wallet v2.4</h3>
          <p className="text-xs opacity-90 mt-0.5 line-clamp-2">
            The next-generation shared payment runtime with contactless animations and pluggable settings.
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md">
              Staff Favorite
            </span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      )}

      {/* Mini Apps List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: themeTokens.textMuted }}
          >
            {activeCategory === 'all' ? 'Discover All Mini Apps' : `${activeCategory} Collection`}
          </span>
          <span
            className="text-[10px] font-mono"
            style={{ color: themeTokens.textMuted }}
          >
            {filteredApps.length} available
          </span>
        </div>

        <div className="space-y-2.5">
          {filteredApps.map((app) => {
            const isInstalled = installedAppIds.includes(app.id);
            const isDownloading = downloadingAppId === app.id;

            return (
              <div
                key={app.id}
                onClick={() => handleOpenDetails(app)}
                style={{
                  backgroundColor: themeTokens.bgCard,
                  borderColor: themeTokens.borderDefault,
                }}
                className="p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer backdrop-blur-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md relative overflow-hidden"
                    style={{ backgroundColor: app.iconBg }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    <span>{app.shortName.slice(0, 2)}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4
                        className="text-xs font-bold truncate"
                        style={{ color: themeTokens.textPrimary }}
                      >
                        {app.name}
                      </h4>
                      {app.author.verified && (
                        <span
                          className="w-3 h-3 rounded-full flex items-center justify-center text-[8px]"
                          style={{
                            backgroundColor: themeTokens.accentMuted,
                            color: themeTokens.accentPrimary,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[11px] truncate mt-0.5"
                      style={{ color: themeTokens.textSecondary }}
                    >
                      {app.summary}
                    </p>
                    <div
                      className="flex items-center gap-2 mt-1.5 text-[10px]"
                      style={{ color: themeTokens.textMuted }}
                    >
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {app.rating}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{app.category}</span>
                      <span>·</span>
                      <span>{app.sizeKb} KB</span>
                    </div>
                  </div>
                </div>

                {/* iOS GET / OPEN Button */}
                <button
                  onClick={(e) => handleInstallClick(app.id, e)}
                  disabled={isDownloading}
                  style={
                    isInstalled
                      ? {
                          backgroundColor: themeTokens.bgSurface,
                          borderColor: themeTokens.borderDefault,
                          color: themeTokens.accentPrimary,
                        }
                      : {
                          backgroundColor: themeTokens.accentPrimary,
                          color: themeTokens.accentContrast,
                          boxShadow: `0 2px 8px ${themeTokens.accentGlow}`,
                        }
                  }
                  className="px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide transition shrink-0 ios-active border"
                >
                  {isDownloading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  ) : isInstalled ? (
                    'OPEN'
                  ) : (
                    'GET'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* App Detail Modal Sheet */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            style={{
              backgroundColor: themeTokens.bgCard,
              borderColor: themeTokens.borderDefault,
              color: themeTokens.textPrimary,
            }}
            className="w-full max-w-md h-[88vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom duration-200"
          >
            {/* Sheet Header */}
            <div
              className="p-4 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: themeTokens.borderDefault }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: themeTokens.textMuted }}
              >
                Mini App Overview
              </span>
              <button
                onClick={() => setSelectedApp(null)}
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.textSecondary,
                }}
                className="p-1.5 rounded-full hover:opacity-80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              {/* App Identity Banner */}
              <div className="flex gap-4 items-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shrink-0"
                  style={{ backgroundColor: selectedApp.iconBg }}
                >
                  {selectedApp.shortName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-base font-extrabold truncate"
                    style={{ color: themeTokens.textPrimary }}
                  >
                    {selectedApp.name}
                  </h3>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: themeTokens.accentPrimary }}
                  >
                    By {selectedApp.author.name}
                  </p>
                  <div
                    className="flex items-center gap-3 mt-1.5 text-xs"
                    style={{ color: themeTokens.textSecondary }}
                  >
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {selectedApp.rating}
                    </span>
                    <span>·</span>
                    <span>{selectedApp.reviewCount} reviews</span>
                    <span>·</span>
                    <span>v{selectedApp.version}</span>
                  </div>
                </div>
              </div>

              {/* Install / Open Action */}
              <button
                onClick={(e) => handleInstallClick(selectedApp.id, e)}
                disabled={downloadingAppId === selectedApp.id}
                style={{
                  backgroundColor: themeTokens.accentPrimary,
                  color: themeTokens.accentContrast,
                  boxShadow: `0 4px 14px ${themeTokens.accentGlow}`,
                }}
                className="w-full py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 ios-active"
              >
                {downloadingAppId === selectedApp.id ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : installedAppIds.includes(selectedApp.id) ? (
                  'Launch Mini App'
                ) : (
                  'Install to Super App'
                )}
              </button>

              {/* Description */}
              <div className="space-y-1.5">
                <h4
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: themeTokens.textMuted }}
                >
                  Description
                </h4>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: themeTokens.textSecondary }}
                >
                  {selectedApp.description}
                </p>
              </div>

              {/* Pluggable Settings Preview */}
              {selectedApp.pluggableSettingsSchema && selectedApp.pluggableSettingsSchema.length > 0 && (
                <div
                  className="space-y-2 p-3.5 rounded-2xl border"
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                  }}
                >
                  <div
                    className="flex items-center gap-2 text-xs font-bold"
                    style={{ color: themeTokens.textPrimary }}
                  >
                    <Sliders
                      className="w-3.5 h-3.5"
                      style={{ color: themeTokens.accentPrimary }}
                    />
                    <span>Pluggable Settings Supported ({selectedApp.pluggableSettingsSchema.length})</span>
                  </div>
                  <p
                    className="text-[11px]"
                    style={{ color: themeTokens.textSecondary }}
                  >
                    This mini app registers custom preferences into your Super App Settings menu automatically.
                  </p>
                </div>
              )}

              {/* Sandboxed Permissions */}
              <div className="space-y-2">
                <h4
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: themeTokens.textMuted }}
                >
                  Sandboxed Permissions
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedApp.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2.5 py-1 rounded-lg border text-[11px] font-mono capitalize"
                      style={{
                        backgroundColor: themeTokens.bgSurface,
                        borderColor: themeTokens.borderDefault,
                        color: themeTokens.textSecondary,
                      }}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Customer Reviews & Ratings */}
              <div
                className="space-y-3 pt-3 border-t"
                style={{ borderColor: themeTokens.borderDefault }}
              >
                <div className="flex justify-between items-center">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: themeTokens.textMuted }}
                  >
                    Ratings & Reviews
                  </h4>
                  <span
                    className="text-xs"
                    style={{ color: themeTokens.textMuted }}
                  >
                    {reviews.length} reviews
                  </span>
                </div>

                {/* Write a review form */}
                <form
                  onSubmit={handleSubmitReview}
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                  }}
                  className="p-3 rounded-2xl border space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className="font-semibold"
                      style={{ color: themeTokens.textPrimary }}
                    >
                      Leave Feedback
                    </span>
                    <div className="flex gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setUserRating(star)}
                          className="hover:scale-110 transition cursor-pointer"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${star <= userRating ? 'fill-current' : 'text-slate-400'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="How does this mini app perform?"
                    style={{
                      backgroundColor: themeTokens.bgInput,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    style={{
                      backgroundColor: themeTokens.accentPrimary,
                      color: themeTokens.accentContrast,
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3 h-3" />
                    <span>Post Review to Repository</span>
                  </button>
                </form>

                {/* Reviews List */}
                <div className="space-y-2">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        backgroundColor: themeTokens.bgSurface,
                        borderColor: themeTokens.borderDefault,
                      }}
                      className="p-3 rounded-xl border text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className="font-bold"
                          style={{ color: themeTokens.textPrimary }}
                        >
                          {rev.userName}
                        </span>
                        <div className="flex gap-0.5 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: themeTokens.textSecondary }}
                      >
                        {rev.comment}
                      </p>
                      <span
                        className="text-[10px]"
                        style={{ color: themeTokens.textMuted }}
                      >
                        {rev.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
