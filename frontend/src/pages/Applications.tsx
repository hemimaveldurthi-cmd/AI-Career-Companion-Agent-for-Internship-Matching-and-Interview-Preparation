import { useMemo, useState } from 'react';
import {
  ClipboardList,
  Building,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  useApplicationStore,
  type ApplicationStatus,
  type TrackedApplication,
} from '../store/applicationStore';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  applied: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  screening: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  interview: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  offer: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function formatDate(value: string | null): string {
  if (!value) return 'No deadline';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const daysLeft = daysUntilDeadline(deadline);

  if (daysLeft === null) {
    return <span className="text-xs text-slate-500">No deadline set</span>;
  }

  if (daysLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-300">
        <AlertTriangle className="w-3.5 h-3.5" />
        Deadline passed
      </span>
    );
  }

  if (daysLeft <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5" />
        Due in {daysLeft} day{daysLeft === 1 ? '' : 's'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <Clock className="w-3.5 h-3.5" />
      {daysLeft} days left
    </span>
  );
}

function ApplicationCard({
  application,
  onStatusChange,
}: {
  application: TrackedApplication;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
}) {
  return (
    <div className="glass-card p-5 border border-slate-800 hover:border-primary-500/30 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-white">{application.title}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-slate-800 text-slate-400 border border-slate-700">
              {application.source}
            </span>
          </div>

          <div className="space-y-1.5 text-sm text-slate-300">
            <p className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500 shrink-0" />
              {application.company}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              {application.location}
            </p>
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              Applied {formatDate(application.appliedAt)}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              Deadline {formatDate(application.deadline)}
              <span className="text-slate-600">·</span>
              <DeadlineBadge deadline={application.deadline} />
            </p>
          </div>

          {application.notes && (
            <p className="mt-3 text-sm text-slate-400 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2">
              {application.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <select
            value={application.status}
            onChange={(event) =>
              onStatusChange(application.id, event.target.value as ApplicationStatus)
            }
            className={`input-field py-2 text-sm min-w-[150px] border ${STATUS_STYLES[application.status]}`}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900 text-slate-200">
                {option.label}
              </option>
            ))}
          </select>

          {application.apply_url && (
            <a
              href={application.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              View Posting
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Applications() {
  const { applications, updateStatus } = useApplicationStore();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');

  const stats = useMemo(() => {
    const upcomingDeadlines = applications.filter((application) => {
      const days = daysUntilDeadline(application.deadline);
      return days !== null && days >= 0 && days <= 7;
    }).length;

    return {
      total: applications.length,
      active: applications.filter((application) => !['offer', 'rejected'].includes(application.status))
        .length,
      interviews: applications.filter((application) => application.status === 'interview').length,
      upcomingDeadlines,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((application) => application.status === statusFilter);
  }, [applications, statusFilter]);

  const upcomingReminders = useMemo(
    () =>
      applications
        .filter((application) => {
          const days = daysUntilDeadline(application.deadline);
          return days !== null && days >= 0 && days <= 7;
        })
        .sort(
          (a, b) =>
            new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime(),
        ),
    [applications],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-8 h-8 text-primary-500" />
          Application Tracker
        </h1>
        <p className="text-slate-400 mt-1">
          Manage applied roles, track status updates, and watch upcoming deadlines.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-l-4 border-primary-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Applications</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-blue-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Pipeline</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.active}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-purple-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interviews</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.interviews}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-amber-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deadlines (7 days)</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.upcomingDeadlines}</p>
        </div>
      </div>

      {upcomingReminders.length > 0 && (
        <div className="glass-card p-5 border border-amber-500/30 bg-amber-500/5">
          <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Upcoming Deadline Reminders
          </h2>
          <div className="space-y-2">
            {upcomingReminders.map((application) => (
              <div
                key={application.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-200">{application.title}</p>
                  <p className="text-xs text-slate-400">{application.company}</p>
                </div>
                <DeadlineBadge deadline={application.deadline} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary-500/15 text-primary-300 border-primary-500/30'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
          }`}
        >
          All
        </button>
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              statusFilter === option.value
                ? STATUS_STYLES[option.value]
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <div className="glass-card p-10 text-center border border-slate-800">
            <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No applications in this view.</p>
            <p className="text-slate-500 text-sm mt-1">
              Click <strong className="text-primary-400">Apply</strong> on the Jobs page to add a role here.
            </p>
          </div>
        ) : (
          filteredApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onStatusChange={updateStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}
