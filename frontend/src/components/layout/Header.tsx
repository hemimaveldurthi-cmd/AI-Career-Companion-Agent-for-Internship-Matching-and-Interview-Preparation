import { useEffect, useState } from 'react';
import { Bell, User as UserIcon, X, Loader2, MapPin, Mail, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';

interface ProfileSummary {
  user_id: string;
  name: string;
  email: string;
  location_preference: string | null;
  skills: string[];
  profile_summary: string;
}

function getProfileSummaryText(summary: string): string | null {
  const trimmed = summary.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') {
    return null;
  }
  return trimmed;
}

export default function Header() {
  const user = useAuthStore((state) => state.user);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isProfileOpen]);

  const openProfileSummary = async () => {
    setIsProfileOpen(true);
    setIsLoading(true);
    setError('');
    setProfileData(null);

    try {
      const response = await apiClient.post<ProfileSummary>('/profile-summary');
      setProfileData(response.data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || 'Failed to load profile summary.');
    } finally {
      setIsLoading(false);
    }
  };

  const closeProfileSummary = () => {
    setIsProfileOpen(false);
    setError('');
  };

  return (
    <>
      <header className="h-20 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border px-8 flex items-center justify-end sticky top-0 z-10">
        <div className="flex items-center space-x-6">
          <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full border border-dark-bg"></span>
          </button>

          <button
            type="button"
            onClick={openProfileSummary}
            className="flex items-center space-x-3 pl-6 border-l border-dark-border rounded-lg transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            aria-label="View profile summary"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-200">{user?.name}</p>
              <p className="text-xs text-primary-400">Career Companion</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-primary-500/20">
              <UserIcon className="w-5 h-5 text-slate-300" />
            </div>
          </button>
        </div>
      </header>

      {isProfileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={closeProfileSummary}
        >
          <div
            className="glass-card w-full max-w-lg border border-slate-700/80 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-summary-title"
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-primary-400" />
                </div>
                <div className="min-w-0">
                  <h2 id="profile-summary-title" className="text-lg font-bold text-white">
                    Profile Summary
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Matching-ready summary from your profile data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeProfileSummary}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                aria-label="Close profile summary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="w-10 h-10 text-primary-400 animate-spin mb-3" />
                  <p className="text-slate-300 font-medium">Loading profile summary...</p>
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                  {error}
                </div>
              ) : profileData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Name</p>
                      <p className="text-sm font-semibold text-slate-100">{profileData.name}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Location Preference
                      </p>
                      <p className="text-sm text-slate-200 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {profileData.location_preference || 'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</p>
                    <p className="text-sm text-slate-200 flex items-center gap-1.5 break-all">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {profileData.email}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Skills ({profileData.skills.length})
                    </p>
                    {profileData.skills.length === 0 ? (
                      <p className="text-sm text-slate-500">No skills listed.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {profileData.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded-md text-[11px] bg-primary-500/10 text-primary-200 border border-primary-500/20"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const summaryText = getProfileSummaryText(profileData.profile_summary);
                    if (!summaryText) return null;

                    return (
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          Profile Summary
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed">{summaryText}</p>
                      </div>
                    );
                  })()}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
