import React, { useMemo } from 'react';
import { CalendarEvent } from '../../api/events';

interface WeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onTimeSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const EVENT_COLORS: Record<CalendarEvent['type'], { bg: string; border: string; text: string }> = {
  meeting: { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-800' },
  call: { bg: 'bg-green-50', border: 'border-l-green-500', text: 'text-green-800' },
  follow_up: { bg: 'bg-yellow-50', border: 'border-l-yellow-500', text: 'text-yellow-800' },
  task: { bg: 'bg-purple-50', border: 'border-l-purple-500', text: 'text-purple-800' },
  other: { bg: 'bg-gray-50', border: 'border-l-gray-400', text: 'text-gray-700' },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
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

function getEventPosition(event: CalendarEvent): { top: number; height: number } {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const top = (startHour - 7) * 64;
  const height = Math.max((endHour - startHour) * 64, 24);
  return { top: Math.max(0, top), height };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function WeekView({ events, currentDate, onTimeSlotClick, onEventClick }: WeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const today = new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
        <div className="border-r border-gray-200" />
        {weekDays.map((day, idx) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={idx} className={`px-2 py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-primary-50' : ''}`}>
              <div className="text-xs font-medium text-gray-500 uppercase">{DAY_NAMES[idx]}</div>
              <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                {day.getDate()}
              </div>
              <div className="text-xs text-gray-400">{MONTH_NAMES[day.getMonth()]}</div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
        <div className="border-r border-gray-200">
          {HOURS.map((hour) => (
            <div key={hour} className="h-16 border-b border-gray-100 px-2 flex items-start justify-end pt-0">
              <span className="text-[11px] font-medium text-gray-400 -mt-2">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
          ))}
        </div>
        {weekDays.map((day, dayIdx) => {
          const dayEvents = getEventsForDay(events, day);
          const isToday = isSameDay(day, today);

          return (
            <div key={dayIdx} className={`relative border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-primary-50/20' : ''}`}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => onTimeSlotClick(day, hour)}
                />
              ))}
              {dayEvents.map((event) => {
                const colors = EVENT_COLORS[event.type];
                const pos = getEventPosition(event);
                return (
                  <button
                    key={event._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`absolute left-0.5 right-0.5 ${colors.bg} ${colors.border} border-l-2 rounded-r px-1.5 py-0.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity z-10 shadow-sm`}
                    style={{ top: `${pos.top}px`, height: `${pos.height}px` }}
                  >
                    <p className={`text-[11px] font-semibold truncate ${colors.text}`}>{event.title}</p>
                    {pos.height > 30 && (
                      <p className="text-[10px] text-gray-500 truncate">
                        {new Date(event.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                  </button>
                );
              })}
              {isToday && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                  style={{ top: `${(today.getHours() - 7) * 64 + (today.getMinutes() / 60) * 64}px` }}
                >
                  <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
