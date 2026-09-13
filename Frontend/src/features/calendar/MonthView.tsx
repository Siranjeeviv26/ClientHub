import React from 'react';
import { CalendarEvent } from '../../api/events';
import { Badge } from '../../components/ui/Badge';

interface MonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  meeting: 'bg-blue-100 text-blue-800 border-blue-200',
  call: 'bg-green-100 text-green-800 border-green-200',
  follow_up: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  task: 'bg-purple-100 text-purple-800 border-purple-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: Date[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((event) => {
    const eventDate = new Date(event.startTime);
    return isSameDay(eventDate, date);
  });
}

export function MonthView({ events, currentDate, onDayClick, onEventClick }: MonthViewProps) {
  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayHeaders.map((day) => (
          <div key={day} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayEvents = getEventsForDay(events, day);

          return (
            <div
              key={idx}
              className={`min-h-[110px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors hover:bg-gray-50/80 ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''
              }`}
              onClick={() => onDayClick(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                    isToday
                      ? 'bg-primary-600 text-white'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate border ${EVENT_COLORS[event.type]} hover:opacity-80 transition-opacity`}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick(day);
                    }}
                    className="w-full text-left px-1.5 py-0.5 rounded text-[11px] text-gray-500 hover:text-gray-700 font-medium"
                  >
                    +{dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
