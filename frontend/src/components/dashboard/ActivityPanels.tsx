'use client';

import Link from 'next/link';
import { ActivityItem, DeadlineItem } from '@/types/analytics';

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecentActivityList({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return <p className="text-purple-200/40 text-sm">No recent activity to display.</p>;
  }

  return (
    <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
      {items.map((item) => {
        const content = (
          <div className="flex gap-3">
            <div className="mt-1.5 w-2 h-2 rounded-full bg-purple-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-purple-100/90">
                <span className="font-medium text-white">{item.actor_name}</span>{' '}
                {item.message}
              </p>
              <p className="text-xs text-purple-200/40 mt-0.5">{formatRelativeTime(item.created_at)}</p>
            </div>
          </div>
        );

        return (
          <li key={item.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
            {item.link ? (
              <Link href={item.link} className="block hover:opacity-90 transition-opacity">
                {content}
              </Link>
            ) : content}
          </li>
        );
      })}
    </ul>
  );
}

export function UpcomingDeadlinesList({ items }: { items: DeadlineItem[] }) {
  if (!items.length) {
    return <p className="text-purple-200/40 text-sm">No upcoming deadlines.</p>;
  }

  return (
    <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
      {items.map((item) => {
        const content = (
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.title}</p>
                <p className="text-xs text-purple-200/50">
                  {item.type_label} · {item.course_code} — {item.course_title}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-amber-300/80 shrink-0">
                {item.deadline_label}
              </span>
            </div>
            <p className="text-xs text-purple-200/60">{formatDeadline(item.deadline_at)}</p>
          </div>
        );

        return (
          <li key={item.assessment_id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
            {item.link ? (
              <Link href={item.link} className="block hover:bg-white/5 rounded-lg -mx-1 px-1 py-1 transition-colors">
                {content}
              </Link>
            ) : content}
          </li>
        );
      })}
    </ul>
  );
}
