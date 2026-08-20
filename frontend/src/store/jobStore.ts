import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string[];
  salary: string;
  type: string;
  role: string;
  source: string;
  duration: string;
  apply_url: string;
  created_at: string;
}

export interface ScrapeResult {
  scraped_count: number;
  db_inserted_count: number;
  rag_indexed_count: number;
  message: string;
}

interface JobState {
  jobs: Job[];
  isLoading: boolean;
  isScanning: boolean;
  selectedJob: Job | null;

  fetchJobs: () => Promise<void>;
  scrapeJobs: () => Promise<ScrapeResult | null>;
  selectJob: (job: Job) => void;
  clearSelectedJob: () => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  isLoading: false,
  isScanning: false,
  selectedJob: null,

  fetchJobs: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/jobs');
      set({ jobs: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('fetchJobs error:', error);
    }
  },

  scrapeJobs: async () => {
    set({ isScanning: true });
    try {
      const response = await apiClient.post('/jobs/scrape');
      set({ isScanning: false });
      return response.data as ScrapeResult;
    } catch (error) {
      set({ isScanning: false });
      console.error('scrapeJobs error:', error);
      return null;
    }
  },

  selectJob: (job) => set({ selectedJob: job }),
  clearSelectedJob: () => set({ selectedJob: null }),
}));
