'use client';

import Card from '@/components/ui/Card';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_SLOTS = [
  '8:00-9:20am',
  '9:30am-10:50am',
  '11:00am-12:20pm',
  '12:30-1:50pm',
  '2:00-3:20pm',
  '3:30-4:50pm',
];

const DAY_PAIRS: Record<string, string[]> = {
  'Sunday-Tuesday': ['Sunday', 'Tuesday'],
  'Monday-Wednesday': ['Monday', 'Wednesday'],
  'Thursday-Saturday': ['Thursday', 'Saturday'],
};

interface ScheduleEntry {
  course_code: string;
  title: string;
  days: string;
  time_slot: string;
}

const COLORS = [
  'from-purple-500/30 to-purple-600/20 border-purple-500/40',
  'from-blue-500/30 to-blue-600/20 border-blue-500/40',
  'from-emerald-500/30 to-emerald-600/20 border-emerald-500/40',
  'from-amber-500/30 to-amber-600/20 border-amber-500/40',
  'from-rose-500/30 to-rose-600/20 border-rose-500/40',
  'from-cyan-500/30 to-cyan-600/20 border-cyan-500/40',
  'from-pink-500/30 to-pink-600/20 border-pink-500/40',
];

interface WeeklyScheduleProps {
  entries: ScheduleEntry[];
}

const WeeklySchedule = ({ entries }: WeeklyScheduleProps) => {
  const colorMap = new Map<string, string>();
  let colorIdx = 0;

  const getColor = (code: string) => {
    if (!colorMap.has(code)) {
      colorMap.set(code, COLORS[colorIdx % COLORS.length]);
      colorIdx++;
    }
    return colorMap.get(code)!;
  };

  const getCellCourses = (day: string, timeSlot: string) => {
    return entries.filter((e) => {
      const mappedDays = DAY_PAIRS[e.days] || [];
      return mappedDays.includes(day) && e.time_slot === timeSlot;
    });
  };

  return (
    <Card>
      <div className="p-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-purple-200/70 uppercase tracking-wider px-4 py-3 w-[140px]">
                  Time / Day
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="text-center text-xs font-semibold text-purple-200/70 uppercase tracking-wider px-2 py-3"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((timeSlot) => (
                <tr key={timeSlot} className="border-t border-white/5">
                  <td className="px-4 py-3 text-xs font-medium text-purple-200/60 whitespace-nowrap align-top">
                    {timeSlot}
                  </td>
                  {DAYS.map((day) => {
                    const cellCourses = getCellCourses(day, timeSlot);
                    return (
                      <td key={day} className="px-1 py-1 align-top">
                        {cellCourses.map((course) => (
                          <div
                            key={course.course_code}
                            className={`bg-gradient-to-br ${getColor(course.course_code)} border rounded-lg px-2 py-1.5 mb-1`}
                          >
                            <p className="text-[11px] font-bold text-white leading-tight">
                              {course.course_code}
                            </p>
                            <p className="text-[10px] text-purple-200/70 leading-tight truncate">
                              {course.title}
                            </p>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default WeeklySchedule;
