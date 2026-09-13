import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { eventsApi, CalendarEvent } from '../../api/events';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventModal } from './EventModal';
import toast from 'react-hot-toast';

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateRange(view: CalendarView, date: Date): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (view === 'month') {
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (view === 'week') {
    const s = startOfWeek(date);
    const e = endOfWeek(date);
    if (s.getMonth() === e.getMonth()) {
      return `${shortMonthNames[s.getMonth()]} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${shortMonthNames[s.getMonth()]} ${s.getDate()} - ${shortMonthNames[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  }
  if (view === 'day') {
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
];

const EVENT_TYPE_LABELS: Record<CalendarEvent['type'], string> = {
  meeting: 'Meeting',
  call: 'Call',
  follow_up: 'Follow-up',
  task: 'Task',
  other: 'Other',
};

const EVENT_TYPE_BADGE: Record<CalendarEvent['type'], string> = {
  meeting: 'primary',
  call: 'success',
  follow_up: 'warning',
  task: 'primary',
  other: 'gray',
};

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [initialHour, setInitialHour] = useState<number>(9);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let start: Date;
      let end: Date;

      if (view === 'month') {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      } else if (view === 'week') {
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
      } else {
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
      }

      const response = await eventsApi.getCalendar(start.toISOString(), end.toISOString());
      if (response.success) {
        const data = response.data;
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate, view]);

  const navigate = (direction: 'prev' | 'next') => {
    const d = new Date(currentDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(d);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setView('day');
    setCurrentDate(date);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setInitialDate(date);
    setInitialHour(hour);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setInitialDate(null);
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleSave = async (data: Partial<CalendarEvent>) => {
    try {
      if (selectedEvent) {
        const response = await eventsApi.update(selectedEvent._id, data);
        if (response.success) {
          toast.success('Event updated successfully');
          setShowEventModal(false);
          setSelectedEvent(null);
          fetchEvents();
        }
      } else {
        const response = await eventsApi.create(data);
        if (response.success) {
          toast.success('Event created successfully');
          setShowEventModal(false);
          setSelectedEvent(null);
          fetchEvents();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await eventsApi.delete(id);
      toast.success('Event deleted');
      setShowEventModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const agendaEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events]);

  const agendaGrouped = useMemo(() => {
    const groups: { date: string; events: CalendarEvent[] }[] = [];
    const map = new Map<string, CalendarEvent[]>();
    for (const event of agendaEvents) {
      const key = new Date(event.startTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    map.forEach((evts, date) => groups.push({ date, events: evts }));
    return groups;
  }, [agendaEvents]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your events and schedule</p>
        </div>
        <Button onClick={() => { setSelectedEvent(null); setInitialDate(null); setShowEventModal(true); }} leftIcon={<Plus className="w-4 h-4" />}>
          New Event
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setView(opt.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    view === opt.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
              {formatDateRange(view, currentDate)}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 px-3 text-xs">
                Today
              </Button>
              <button
                onClick={() => navigate('prev')}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('next')}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {view === 'month' && (
            <MonthView
              events={events}
              currentDate={currentDate}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'week' && (
            <WeekView
              events={events}
              currentDate={currentDate}
              onTimeSlotClick={handleTimeSlotClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'day' && (
            <DayView
              events={events}
              currentDate={currentDate}
              onTimeSlotClick={handleTimeSlotClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'agenda' && (
            <div className="space-y-4">
              {agendaGrouped.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No upcoming events</p>
                  <p className="text-sm text-gray-400 mt-1">Create an event to get started</p>
                </div>
              ) : (
                agendaGrouped.map((group) => (
                  <div key={group.date} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                      <h3 className="text-sm font-semibold text-gray-700">{group.date}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.events.map((event) => {
                        const start = new Date(event.startTime);
                        const end = new Date(event.endTime);
                        return (
                          <button
                            key={event._id}
                            onClick={() => handleEventClick(event)}
                            className="w-full px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-[140px] shrink-0 text-sm text-gray-500">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} -{' '}
                                {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">{event.title}</p>
                              {event.location && (
                                <p className="text-xs text-gray-400 truncate mt-0.5">{event.location}</p>
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                event.type === 'meeting'
                                  ? 'bg-blue-100 text-blue-800'
                                  : event.type === 'call'
                                  ? 'bg-green-100 text-green-800'
                                  : event.type === 'follow_up'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : event.type === 'task'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {EVENT_TYPE_LABELS[event.type]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      <EventModal
        isOpen={showEventModal}
        event={selectedEvent}
        initialDate={initialDate}
        initialHour={initialHour}
        onSave={handleSave}
        onDelete={selectedEvent ? handleDelete : undefined}
        onClose={() => { setShowEventModal(false); setSelectedEvent(null); setInitialDate(null); }}
      />
    </div>
  );
}
