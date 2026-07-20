'use client';

import Link from 'next/link';
import { RecommendationItem, RiskLevel, RiskPrediction } from '@/types/intelligence';

const RISK_COLORS: Record<RiskLevel, string> = {
  high: 'text-red-400 bg-red-500/10 border-red-500/30',
  medium: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-emerald-400',
};

export function RiskBadge({ level }: { level: RiskLevel | string }) {
  const key = (level || 'low') as RiskLevel;
  const cls = RISK_COLORS[key] || RISK_COLORS.low;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wide border ${cls}`}>
      {level}
    </span>
  );
}

export function RiskPredictionsList({ items }: { items: RiskPrediction[] }) {
  if (!items.length) {
    return <p className="text-purple-200/40 text-sm">No risk predictions yet. Refresh to analyze your courses.</p>;
  }

  return (
    <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
      {items.map((item) => {
        const factors = item.explanation?.top_factors?.slice(0, 2) || [];
        const content = (
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {item.course_code || 'Course'}{item.course_title ? ` — ${item.course_title}` : ''}
                </p>
                <p className="text-xs text-purple-200/50">
                  Risk score {(item.risk_score * 100).toFixed(0)}% · {item.model_version}
                </p>
              </div>
              <RiskBadge level={item.risk_level} />
            </div>
            {factors.length > 0 && (
              <p className="text-xs text-purple-200/60 line-clamp-2">
                {factors.map((f) => f.detail).join(' · ')}
              </p>
            )}
          </div>
        );
        return (
          <li key={item.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
            {item.offering_id ? (
              <Link href={`/student/my-courses/${item.offering_id}`} className="block hover:opacity-90">
                {content}
              </Link>
            ) : content}
          </li>
        );
      })}
    </ul>
  );
}

export function RecommendationsList({ items }: { items: RecommendationItem[] }) {
  if (!items.length) {
    return <p className="text-purple-200/40 text-sm">No recommendations right now.</p>;
  }

  return (
    <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
      {items.map((item, idx) => (
        <li key={item.id || `${item.type}-${idx}`} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
          <div className="flex gap-3">
            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[item.priority] || 'bg-purple-400'}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase text-purple-300/70">{item.type}</span>
                {item.course_code && (
                  <span className="text-[10px] font-mono text-purple-200/40">{item.course_code}</span>
                )}
              </div>
              <p className="text-sm text-purple-100/90">{item.message}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
