import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Mail,
  Layers,
  ListChecks,
  MessageSquare,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { APP_NAME_SHORT } from '../../lib/constants';

const navigation = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Jobs', to: '/jobs', icon: Briefcase },
  { name: 'Applications', to: '/applications', icon: ClipboardList },
  { name: 'Resumes', to: '/resumes', icon: FileText },
  { name: 'Cover Letters', to: '/cover-letter', icon: Mail },
  { name: 'Skill Gaps', to: '/skills', icon: Layers },
  { name: 'Interview Prep', to: '/interview-prep', icon: ListChecks },
  { name: 'Career Chat', to: '/chat', icon: MessageSquare },
];

export default function Sidebar() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="w-64 bg-dark-card border-r border-dark-border flex flex-col">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <span className="text-sm font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-indigo-400">
          {APP_NAME_SHORT}
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 text-slate-300 font-medium">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ` +
              (isActive
                ? 'bg-primary-600/10 text-primary-500'
                : 'hover:bg-slate-800/50 hover:text-slate-100')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-md"></div>
                )}
                <item.icon
                  className={`w-5 h-5 ${isActive ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-300'}`}
                />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={() => logout()}
          className="flex w-full items-center space-x-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
