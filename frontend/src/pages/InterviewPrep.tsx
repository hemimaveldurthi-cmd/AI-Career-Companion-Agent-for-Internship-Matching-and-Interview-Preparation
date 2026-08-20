import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListChecks,
  RefreshCw,
  ChevronRight,
  Briefcase,
  Sparkles,
  AlertCircle,
  Lightbulb,
  Code2,
  Users,
} from 'lucide-react';
import { useJobStore } from '../store/jobStore';
import { apiClient } from '../api/client';

interface FocusArea {
  topic: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface TechnicalQuestion {
  question: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expected_points: string[];
}

interface BehavioralQuestion {
  question: string;
  what_interviewer_looks_for: string[];
}

interface PreparationStep {
  step: number;
  title: string;
  description: string;
}

interface InterviewPrepResult {
  job_title: string;
  preparation_summary: string;
  focus_areas: FocusArea[];
  technical_questions: TechnicalQuestion[];
  behavioral_questions: BehavioralQuestion[];
  preparation_plan: PreparationStep[];
  interview_tips: string[];
}

export default function InterviewPrep() {
  const { selectedJob, clearSelectedJob, jobs, fetchJobs } = useJobStore();
  const navigate = useNavigate();

  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InterviewPrepResult | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleGenerate = async () => {
    setError('');

    if (!selectedJob && !instructions.trim()) {
      setError('Select a job or provide instructions.');
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      if (selectedJob) formData.append('job_id', selectedJob.id);
      if (instructions.trim()) formData.append('instructions', instructions);

      const response = await apiClient.post('/interview-prep', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || 'Interview prep generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const priorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      medium: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      low: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    };
    return colors[priority] || colors.low;
  };

  const difficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      hard: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      medium: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      easy: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    };
    return colors[difficulty] || colors.easy;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <ListChecks className="w-8 h-8 text-primary-500" />
          Interview Preparation
        </h1>
        <p className="text-slate-400 mt-1">Generate a tailored interview prep plan for your target internship</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: inputs */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-slate-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-400" />
              Target Internship
            </h2>

            {selectedJob ? (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative">
                <button
                  onClick={clearSelectedJob}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                >
                  Change
                </button>
                <h3 className="font-bold text-slate-200 pr-16">{selectedJob.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{selectedJob.company}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-center">
                  <p className="text-slate-400 text-sm">No target internship selected</p>
                  <button
                    onClick={() => navigate('/jobs')}
                    className="text-xs text-primary-400 hover:text-primary-300 font-semibold mt-2 inline-flex items-center gap-1"
                  >
                    Browse jobs <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {jobs.length > 0 && (
                  <select
                    onChange={(e) => {
                      const job = jobs.find((j) => j.id === e.target.value);
                      if (job) useJobStore.getState().selectJob(job);
                    }}
                    className="input-field py-2 text-sm bg-slate-900"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Choose a job --</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} at {job.company}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="glass-card p-6 border-slate-800">
            <h2 className="text-lg font-bold text-white mb-4">Additional Instructions</h2>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="input-field min-h-[120px] text-sm"
              placeholder="E.g. Focus on system design and behavioral questions for a backend role..."
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/50 rounded-lg text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl font-bold disabled:opacity-50 transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Interview Prep
              </>
            )}
          </button>
        </div>

        {/* Right: results */}
        <div className="lg:col-span-2 space-y-6">
          {!result && !isGenerating && (
            <div className="glass-card p-12 flex flex-col items-center justify-center min-h-[400px] border-slate-800 text-center">
              <ListChecks className="w-16 h-16 text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-white">Interview Prep Plan</h3>
              <p className="text-slate-500 text-sm max-w-sm mt-2">
                Select a target job and generate a plan with focus areas, technical and behavioral questions, and a
                step-by-step preparation roadmap.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="glass-card p-12 flex flex-col items-center justify-center min-h-[400px] border-slate-800 text-center">
              <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
              <p className="text-slate-300 font-medium mt-3">Generating your interview prep plan...</p>
            </div>
          )}

          {result && !isGenerating && (
            <>
              <div className="glass-card p-6 border-t-2 border-primary-500">
                <h2 className="text-xl font-bold text-white mb-1">{result.job_title || 'Interview Preparation'}</h2>
                {result.preparation_summary && (
                  <p className="text-sm text-slate-400 mt-2">{result.preparation_summary}</p>
                )}
              </div>

              {/* Focus areas */}
              {result.focus_areas.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    Focus Areas
                  </h2>
                  <div className="space-y-3">
                    {result.focus_areas.map((area, i) => (
                      <div key={i} className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-200 text-sm">{area.topic}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityColor(area.priority)}`}>
                            {area.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{area.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical questions */}
              {result.technical_questions.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-primary-400" />
                    Technical Questions
                  </h2>
                  <div className="space-y-3">
                    {result.technical_questions.map((q, i) => (
                      <div key={i} className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-200 text-sm">{q.question}</p>
                          <span className={`shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${difficultyColor(q.difficulty)}`}>
                            {q.difficulty}
                          </span>
                        </div>
                        {q.expected_points.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {q.expected_points.map((point, pi) => (
                              <li key={pi} className="text-xs text-slate-400 flex items-start gap-1.5">
                                <span className="text-primary-400 mt-0.5">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavioral questions */}
              {result.behavioral_questions.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    Behavioral Questions
                  </h2>
                  <div className="space-y-3">
                    {result.behavioral_questions.map((q, i) => (
                      <div key={i} className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                        <p className="font-semibold text-slate-200 text-sm">{q.question}</p>
                        {q.what_interviewer_looks_for.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {q.what_interviewer_looks_for.map((point, pi) => (
                              <li key={pi} className="text-xs text-slate-400 flex items-start gap-1.5">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preparation plan */}
              {result.preparation_plan.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-indigo-400" />
                    Preparation Plan
                  </h2>
                  <div className="space-y-3">
                    {result.preparation_plan.map((step) => (
                      <div key={step.step} className="flex gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {step.step}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{step.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {result.interview_tips.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Interview Tips
                  </h2>
                  <ul className="space-y-2">
                    {result.interview_tips.map((tip, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
