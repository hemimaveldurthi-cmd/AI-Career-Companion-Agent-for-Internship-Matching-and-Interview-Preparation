import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  MapPin,
  DollarSign,
  ExternalLink,
  RefreshCw,
  Zap,
  Sparkles,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { useJobStore } from '../store/jobStore';
import { useApplicationStore } from '../store/applicationStore';

export default function Jobs() {
  const { jobs, fetchJobs, scrapeJobs, selectJob, isLoading, isScanning } = useJobStore();
  const { trackApplication, isTracked } = useApplicationStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [activeDropdownJobId, setActiveDropdownJobId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState('');

  useEffect(() => {
    fetchJobs();

    const handleGlobalClick = () => setActiveDropdownJobId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [fetchJobs]);

  const handleScanPlatforms = async () => {
    setScanMessage('');
    const result = await scrapeJobs();
    if (result) {
      setScanMessage(
        `Scraped ${result.scraped_count} jobs · ${result.db_inserted_count} saved to DB · ${result.rag_indexed_count} indexed in RAG`
      );
      await fetchJobs();
    } else {
      setScanMessage('Scan failed. Please try again.');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.required_skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  const handleApply = (job: (typeof jobs)[number]) => {
    const added = trackApplication(job);
    setApplyMessage(
      added
        ? `Added "${job.title}" to Application Tracker.`
        : `"${job.title}" is already in your Application Tracker.`,
    );

    if (job.apply_url) {
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    }
  };

  const sourceColor = (src: string) => {
    const colors: Record<string, string> = {
      linkedin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      internshala: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      unstop: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      mock: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[src] || 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Find Internships</h1>
          <p className="text-slate-400 mt-1">
            Scrape live listings and match them to your resume
          </p>
        </div>

        <button
          onClick={handleScanPlatforms}
          disabled={isScanning}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 disabled:opacity-60 transition-all"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Scan Platforms
            </>
          )}
        </button>
      </div>

      {/* Scan status banner */}
      {scanMessage && (
        <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl text-primary-300 text-sm flex items-center gap-3">
          <RefreshCw className={`w-4 h-4 flex-shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
          {scanMessage}
        </div>
      )}

      {applyMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
          {applyMessage}
        </div>
      )}

      {/* Search bar */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex gap-3"
      >
        <input
          type="text"
          placeholder="Search by role, company, or skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field flex-1"
        />
      </form>

      {/* Job grid */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-slate-800/50 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="glass-card p-5 flex flex-col justify-between hover:border-primary-500/50 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors leading-tight">
                    {job.title}
                  </h3>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${sourceColor(job.source)}`}>
                    {job.source}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center text-sm text-slate-300">
                    <Building className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
                    {job.company}
                  </div>
                  <div className="flex items-center text-sm text-slate-300">
                    <MapPin className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
                    {job.location || 'Remote / Not Specified'}
                  </div>
                  {job.salary && (
                    <div className="flex items-center text-sm text-slate-300">
                      <DollarSign className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
                      {job.salary}
                      {job.duration && <span className="ml-2 text-slate-500">• {job.duration}</span>}
                    </div>
                  )}
                  {job.type && (
                    <div className="flex items-center text-sm text-slate-400">
                      <Clock className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
                      {job.type}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {job.required_skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.required_skills.length > 4 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800/50 text-slate-500">
                      +{job.required_skills.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between relative">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownJobId(activeDropdownJobId === job.id ? null : job.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-primary-500/20 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                    <span>AI Actions</span>
                    <ChevronDown className="w-3 h-3 text-slate-200" />
                  </button>

                  {activeDropdownJobId === job.id && (
                    <div className="absolute left-0 bottom-full mb-2 w-52 rounded-xl bg-slate-900 border border-slate-800 p-1.5 shadow-2xl z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectJob(job);
                          navigate('/resumes');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-medium transition-colors"
                      >
                        Tailored Resume
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectJob(job);
                          navigate('/cover-letter');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-medium transition-colors"
                      >
                        Tailored Cover Letter
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectJob(job);
                          navigate('/skills');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-medium transition-colors"
                      >
                        Skill Gap Analysis
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectJob(job);
                          navigate('/interview-prep');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-medium transition-colors"
                      >
                        Interview Prep
                      </button>
                    </div>
                  )}
                </div>

                {job.apply_url ? (
                  <button
                    type="button"
                    onClick={() => handleApply(job)}
                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      isTracked(job.id)
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {isTracked(job.id) ? 'Tracked' : 'Apply'}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <p className="text-slate-400 text-lg">No internships found.</p>
              <p className="text-slate-500 text-sm mt-2">
                Click <strong className="text-primary-400">Scan Platforms</strong> to fetch listings.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
