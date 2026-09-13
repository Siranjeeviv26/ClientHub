import React, { useState, useEffect } from 'react';
import { X, Trash2, Bell, Plus } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { CalendarEvent } from '../../api/events';
import { clientsApi } from '../../api/clients';
import { leadsApi } from '../../api/leads';
import { dealsApi } from '../../api/deals';

interface EventModalProps {
  isOpen: boolean;
  event?: CalendarEvent | null;
  initialDate?: Date | null;
  initialHour?: number;
  onSave: (data: Partial<CalendarEvent>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const EVENT_TYPES: { value: CalendarEvent['type']; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'task', label: 'Task' },
  { value: 'other', label: 'Other' },
];

const REMINDER_TYPES = [
  { value: 'notification', label: 'Notification' },
  { value: 'email', label: 'Email' },
];

const REMINDER_PRESETS = [
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

function toLocalISOString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalTimeISOString(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export function EventModal({ isOpen, event, initialDate, initialHour = 9, onSave, onDelete, onClose }: EventModalProps) {
  const isEditing = !!event;

  const getDefaultStart = (): Date => {
    if (event) return new Date(event.startTime);
    const d = initialDate ? new Date(initialDate) : new Date();
    d.setHours(initialHour, 0, 0, 0);
    return d;
  };

  const getDefaultEnd = (): Date => {
    if (event) return new Date(event.endTime);
    const d = getDefaultStart();
    d.setHours(d.getHours() + 1);
    return d;
  };

  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [type, setType] = useState<CalendarEvent['type']>(event?.type || 'meeting');
  const [startDate, setStartDate] = useState(toLocalISOString(getDefaultStart()));
  const [startTime, setStartTime] = useState(toLocalTimeISOString(getDefaultStart()));
  const [endDate, setEndDate] = useState(toLocalISOString(getDefaultEnd()));
  const [endTime, setEndTime] = useState(toLocalTimeISOString(getDefaultEnd()));
  const [allDay, setAllDay] = useState(event?.allDay || false);
  const [location, setLocation] = useState(event?.location || '');
  const [clientId, setClientId] = useState(event?.clientId || '');
  const [leadId, setLeadId] = useState(event?.leadId || '');
  const [dealId, setDealId] = useState(event?.dealId || '');
  const [participants, setParticipants] = useState<string[]>(event?.participants || []);
  const [participantInput, setParticipantInput] = useState('');
  const [reminders, setReminders] = useState<{ type: string; minutesBefore: number }[]>(
    event?.reminders || [{ type: 'notification', minutesBefore: 15 }]
  );
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dropdownClients, setDropdownClients] = useState<{ _id: string; companyName: string }[]>([]);
  const [dropdownLeads, setDropdownLeads] = useState<{ _id: string; firstName: string; lastName: string; company?: string }[]>([]);
  const [dropdownDeals, setDropdownDeals] = useState<{ _id: string; title: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, leadsRes, dealsRes] = await Promise.all([
          clientsApi.getAll({ limit: 100 }),
          leadsApi.getAll({ limit: 100 }),
          dealsApi.getAll({ limit: 100 }),
        ]);
        if ((clientsRes as any)?.success && (clientsRes as any)?.data?.items) {
          setDropdownClients((clientsRes as any).data.items.map((c: any) => ({ _id: c._id, companyName: c.companyName })));
        }
        if ((leadsRes as any)?.success && (leadsRes as any)?.data?.items) {
          setDropdownLeads((leadsRes as any).data.items.map((l: any) => ({ _id: l._id, firstName: l.firstName, lastName: l.lastName, company: l.company })));
        }
        if ((dealsRes as any)?.success && (dealsRes as any)?.data?.items) {
          setDropdownDeals((dealsRes as any).data.items.map((d: any) => ({ _id: d._id, title: d.title })));
        }
      } catch { /* non-critical */ }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setType(event.type);
      const s = new Date(event.startTime);
      const e = new Date(event.endTime);
      setStartDate(toLocalISOString(s));
      setStartTime(toLocalTimeISOString(s));
      setEndDate(toLocalISOString(e));
      setEndTime(toLocalTimeISOString(e));
      setAllDay(event.allDay);
      setLocation(event.location || '');
      setClientId(event.clientId || '');
      setLeadId(event.leadId || '');
      setDealId(event.dealId || '');
      setParticipants(event.participants || []);
      setReminders(event.reminders?.length ? event.reminders : [{ type: 'notification', minutesBefore: 15 }]);
    } else {
      setTitle('');
      setDescription('');
      setType('meeting');
      const d = initialDate ? new Date(initialDate) : new Date();
      d.setHours(initialHour, 0, 0, 0);
      setStartDate(toLocalISOString(d));
      setStartTime(toLocalTimeISOString(d));
      const endD = new Date(d);
      endD.setHours(endD.getHours() + 1);
      setEndDate(toLocalISOString(endD));
      setEndTime(toLocalTimeISOString(endD));
      setAllDay(false);
      setLocation('');
      setClientId('');
      setLeadId('');
      setDealId('');
      setParticipants([]);
      setReminders([{ type: 'notification', minutesBefore: 15 }]);
    }
  }, [event, initialDate, initialHour]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const startDateTime = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
    const endDateTime = allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`;

    const data: Partial<CalendarEvent> = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      startTime: startDateTime,
      endTime: endDateTime,
      allDay,
      location: location.trim() || undefined,
      clientId: clientId || undefined,
      leadId: leadId || undefined,
      dealId: dealId || undefined,
      participants,
      reminders,
    };

    await onSave(data);
    setSaving(false);
  };

  const addParticipant = () => {
    const val = participantInput.trim();
    if (val && !participants.includes(val)) {
      setParticipants([...participants, val]);
      setParticipantInput('');
    }
  };

  const removeParticipant = (p: string) => {
    setParticipants(participants.filter((x) => x !== p));
  };

  const addReminder = () => {
    setReminders([...reminders, { type: 'notification', minutesBefore: 15 }]);
  };

  const updateReminder = (index: number, field: 'type' | 'minutesBefore', value: string | number) => {
    const updated = [...reminders];
    if (field === 'type') updated[index].type = value as string;
    else updated[index].minutesBefore = value as number;
    setReminders(updated);
  };

  const removeReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'New Event'}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {isEditing && onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!title.trim()} size="sm">
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Input
          label="Title"
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            options={EVENT_TYPES}
            value={type}
            onChange={(e) => setType(e.target.value as CalendarEvent['type'])}
          />
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">All day</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {!allDay && (
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          {!allDay && (
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          )}
        </div>

        <Input
          label="Location"
          placeholder="Meeting room, Zoom link, etc."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Client"
            options={[{ value: '', label: 'Select client' }, ...dropdownClients.map(c => ({ value: c._id, label: c.companyName }))]}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <Select
            label="Lead"
            options={[{ value: '', label: 'Select lead' }, ...dropdownLeads.map(l => ({ value: l._id, label: `${l.firstName} ${l.lastName}${l.company ? ` (${l.company})` : ''}` }))]}
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          />
          <Select
            label="Deal"
            options={[{ value: '', label: 'Select deal' }, ...dropdownDeals.map(d => ({ value: d._id, label: d.title }))]}
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Participants</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {participants.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700"
              >
                {p}
                <button onClick={() => removeParticipant(p)} className="hover:bg-primary-100 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add participant"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addParticipant();
                }
              }}
              className="flex-1 h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            <Button variant="outline" size="sm" onClick={addParticipant} className="h-9">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Reminders</label>
            <button
              type="button"
              onClick={addReminder}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {reminders.map((reminder, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <Select
                  options={REMINDER_PRESETS}
                  value={reminder.minutesBefore}
                  onChange={(e) => updateReminder(idx, 'minutesBefore', parseInt(e.target.value))}
                  className="h-9 text-xs flex-1"
                />
                <Select
                  options={REMINDER_TYPES}
                  value={reminder.type}
                  onChange={(e) => updateReminder(idx, 'type', e.target.value)}
                  className="h-9 text-xs w-32"
                />
                {reminders.length > 1 && (
                  <button onClick={() => removeReminder(idx)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add details about this event..."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none"
          />
        </div>
      </div>
    </Modal>
    {showDeleteConfirm && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Event</h3>
          <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this event? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => { setShowDeleteConfirm(false); onDelete!(event!._id); }}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
