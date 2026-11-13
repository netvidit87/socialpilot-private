import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';

export default function CalendarPage() {
  const { currentBrandId } = useAppStore();
  const [current, setCurrent] = useState(new Date());
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    api
      .getPosts({ brandId: currentBrandId || undefined })
      .then(setPosts)
      .catch(() => {});
  }, [currentBrandId]);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const postsOnDay = (day: Date) =>
    posts.filter((p) => {
      const d = p.scheduled_at || p.published_at || p.created_at;
      return d && isSameDay(new Date(d), day);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">Scheduled and published posts</p>
        </div>
        <Link to="/planner" className="btn-primary">
          <Plus size={16} />
          Create Post
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-3">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="btn-ghost !p-2"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-semibold">{format(current, 'MMMM yyyy')}</h2>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="btn-ghost !p-2"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-surface-border text-center text-xs font-medium text-gray-500">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayPosts = postsOnDay(day);
            const inMonth = isSameMonth(day, current);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[90px] border-b border-r border-surface-border p-1.5 ${
                  !inMonth ? 'bg-gray-50/50' : ''
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isSameDay(day, new Date())
                      ? 'bg-primary text-white'
                      : inMonth
                        ? 'text-gray-700'
                        : 'text-gray-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayPosts.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                        p.status === 'scheduled'
                          ? 'bg-blue-50 text-blue-700'
                          : p.status === 'published'
                            ? 'bg-green-50 text-green-700'
                            : p.status === 'failed'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                      title={p.title || p.status}
                    >
                      {p.platforms || p.status}
                    </div>
                  ))}
                  {dayPosts.length > 3 && (
                    <div className="text-[10px] text-gray-400">+{dayPosts.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
