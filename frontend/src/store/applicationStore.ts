import { create } from 'zustand';
import type { Job } from './jobStore';

export type ApplicationStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';

export interface TrackedApplication {
  id: string;
  jobId: string;
  title: string;
  company: string;
  location: string;
  source: string;
  apply_url: string;
  status: ApplicationStatus;
  appliedAt: string;
  deadline: string | null;
  notes: string;
}

const STORAGE_KEY = 'application-tracker';

const SEED_APPLICATIONS: TrackedApplication[] = [
  {
    id: 'seed-1',
    jobId: 'seed-1',
    title: 'Backend Engineering Intern',
    company: 'TechNova Labs',
    location: 'Bangalore, India',
    source: 'linkedin',
    apply_url: 'https://example.com/apply/technova-backend',
    status: 'interview',
    appliedAt: '2026-08-01T10:00:00.000Z',
    deadline: '2026-08-22T23:59:59.000Z',
    notes: 'Technical round scheduled for Friday.',
  },
  {
    id: 'seed-2',
    jobId: 'seed-2',
    title: 'AI/ML Intern',
    company: 'DataSphere AI',
    location: 'Hyderabad, India',
    source: 'internshala',
    apply_url: 'https://example.com/apply/datasphere-ai',
    status: 'screening',
    appliedAt: '2026-08-10T14:30:00.000Z',
    deadline: '2026-08-28T23:59:59.000Z',
    notes: 'Recruiter requested updated resume.',
  },
  {
    id: 'seed-3',
    jobId: 'seed-3',
    title: 'Full Stack Developer Intern',
    company: 'CloudBridge Systems',
    location: 'Remote',
    source: 'unstop',
    apply_url: 'https://example.com/apply/cloudbridge-fullstack',
    status: 'applied',
    appliedAt: '2026-08-15T09:15:00.000Z',
    deadline: '2026-08-30T23:59:59.000Z',
    notes: 'Waiting for initial response.',
  },
];

function loadApplications(): TrackedApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return SEED_APPLICATIONS;
    }
    const parsed = JSON.parse(raw) as TrackedApplication[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_APPLICATIONS;
  } catch {
    return SEED_APPLICATIONS;
  }
}

function saveApplications(applications: TrackedApplication[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

function defaultDeadline(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

interface ApplicationState {
  applications: TrackedApplication[];

  trackApplication: (job: Job) => boolean;
  updateStatus: (id: string, status: ApplicationStatus) => void;
  isTracked: (jobId: string) => boolean;
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  applications: loadApplications(),

  trackApplication: (job) => {
    if (get().isTracked(job.id)) {
      return false;
    }

    const application: TrackedApplication = {
      id: job.id,
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location || 'Remote / Not Specified',
      source: job.source,
      apply_url: job.apply_url,
      status: 'applied',
      appliedAt: new Date().toISOString(),
      deadline: defaultDeadline(),
      notes: 'Added from Jobs page.',
    };

    const applications = [application, ...get().applications];
    saveApplications(applications);
    set({ applications });
    return true;
  },

  updateStatus: (id, status) => {
    const applications = get().applications.map((application) =>
      application.id === id ? { ...application, status } : application,
    );
    saveApplications(applications);
    set({ applications });
  },

  isTracked: (jobId) => get().applications.some((application) => application.jobId === jobId),
}));
