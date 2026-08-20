import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Briefcase,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDocumentStore, type ParsedResume } from '../store/documentStore';
import { apiClient } from '../api/client';

interface JobMatch {
  score: number;
  job: {
    title: string;
    company: string;
    description: string;
    skills_required: string[];
    location: string;
    apply_url: string;
    source: string;
    stipend: string;
    duration: string;
  } | null;
  citation: { source: string; apply_url: string; vector_document_id: string };
}

interface MatchingResult {
  profile: { skills: string[]; headline: string; profile_summary: string };
  matches: JobMatch[];
}

interface SkillGroup {
  category: string | null;
  items: string[];
}

function parseSkillGroups(skills: string[]): SkillGroup[] {
  return skills.map((skill) => {
    const colonIndex = skill.indexOf(':');
    if (colonIndex > 0 && colonIndex < 48) {
      return {
        category: skill.slice(0, colonIndex).trim(),
        items: skill
          .slice(colonIndex + 1)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };
    }
    return { category: null, items: [skill.trim()] };
  });
}

function countSkillItems(groups: SkillGroup[]): number {
  return groups.reduce((total, group) => total + group.items.length, 0);
}

function SkillChip({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] leading-tight bg-primary-500/10 text-primary-200 border border-primary-500/20">
      {label}
    </span>
  );
}

