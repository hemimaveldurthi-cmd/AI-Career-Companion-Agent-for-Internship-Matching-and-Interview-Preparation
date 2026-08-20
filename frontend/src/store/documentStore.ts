import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface EducationItem {
  institution: string;
  degree: string;
  start_date: string;
  end_date: string;
  details: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  technologies: string[];
  url: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  responsibilities: string[];
}

export interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
  credential_url: string;
}

export interface ResumeData {
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  experience: ExperienceItem[];
  headline: string;
  profile_summary: string;
  certifications: CertificationItem[];
  phone_number: string;
  linkedin: string;
}

export interface ParsedResume {
  id: string;
  user_id: string;
  type: string;
  file_name: string;
  file_path: string;
  extracted: ResumeData;
  created_at: string;
  updated_at: string;
}

export interface CoverLetterData {
  applicant_name: string;
  email: string;
  phone_number: string;
  address?: string | null;
  date: string;
  hiring_manager_name?: string | null;
  company_name: string;
  company_address?: string | null;
  job_title: string;
  salutation: string;
  opening_paragraph: string;
  body_paragraphs: string[];
  why_this_company: string;
  closing_paragraph: string;
  signature: string;
}

export interface ParsedCoverLetter {
  id: string;
  user_id: string;
  type: string;
  file_name: string;
  file_path: string;
  extracted: CoverLetterData;
  created_at: string;
  updated_at: string;
}

interface DocumentState {
  resumes: ParsedResume[];
  coverLetters: ParsedCoverLetter[];
  isLoading: boolean;

  loadResumes: () => Promise<void>;
  loadCoverLetters: () => Promise<void>;
  parseResume: (file: File) => Promise<ParsedResume | null>;
  parseCoverLetter: (file: File) => Promise<ParsedCoverLetter | null>;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  resumes: [],
  coverLetters: [],
  isLoading: false,

  loadResumes: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/resumes');
      set({ resumes: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('loadResumes error:', error);
    }
  },

  loadCoverLetters: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/cover-letters');
      set({ coverLetters: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('loadCoverLetters error:', error);
    }
  },

  parseResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await apiClient.post('/resumes/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const parsed = response.data as ParsedResume;
      set((state) => ({ resumes: [parsed, ...state.resumes] }));
      return parsed;
    } catch (error) {
      console.error('parseResume error:', error);
      return null;
    }
  },

  parseCoverLetter: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await apiClient.post('/cover-letters/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const parsed = response.data as ParsedCoverLetter;
      set((state) => ({ coverLetters: [parsed, ...state.coverLetters] }));
      return parsed;
    } catch (error) {
      console.error('parseCoverLetter error:', error);
      return null;
    }
  },
}));
