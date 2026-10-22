import React, { useState, useRef, useEffect } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { MiniAppCategory, MiniAppManifest, MiniAppReview } from '../types/miniapp';
import { repositoryService } from '../services/repositoryService';
import {
  Search,
  Star,
  ChevronRight,
  X,
  Sliders,
  Send,
  ArrowUpDown,
  LayoutGrid,
  Clock,
  Wallet,
  Train,
  Utensils,
  HeartPulse,
  Briefcase,
  Wrench,
  Code2,
  QrCode,
  Camera,
  CameraOff,
  Sparkles,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

type FilterCategory = 'all' | 'recent' | MiniAppCategory;

interface CategoryFilterOption {
  id: FilterCategory;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const CATEGORY_OPTIONS: CategoryFilterOption[] = [
  { id: 'all', label: 'All Apps', icon: LayoutGrid },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'transport', label: 'Transit', icon: Train },
  { id: 'food', label: 'Food & Drink', icon: Utensils },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'productivity', label: 'Productivity', icon: Briefcase },
  { id: 'utilities', label: 'Utilities', icon: Wrench },
  { id: 'developer', label: 'Developer', icon: Code2 },
];

export const StorePage: React.FC = () => {
  const {
    availableApps,
    installedAppIds,
    recentAppIds,
    clearRecentApps,
    installApp,
    openMiniApp,
    user,
    showToast,
    hapticFeedback,
    refreshApps,
    themeTokens,
  } = useSuperApp();

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'recent'>('downloads');
  const [selectedApp, setSelectedApp] = useState<MiniAppManifest | null>(null);
  const [reviews, setReviews] = useState<MiniAppReview[]>([]);
  const [, setIsLoadingDetails] = useState(false);
  const [downloadingAppId, setDownloadingAppId] = useState<string | null>(null);

  // QR Code Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [qrInputCode, setQrInputCode] = useState('');
  const [scannedApp, setScannedApp] = useState<MiniAppManifest | null>(null);
  const [isScanningAnimation, setIsScanningAnimation] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Review form state
  const [userRating, setUserRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCameraStream = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API unavailable in this browser context. Use Quick-Scan below.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError('Camera permission declined or no camera found. Use Quick-Scan or enter a QR code below.');
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (!isScannerOpen) {
      stopCameraStream();
      setScannedApp(null);
      setQrInputCode('');
      setCameraError(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [isScannerOpen]);

  const handleResolveQrPayload = (rawPayload: string) => {
    const cleaned = rawPayload
      .trim()
      .toLowerCase()
      .replace(/^omnimini:\/\/app\//i, '')
      .replace(/^https?:\/\/[^/]+\/app\//i, '');

    if (!cleaned) {
      showToast('Please enter or scan a valid Mini App QR code', 'warning');
      return;
    }

    setIsScanningAnimation(true);
    hapticFeedback('medium');

    setTimeout(() => {
      setIsScanningAnimation(false);
      const matched = availableApps.find(
        (a) =>
          a.id.toLowerCase() === cleaned ||
          a.shortName.toLowerCase() === cleaned ||
          a.name.toLowerCase() === cleaned
      );

      if (matched) {
        setScannedApp(matched);
        hapticFeedback('success');
        showToast(`QR Decoded: ${matched.name}`, 'success');
      } else {
        showToast(`No mini app found matching code "${rawPayload}"`, 'error');
      }
    }, 450);
  };

  const handleAddOrLaunchScannedApp = async (app: MiniAppManifest) => {
    hapticFeedback('medium');
    const alreadyInstalled = installedAppIds.includes(app.id);
    if (!alreadyInstalled) {
      await installApp(app.id);
    }
    setIsScannerOpen(false);
    openMiniApp(app.id);
  };

  const getCategoryCount = (catId: FilterCategory): number => {
    if (catId === 'all') return availableApps.length;
    if (catId === 'recent') {
      return availableApps.filter((app) => recentAppIds.includes(app.id)).length;
    }
    return availableApps.filter((app) => app.category === catId).length;
  };

  const filteredApps = availableApps
    .filter((app) => {
      const matchesCategory =
        activeCategory === 'all'
          ? true
          : activeCategory === 'recent'
          ? recentAppIds.includes(app.id)
          : app.category === activeCategory;
      const matchesSearch =
        !searchQuery ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.author.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (activeCategory === 'recent') {
        return recentAppIds.indexOf(a.id) - recentAppIds.indexOf(b.id);
      }
      if (sortBy === 'downloads') {
        return (b.downloadCount || 0) - (a.downloadCount || 0);
      } else if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === 'recent') {
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
      return 0;
    });

  const activeCategoryLabel =
    CATEGORY_OPTIONS.find((c) => c.id === activeCategory)?.label || 'All Apps';

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
      {/* Store Header with QR Scanner Action */}
      <div className="flex items-center justify-between gap-3">
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

        <button
          type="button"
          onClick={() => {
            setIsScannerOpen(true);
            hapticFeedback('light');
          }}
          style={{
            backgroundColor: themeTokens.accentMuted,
            borderColor: themeTokens.borderAccent,
            color: themeTokens.accentPrimary,
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition ios-active shrink-0"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan QR</span>
        </button>
      </div>

      {/* Horizontal Scrollable Category Filter Bar at Top */}
      <div
        role="tablist"
        aria-label="Mini App Categories"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4"
      >
        {CATEGORY_OPTIONS.map((cat) => {
          const isActive = activeCategory === cat.id;
          const IconComponent = cat.icon;
          const count = getCategoryCount(cat.id);

          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveCategory(cat.id);
                hapticFeedback('light');
              }}
              style={{
                backgroundColor: isActive ? themeTokens.accentPrimary : themeTokens.bgSurface,
                borderColor: isActive ? 'transparent' : themeTokens.borderDefault,
                color: isActive ? themeTokens.accentContrast : themeTokens.textSecondary,
                boxShadow: isActive ? `0 4px 12px ${themeTokens.accentGlow}` : 'none',
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap border transition ios-active shrink-0"
            >
              <IconComponent className="w-3.5 h-3.5 shrink-0" />
              <span>{cat.label}</span>
              <span
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : themeTokens.bgCard,
                  color: isActive ? themeTokens.accentContrast : themeTokens.textMuted,
                }}
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Sort Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: themeTokens.textMuted }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, category or summary..."
            style={{
              backgroundColor: themeTokens.bgInput,
              borderColor: themeTokens.borderDefault,
              color: themeTokens.textPrimary,
            }}
            className="w-full pl-10 pr-8 py-2.5 rounded-2xl border text-xs placeholder-slate-400 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:opacity-80"
              style={{ color: themeTokens.textMuted }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="relative shrink-0">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ArrowUpDown className="w-3.5 h-3.5" style={{ color: themeTokens.textMuted }} />
          </div>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as 'downloads' | 'rating' | 'recent');
              hapticFeedback('light');
            }}
            style={{
              backgroundColor: themeTokens.bgInput,
              borderColor: themeTokens.borderDefault,
              color: themeTokens.textPrimary,
            }}
            className="pl-8 pr-3 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none transition appearance-none cursor-pointer"
          >
            <option value="downloads">Most Downloaded</option>
            <option value="rating">Top Rated</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>
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
            {activeCategory === 'all'
              ? 'Discover All Mini Apps'
              : activeCategory === 'recent'
              ? 'Recently Launched Mini Apps'
              : `${activeCategoryLabel} Collection`}
          </span>
          <div className="flex items-center gap-2">
            {activeCategory === 'recent' && recentAppIds.length > 0 && (
              <button
                type="button"
                onClick={clearRecentApps}
                className="flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:opacity-80 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear History</span>
              </button>
            )}
            <span
              className="text-[10px] font-mono"
              style={{ color: themeTokens.textMuted }}
            >
              {filteredApps.length} available
            </span>
          </div>
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

          {filteredApps.length === 0 && (
            <div
              style={{
                backgroundColor: themeTokens.bgCard,
                borderColor: themeTokens.borderDefault,
              }}
              className="p-6 rounded-2xl border text-center space-y-2.5"
            >
              <p
                className="text-xs font-semibold"
                style={{ color: themeTokens.textPrimary }}
              >
                No mini apps found in {activeCategoryLabel}
              </p>
              <p
                className="text-[11px]"
                style={{ color: themeTokens.textSecondary }}
              >
                Try selecting another category or clearing your search query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                  hapticFeedback('light');
                }}
                style={{
                  backgroundColor: themeTokens.accentPrimary,
                  color: themeTokens.accentContrast,
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold transition ios-active"
              >
                Reset Filters
              </button>
            </div>
          )}
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

      {/* QR Code Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            style={{
              backgroundColor: themeTokens.bgCard,
              borderColor: themeTokens.borderDefault,
              color: themeTokens.textPrimary,
            }}
            className="w-full max-w-md max-h-[90vh] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom duration-200"
          >
            {/* Modal Header */}
            <div
              className="p-4 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: themeTokens.borderDefault }}
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4" style={{ color: themeTokens.accentPrimary }} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Mini App QR Scanner
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.textSecondary,
                }}
                className="p-1.5 rounded-full hover:opacity-80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {/* Optical Viewfinder */}
              <div
                style={{
                  backgroundColor: '#050811',
                  borderColor: themeTokens.borderDefault,
                }}
                className="relative w-full h-52 rounded-2xl border overflow-hidden flex flex-col items-center justify-center"
              >
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center px-6 space-y-2 z-10">
                    <div
                      className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                      style={{
                        backgroundColor: themeTokens.accentMuted,
                        color: themeTokens.accentPrimary,
                      }}
                    >
                      <QrCode className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-white">
                      Point camera at an OmniMini QR Code
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Automatically detects <span className="font-mono">omnimini://app/*</span> payloads to install or launch mini apps.
                    </p>
                  </div>
                )}

                {/* Corner Brackets & Animated Laser Reticle */}
                <div className="absolute inset-6 pointer-events-none border border-white/15 rounded-2xl">
                  <div
                    className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 rounded-tl-lg"
                    style={{ borderColor: themeTokens.accentPrimary }}
                  />
                  <div
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 rounded-tr-lg"
                    style={{ borderColor: themeTokens.accentPrimary }}
                  />
                  <div
                    className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 rounded-bl-lg"
                    style={{ borderColor: themeTokens.accentPrimary }}
                  />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 rounded-br-lg"
                    style={{ borderColor: themeTokens.accentPrimary }}
                  />
                  {(isCameraActive || isScanningAnimation) && (
                    <div
                      style={{ backgroundColor: themeTokens.accentPrimary }}
                      className="w-full h-0.5 shadow-lg animate-pulse mt-20"
                    />
                  )}
                </div>

                {/* Camera Toggle Button */}
                <button
                  type="button"
                  onClick={() => (isCameraActive ? stopCameraStream() : startCameraStream())}
                  className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-black/70 text-white border border-white/15 backdrop-blur-md transition ios-active"
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Stop Camera</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Enable Camera</span>
                    </>
                  )}
                </button>
              </div>

              {cameraError && (
                <p className="text-[11px] text-amber-400 px-1">{cameraError}</p>
              )}

              {/* Scanned App Result Card */}
              {scannedApp && (
                <div
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.accentPrimary,
                  }}
                  className="p-3.5 rounded-2xl border space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                      style={{ color: themeTokens.accentPrimary }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>QR Code Verified</span>
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: themeTokens.textMuted }}>
                      v{scannedApp.version}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: scannedApp.iconBg }}
                    >
                      {scannedApp.shortName.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold truncate" style={{ color: themeTokens.textPrimary }}>
                        {scannedApp.name}
                      </h4>
                      <p className="text-[11px] truncate" style={{ color: themeTokens.textSecondary }}>
                        {scannedApp.summary}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddOrLaunchScannedApp(scannedApp)}
                    style={{
                      backgroundColor: themeTokens.accentPrimary,
                      color: themeTokens.accentContrast,
                      boxShadow: `0 4px 12px ${themeTokens.accentGlow}`,
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ios-active"
                  >
                    {installedAppIds.includes(scannedApp.id)
                      ? 'Launch Mini App Now'
                      : 'Add & Launch Mini App'}
                  </button>
                </div>
              )}

              {/* Manual QR Code / Deep-Link Entry */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResolveQrPayload(qrInputCode);
                }}
                className="space-y-1.5"
              >
                <label
                  className="text-[11px] font-bold uppercase tracking-wider block"
                  style={{ color: themeTokens.textMuted }}
                >
                  Enter QR Code Payload or App ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrInputCode}
                    onChange={(e) => setQrInputCode(e.target.value)}
                    placeholder="e.g. omnimini://app/paypulse-wallet"
                    style={{
                      backgroundColor: themeTokens.bgInput,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none"
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: themeTokens.accentPrimary,
                      color: themeTokens.accentContrast,
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold transition ios-active shrink-0"
                  >
                    Decode
                  </button>
                </div>
              </form>

              {/* Quick-Scan Demo QR Codes for Instant Testing */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
                    style={{ color: themeTokens.textMuted }}
                  >
                    <Sparkles className="w-3 h-3" style={{ color: themeTokens.accentPrimary }} />
                    <span>Tap a Sample QR Code to Scan</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {availableApps.map((app) => {
                    const isInstalled = installedAppIds.includes(app.id);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleResolveQrPayload(`omnimini://app/${app.id}`)}
                        style={{
                          backgroundColor: themeTokens.bgSurface,
                          borderColor:
                            scannedApp?.id === app.id
                              ? themeTokens.accentPrimary
                              : themeTokens.borderDefault,
                        }}
                        className="p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ios-active"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: app.iconBg }}
                        >
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-[11px] font-bold truncate"
                            style={{ color: themeTokens.textPrimary }}
                          >
                            {app.shortName}
                          </div>
                          <div
                            className="text-[9px] font-mono truncate"
                            style={{ color: themeTokens.textMuted }}
                          >
                            {isInstalled ? 'Installed • Launch' : 'Scan to Add'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