function ParsedResumeSkillsPreview({
  skills,
  expanded = false,
  limitHeight = true,
  className = '',
}: {
  skills: string[];
  expanded?: boolean;
  limitHeight?: boolean;
  className?: string;
}) {
  const groups = parseSkillGroups(skills);
  if (groups.length === 0) return null;

  const visibleGroups = expanded ? groups : groups.slice(0, 2);
  const hiddenGroupCount = groups.length - visibleGroups.length;
  const maxChipsPerGroup = expanded ? 8 : 4;

  return (
    <div
      className={`mt-3 space-y-2 ${expanded && limitHeight ? 'max-h-72 overflow-y-auto pr-1' : ''} ${className}`}
    >
      {visibleGroups.map((group, index) => (
        <div
          key={`${group.category ?? 'skills'}-${index}`}
          className="rounded-lg bg-slate-950/50 border border-slate-800/80 px-3 py-2"
        >
          {group.category && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {group.category}
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {group.items.slice(0, maxChipsPerGroup).map((item) => (
              <SkillChip key={item} label={item} />
            ))}
            {group.items.length > maxChipsPerGroup && (
              <span className="px-2 py-0.5 text-[11px] text-slate-500 self-center">
                +{group.items.length - maxChipsPerGroup}
              </span>
            )}
          </div>
        </div>
      ))}
      {!expanded && hiddenGroupCount > 0 && (
        <p className="text-xs text-slate-500 text-center pt-0.5">+{hiddenGroupCount} more categories</p>
      )}
    </div>
  );
}

function ResumeStatBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/80">
      {label}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { resumes, loadResumes, parseResume } = useDocumentStore();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [matchingError, setMatchingError] = useState('');

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const processResumeFile = async (file: File) => {
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      setUploadError('Only PDF and DOCX files are allowed.');
      return;
    }
    setUploadError('');
    setIsUploading(true);
    try {
      const parsed = await parseResume(file);
      if (parsed) {
        setSelectedResumeId(parsed.id);
      } else {
        setUploadError('Failed to parse resume. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processResumeFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processResumeFile(e.target.files[0]);
    }
  };

  const runMatching = async () => {
    if (!selectedResumeId) {
      setMatchingError('Select a parsed resume first.');
      return;
    }
    setIsMatching(true);
    setMatchingError('');
    try {
      const formData = new FormData();
      formData.append('user_detail_id', selectedResumeId);
      const response = await apiClient.post('/matching', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMatchingResult(response.data);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setMatchingError(detail || 'Matching failed. Please try again.');
    } finally {
      setIsMatching(false);
    }
  };

  const selectedResume: ParsedResume | undefined = resumes.find((r) => r.id === selectedResumeId);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-indigo-300 to-purple-400">
            Control Center
          </h1>
          <p className="text-slate-400 mt-1">
            Hi, {user?.name?.split(' ')[0] || 'there'}! Upload your resume, match internships, and let AI build your application pipeline.
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-l-4 border-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">Parsed Resumes</p>
              <p className="text-3xl font-bold text-white mt-1">{resumes.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">AI Job Matches</p>
              <p className="text-3xl font-bold text-white mt-1">{matchingResult?.matches.length ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">Profile Skills</p>
              <p className="text-3xl font-bold text-white mt-1">{user?.skills?.length ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <User className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Resume upload + list */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upload zone */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary-400" />
              Upload Resume (PDF/DOCX)
            </h2>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
                isDragActive
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center py-4">
                  <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                  <p className="text-slate-300 font-medium mt-3">Uploading &amp; parsing resume with AI...</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-slate-200 font-medium text-center">
                    Drag and drop your resume here, or{' '}
                    <label className="text-primary-400 hover:text-primary-300 cursor-pointer underline">
                      browse files
                      <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileChange} />
                    </label>
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">Supports PDF and DOCX (Max 10MB)</p>
                </>
              )}
            </div>

            {uploadError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Parsed resumes list */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Parsed Resumes
            </h2>

            {resumes.length === 0 ? (
              <div className="py-8 text-center bg-slate-900/30 rounded-xl border border-slate-800 text-slate-500 text-sm">
                No resumes parsed yet. Upload a file above.
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.map((resume) => {
                  const skillGroups = parseSkillGroups(resume.extracted.skills);
                  const isSelected = selectedResumeId === resume.id;

                  return (
                    <button
                      key={resume.id}
                      onClick={() => setSelectedResumeId(resume.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-primary-500/60 bg-primary-500/5 ring-1 ring-primary-500/20'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100 truncate">{resume.file_name}</p>
                              {resume.extracted.headline && (
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{resume.extracted.headline}</p>
                              )}
                            </div>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <ResumeStatBadge label={`${countSkillItems(skillGroups)} skills`} />
                            <ResumeStatBadge label={`${resume.extracted.experience.length} roles`} />
                            <ResumeStatBadge label={`${resume.extracted.projects.length} projects`} />
                          </div>
                        </div>
                      </div>
                      {resume.extracted.skills.length > 0 && (
                        <ParsedResumeSkillsPreview skills={resume.extracted.skills} expanded={isSelected} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Matching */}
        <div className="space-y-8">
          {/* Matching */}
          <div className="glass-card p-6 border-t-2 border-primary-500">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              Match Internships
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Rank internships against your selected resume using the RAG pipeline.
            </p>

            {matchingError && (
              <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-sm">
                {matchingError}
              </div>
            )}

            <button
              onClick={runMatching}
              disabled={isMatching || !selectedResumeId}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 transition-all"
            >
              {isMatching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Run Matching
                </>
              )}
            </button>

            {matchingResult && (
              <div className="mt-4 space-y-3">
                {matchingResult.matches.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No matches found.</p>
                ) : (
                  matchingResult.matches.slice(0, 6).map((match, i) => (
                    <div key={i} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 text-sm leading-snug">{match.job?.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{match.job?.company}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                          {(match.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {match.job?.location || 'Remote'}
                        </span>
                        {match.job?.apply_url && (
                          <a
                            href={match.job.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected resume detail */}
      {selectedResume && (
        <div className="glass-card p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{selectedResume.file_name}</h2>
              {selectedResume.extracted.headline && (
                <p className="text-sm text-slate-400 mt-1">{selectedResume.extracted.headline}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Summary</h3>
                <p className="text-slate-300 leading-relaxed">{selectedResume.extracted.profile_summary || '—'}</p>
              </div>

              {selectedResume.extracted.skills.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Skills ({countSkillItems(parseSkillGroups(selectedResume.extracted.skills))})
                  </h3>
                  <ParsedResumeSkillsPreview
                    skills={selectedResume.extracted.skills}
                    expanded
                    limitHeight={false}
                    className="mt-0"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Experience ({selectedResume.extracted.experience.length})
                </h3>
                <div className="space-y-2">
                  {selectedResume.extracted.experience.length === 0 ? (
                    <p className="text-slate-500 text-sm">No experience listed.</p>
                  ) : (
                    selectedResume.extracted.experience.map((exp, i) => (
                      <div key={i} className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                        <p className="font-semibold text-slate-200">{exp.role || 'Role'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{exp.company}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedResume.extracted.projects.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Projects ({selectedResume.extracted.projects.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedResume.extracted.projects.map((project, i) => (
                      <div key={i} className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                        <p className="font-semibold text-slate-200">{project.name || 'Project'}</p>
                        {project.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{project.description}</p>
                        )}
                        {project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.technologies.slice(0, 5).map((tech) => (
                              <SkillChip key={tech} label={tech} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
