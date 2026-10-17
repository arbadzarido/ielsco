import { Play, CheckCircle2, Lock, Clock, FileText, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TestCardProps {
  title: string;
  description: string;
  duration: string;
  sections: number;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
  testType: 'pre-test' | 'post-test';
  isLocked?: boolean;
  lockReason?: string;
  href?: string; // This will now handle both the test link and the result link
}

export default function TestCard({
  title,
  description,
  duration,
  sections,
  status,
  score,
  testType,
  isLocked = false,
  lockReason,
  href
}: TestCardProps) {
  
  const getStatusBadge = () => {
    if (isLocked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-full">
          <Lock size={12} /> Locked
        </span>
      );
    }
    
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">
            <CheckCircle2 size={12} /> Finished
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">
            <Clock size={12} /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-full">
            <Play size={12} /> Ready to Start
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7.5) return 'text-green-600';
    if (score >= 6.5) return 'text-[#304156]';
    return 'text-[#E56668]';
  };

  return (
    <div className={cn(
      "bg-white rounded-[32px] p-8 border shadow-sm h-full relative overflow-hidden transition-all duration-300",
      isLocked 
        ? "border-gray-200 opacity-75 grayscale" 
        : status === 'completed'
        ? "border-green-200 hover:shadow-xl hover:border-green-400"
        : "border-[#E3E7ED]/40 hover:shadow-xl hover:border-[#E56668]/30"
    )}>
      
      {/* Lock Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-[#304156]/5 backdrop-blur-[2px] z-10 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 text-center max-w-xs animate-in fade-in zoom-in">
            <Lock className="mx-auto text-[#E56668] mb-4" size={40} />
            <p className="font-black text-[#E56668] uppercase tracking-tighter mb-2">Module Locked</p>
            <p className="text-xs text-[#577E90] font-medium leading-relaxed">{lockReason}</p>
          </div>
        </div>
      )}

      {/* Content Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="text-[10px] font-black text-[#577E90] uppercase tracking-[0.2em] mb-2">Assessment Module</p>
          <h3 className="text-2xl font-black text-[#304156] leading-tight mb-3">
            {title}
          </h3>
          {getStatusBadge()}
        </div>
        
        {status === 'completed' && score !== undefined && (
          <div className="text-right">
            <p className="text-[10px] font-black text-[#577E90] uppercase tracking-widest mb-1">Band Score</p>
            <p className={cn("text-4xl font-black italic tracking-tighter", getScoreColor(score))}>
              {score.toFixed(1)}
            </p>
          </div>
        )}
      </div>

      <p className="text-[#577E90] text-sm mb-8 leading-relaxed font-medium">
        {description}
      </p>

      {/* Icons Info */}
      <div className="flex gap-6 mb-10 pb-6 border-b border-gray-50">
        <div className="flex items-center gap-2 text-xs font-bold text-[#304156]">
          <Clock size={16} className="text-[#E56668]" />
          <span>{duration}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#304156]">
          <FileText size={16} className="text-[#E56668]" />
          <span>{sections} Sections</span>
        </div>
      </div>

      {/* THE UPDATED CTA SECTION */}
      {!isLocked && (
        <div>
          {href ? (
            <Link
              href={href}
              className={cn(
                "block w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg text-center flex items-center justify-center gap-3",
                status === 'completed'
                  ? "bg-[#304156] text-white hover:bg-[#253344] shadow-blue-900/10"
                  : "bg-[#E56668] text-white hover:bg-[#E56668]/90 shadow-red-900/10 hover:scale-[1.02]"
              )}
            >
              {status === 'completed' ? (
                <>
                  <BarChart3 size={18} />
                  View Analysis Report
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  {status === 'in_progress' ? 'Continue Journey' : 'Begin Assessment'}
                </>
              )}
            </Link>
          ) : (
            <div className="w-full py-4 bg-gray-100 text-[#E56668] rounded-2xl font-black text-xs uppercase tracking-widest text-center italic">
              Module Unavailable
            </div>
          )}
        </div>
      )}

      {/* Decorative Bottom Tag */}
      {status === 'completed' && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <TrendingUp size={14} className="text-green-500" />
          <span className="text-[10px] font-black text-[#577E90] uppercase tracking-widest">
            Detailed performance breakdown available
          </span>
        </div>
      )}
    </div>
  );
}