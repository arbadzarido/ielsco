import { TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestResultCardProps {
  title: string;
  attempt: {
    id: string;
    listening_score?: number;
    reading_score?: number;
    writing_score?: number;
    speaking_score?: number;
    overall_score?: number;
    mentor_feedback?: string;
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
    completed_at?: string;
  };
}

export default function TestResultCard({ title, attempt }: TestResultCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8.0) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
    if (score >= 7.0) return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
    if (score >= 6.0) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
  };

  const overallColor = attempt.overall_score ? getScoreColor(attempt.overall_score) : getScoreColor(5.0);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-[#2F4157] mb-1">{title}</h3>
          {attempt.completed_at && (
            <p className="text-xs text-gray-500">
              Completed: {new Date(attempt.completed_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </div>
        
        <div className={cn(
          "w-20 h-20 rounded-full flex flex-col items-center justify-center border-4",
          overallColor.bg,
          overallColor.border
        )}>
          <p className={cn("text-2xl font-bold", overallColor.text)}>
            {attempt.overall_score?.toFixed(1) || 'N/A'}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold">BAND</p>
        </div>
      </div>

      {/* Section Scores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Listening', score: attempt.listening_score },
          { label: 'Reading', score: attempt.reading_score },
          { label: 'Writing', score: attempt.writing_score },
          { label: 'Speaking', score: attempt.speaking_score },
        ].map(({ label, score }) => {
          const color = score ? getScoreColor(score) : getScoreColor(0);
          return (
            <div key={label} className={cn("p-3 rounded-xl border", color.bg, color.border)}>
              <p className="text-xs text-gray-600 mb-1">{label}</p>
              <p className={cn("text-2xl font-bold", color.text)}>
                {score?.toFixed(1) || '-'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Strengths & Weaknesses */}
      {(attempt.strengths?.length || attempt.weaknesses?.length) && (
        <div className="space-y-4 mb-6">
          {attempt.strengths && attempt.strengths.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" />
                Strengths
              </p>
              <ul className="space-y-1">
                {attempt.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-gray-600 pl-6">
                    • {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {attempt.weaknesses && attempt.weaknesses.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <TrendingUp size={14} className="text-orange-600" />
                Areas for Improvement
              </p>
              <ul className="space-y-1">
                {attempt.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="text-sm text-gray-600 pl-6">
                    • {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Mentor Feedback */}
      {attempt.mentor_feedback && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-sm font-bold text-blue-900 mb-2">Mentor Feedback</p>
          <p className="text-sm text-blue-800 leading-relaxed">
            {attempt.mentor_feedback}
          </p>
        </div>
      )}

      {/* Recommendations */}
      {attempt.recommendations && attempt.recommendations.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <p className="text-sm font-bold text-purple-900 mb-2">Recommended Next Steps</p>
          <ul className="space-y-1">
            {attempt.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-purple-800">
                {idx + 1}. {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}