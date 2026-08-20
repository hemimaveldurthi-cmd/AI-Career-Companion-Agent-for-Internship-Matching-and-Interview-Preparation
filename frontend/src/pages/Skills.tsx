import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Target,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Briefcase,
  UploadCloud,
  Sparkles,
} from 'lucide-react';
import { useJobStore } from '../store/jobStore';
import { useDocumentStore } from '../store/documentStore';
import { apiClient } from '../api/client';

interface Readiness {
  matched: number;
  total: number;
  percentage: number;
}

interface MatchedSkill {
  skill: string;
  status: string;
}

interface SkillGapItem {
  skill: string;
  importance: 'high' | 'medium' | 'low';
  reason: string;
}

interface SkillGapResult {
  job_title: string;
  readiness: Readiness;
  matched_skills: MatchedSkill[];
  skill_gaps: SkillGapItem[];
  summary: string;
}

export default function Skills() {
  const { selectedJob, clearSelectedJob, jobs, fetchJobs } = useJobStore();
  const { resumes, loadResumes } = useDocumentStore();
  const navigate = useNavigate();

  const [resumeId, setResumeId] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SkillGapResult | null>(null);

  useEffect(() => {
    fetchJobs();
    loadResumes();
  }, [fetchJobs, loadResumes]);

  const handleAnalyze = async () => {
    setError('');

    if (!selectedJob) {
      setError('Select a target job first.');
      return;
    }
    if (!resumeId && !resumeFile) {
      setError('Select a parsed resume or upload a file.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('job_id', selectedJob.id);
      if (resumeId) {
        formData.append('user_detail_id', resumeId);
      } else if (resumeFile) {
        formData.append('file', resumeFile);
      }

      const response = await apiClient.post('/skill-gaps', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || 'Skill gap analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const importanceColor = (importance: string) => {
    const colors: Record<string, string> = {
      high: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      medium: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      low: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    };
    return colors[importance] || colors.low;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Skill Gap Analysis</h1>
        <p className="text-slate-400 mt-1">Compare your resume against a target internship to find missing skills</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: inputs */}
        <div className="space-y-6">
          {/* Target job */}
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

          {/* Resume source */}
          <div className="glass-card p-6 border-slate-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-400" />
              Resume Source
            </h2>

            {resumes.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Parsed resume
                </label>
                <select
                  value={resumeId}
                  onChange={(e) => {
                    setResumeId(e.target.value);
                    if (e.target.value) setResumeFile(null);
                  }}
                  className="input-field py-2 text-sm bg-slate-900"
                >
                  <option value="">-- None (upload a file instead) --</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.file_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-all">
              <UploadCloud className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-300">
                {resumeFile ? resumeFile.name : 'Upload new resume (PDF/DOCX)'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setResumeFile(e.target.files[0]);
                    setResumeId('');
                  }
                }}
              />
            </label>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/50 rounded-lg text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl font-bold disabled:opacity-50 transition-all"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze Skill Gaps
              </>
            )}
          </button>
        </div>

        {/* Right: results */}
        <div className="lg:col-span-2 space-y-6">
          {!result && !isAnalyzing && (
            <div className="glass-card p-12 flex flex-col items-center justify-center min-h-[400px] border-slate-800 text-center">
              <Target className="w-16 h-16 text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-white">Skill Gap Results</h3>
              <p className="text-slate-500 text-sm max-w-sm mt-2">
                Select a target job and resume, then run the analysis to see your readiness and missing skills.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="glass-card p-12 flex flex-col items-center justify-center min-h-[400px] border-slate-800 text-center">
              <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
              <p className="text-slate-300 font-medium mt-3">Analyzing your skills against the job...</p>
            </div>
          )}

          {result && !isAnalyzing && (
            <>
              {/* Readiness */}
              <div className="glass-card p-6 border-t-2 border-primary-500">
                <h2 className="text-xl font-bold text-white mb-1">{result.job_title}</h2>
                <p className="text-sm text-slate-400 mb-4">{result.summary}</p>

                <div className="flex items-center gap-4">
                  <div className="text-4xl font-extrabold text-primary-400">{result.readiness.percentage}%</div>
                  <div className="flex-1">
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-600 to-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${result.readiness.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {result.readiness.matched} of {result.readiness.total} required skills matched
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Matched skills */}
                <div className="glass-card p-6 border-t-2 border-emerald-500">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Matched Skills ({result.matched_skills.length})
                  </h2>
                  {result.matched_skills.length === 0 ? (
                    <p className="text-slate-500 text-sm">No matched skills.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {result.matched_skills.map((skill) => (
                        <span
                          key={skill.skill}
                          className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-sm font-medium"
                        >
                          {skill.skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skill gaps */}
                <div className="glass-card p-6 border-t-2 border-rose-500">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    Skill Gaps ({result.skill_gaps.length})
                  </h2>
                  {result.skill_gaps.length === 0 ? (
                    <p className="text-slate-500 text-sm">No skill gaps — you&apos;re a great fit!</p>
                  ) : (
                    <div className="space-y-3">
                      {result.skill_gaps.map((gap) => (
                        <div key={gap.skill} className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-200 text-sm">{gap.skill}</span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${importanceColor(gap.importance)}`}>
                              {gap.importance}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{gap.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
