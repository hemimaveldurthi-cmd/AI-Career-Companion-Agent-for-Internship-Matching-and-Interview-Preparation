import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Sparkles,
  Building,
  MapPin,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  Briefcase,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import { useJobStore } from '../store/jobStore';
import { useDocumentStore } from '../store/documentStore';
import { apiClient } from '../api/client';

const getPdfEmbedUrl = (url: string) => `${url}#navpanes=0&pagemode=none&view=FitH`;

export default function ResumeBuilder() {
  const { selectedJob, clearSelectedJob, jobs, fetchJobs } = useJobStore();
  const { resumes, loadResumes } = useDocumentStore();
  const navigate = useNavigate();

  const [instructions, setInstructions] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    loadResumes();
  }, [fetchJobs, loadResumes]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const downloadPdf = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tailored-resume.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async () => {
    setError('');

    if (!resumeId && !resumeFile) {
      setError('Select a parsed resume or upload a file.');
      return;
    }
    if (!instructions.trim()) {
      setError('Please provide tailoring instructions.');
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('instructions', instructions);
      if (resumeId) {
        formData.append('user_detail_id', resumeId);
      } else if (resumeFile) {
        formData.append('file', resumeFile);
      }
      if (selectedJob) {
        formData.append('job_id', selectedJob.id);
      }

      const response = await apiClient.post('/resume-tailoring', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

      setPdfPreviewUrl((previousUrl) => {
        if (previousUrl) {
          window.URL.revokeObjectURL(previousUrl);
        }
        return url;
      });

      downloadPdf(url);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || 'Failed to generate tailored resume');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary-500 animate-pulse" />
            AI Resume Builder
          </h1>
          <p className="text-slate-400 mt-1">Tailor your resume toward a target internship and download a PDF</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className={`space-y-6 ${pdfPreviewUrl ? 'lg:col-span-4' : 'lg:col-span-5'}`}>
          {/* Target job */}
          <div className="glass-card p-6 border-slate-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-400" />
              Target Internship
            </h2>

            {selectedJob ? (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative group">
                <button
                  onClick={clearSelectedJob}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                >
                  Change target
                </button>
                <h3 className="font-bold text-slate-200 pr-16">{selectedJob.title}</h3>
                <p className="text-sm text-slate-400 mt-1 flex items-center">
                  <Building className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  {selectedJob.company}
                </p>
                {selectedJob.location && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    {selectedJob.location}
                  </p>
                )}
                {selectedJob.apply_url && (
                  <a
                    href={selectedJob.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 pt-3 border-t border-slate-800 flex items-center text-primary-400 hover:text-primary-300 text-xs"
                  >
                    View Original <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Or select a job:
                    </label>
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
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resume source */}
          <div className="glass-card p-6 border-slate-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
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

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Or upload a new resume
              </label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-all">
                <UploadCloud className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-300">
                  {resumeFile ? resumeFile.name : 'Choose PDF/DOCX'}
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
          </div>

          {/* Instructions */}
          <div className="glass-card p-6 border-slate-800">
            <h2 className="text-lg font-bold text-white mb-4">Tailoring Instructions</h2>

            {error && (
              <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/50 rounded-lg text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="input-field min-h-[140px] text-sm"
              placeholder="E.g. Emphasize my Python backend work, highlight React skills, and structure projects first..."
            />

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-white" />
                  Generate Tailored Resume
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: PDF preview */}
        <div className={pdfPreviewUrl ? 'lg:col-span-8' : 'lg:col-span-7'}>
          <div
            className={`glass-card border-slate-800 flex flex-col ${
              pdfPreviewUrl ? 'p-3 min-h-[75vh]' : 'p-6 min-h-[500px]'
            }`}
          >
            {isGenerating ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center py-12">
                <RefreshCw className="w-12 h-12 text-primary-400 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white">Generating tailored resume...</h3>
                <p className="text-slate-500 text-sm max-w-sm mt-2">
                  The AI is tailoring your resume and compiling the PDF. This may take a moment.
                </p>
              </div>
            ) : pdfPreviewUrl ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
                  <div>
                    <h3 className="text-base font-bold text-white">Tailored PDF Output</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Preview your generated resume below.</p>
                  </div>
                  <button
                    onClick={() => downloadPdf(pdfPreviewUrl)}
                    className="inline-flex items-center justify-center gap-2 py-1.5 px-3 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold transition-all shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
                <iframe
                  src={getPdfEmbedUrl(pdfPreviewUrl)}
                  title="Tailored resume preview"
                  className="w-full flex-1 min-h-[68vh] rounded-lg border border-slate-800 bg-white"
                />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center py-12">
                <Download className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-white">Tailored PDF Output</h3>
                <p className="text-slate-500 text-sm max-w-sm mt-2">
                  Select a target job, choose a resume source, and add instructions. The AI will tailor your resume and
                  return a compiled PDF for download.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
