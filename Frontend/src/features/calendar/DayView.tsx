import React, { useMemo } from 'react';
import { CalendarEvent } from '../../api/events';
import { Badge } from '../../components/ui/Badge';
import { MapPin, Users } from 'lucide-react';

interface DayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onTimeSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const EVENT_COLORS: Record<CalendarEvent['type'], { bg: string; border: string; text: string; badge: string }> = {
  meeting: { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-800', badge: 'primary' },
  call: { bg: 'bg-green-50', border: 'border-l-green-500', text: 'text-green-800', badge: 'success' },
  follow_up: { bg: 'bg-yellow-50', border: 'border-l-yellow-500', text: 'text-yellow-800', badge: 'warning' },
  task: { bg: 'bg-purple-50', border: 'border-l-purple-500', text: 'text-purple-800', badge: 'primary' },
  other: { bg: 'bg-gray-50', border: 'border-l-gray-400', text: 'text-gray-700', badge: 'gray' },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

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
  const top = (startHour - 7) * 80;
  const height = Math.max((endHour - startHour) * 80, 32);
  return { top: Math.max(0, top), height };
}

const TYPE_LABELS: Record<CalendarEvent['type'], string> = {
  meeting: 'Meeting',
  call: 'Call',
  follow_up: 'Follow-up',
  task: 'Task',
  other: 'Other',
};

export function DayView({ events, currentDate, onTimeSlotClick, onEventClick }: DayViewProps) {
  const dayEvents = useMemo(() => getEventsForDay(events, currentDate), [events, currentDate]);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="grid grid-cols-[70px_1fr]">
        <div className="border-r border-gray-200">
          {HOURS.map((hour) => (
            <div key={hour} className="h-20 border-b border-gray-100 px-2 flex items-start justify-end pt-1">
              <span className="text-xs font-medium text-gray-400">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
          ))}
        </div>
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-20 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors"
              onClick={() => onTimeSlotClick(currentDate, hour)}
            />
          ))}
          {dayEvents.map((event) => {
            const colors = EVENT_COLORS[event.type];
            const pos = getEventPosition(event);
            const start = new Date(event.startTime);
            const end = new Date(event.endTime);
            const timeStr = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

            return (
              <button
                key={event._id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                className={`absolute left-2 right-4 ${colors.bg} ${colors.border} border-l-4 rounded-lg px-4 py-2 overflow-hidden cursor-pointer hover:shadow-md transition-all z-10 shadow-sm`}
                style={{ top: `${pos.top}px`, height: `${pos.height}px` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${colors.text} truncate`}>{event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{timeStr}</p>
                    {pos.height > 60 && event.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {pos.height > 80 && event.participants?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Users className="w-3 h-3 shrink-0" />
                        <span>{event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={colors.badge as any} size="sm" className="shrink-0">
                    {TYPE_LABELS[event.type]}
                  </Badge>
                </div>
              </button>
            );
          })}
          {isToday && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
              style={{ top: `${(today.getHours() - 7) * 80 + (today.getMinutes() / 60) * 80}px` }}
            >
              <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
