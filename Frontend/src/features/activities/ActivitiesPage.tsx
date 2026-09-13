import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  Clock,
  MessageSquare,
  Phone,
  Calendar,
  Mail,
  Send,
  ArrowRight,
  X,
  MoreVertical,
} from "lucide-react";
import type { Column } from "../../components/ui/Table";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Dropdown, DropdownItem } from "../../components/ui/Dropdown";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { activitiesApi } from "../../api/activities";
import { Activity, ActivityType } from "../../types";
import {
  formatDate,
  formatRelativeTime,
  getStageColor,
  cn,
} from "../../utils/formatters";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  note: {
    label: "Note",
    icon: <MessageSquare className="w-4 h-4" />,
    color: "primary",
  },
  call: {
    label: "Call",
    icon: <Phone className="w-4 h-4" />,
    color: "success",
  },
  meeting: {
    label: "Meeting",
    icon: <Calendar className="w-4 h-4" />,
    color: "warning",
  },
  email: {
    label: "Email",
    icon: <Mail className="w-4 h-4" />,
    color: "primary",
  },
  task: { label: "Task", icon: <Send className="w-4 h-4" />, color: "primary" },
  statusChange: {
    label: "Status Change",
    icon: <ArrowRight className="w-4 h-4" />,
    color: "warning",
  },
  leadConversion: {
    label: "Lead Conversion",
    icon: <ArrowRight className="w-4 h-4" />,
    color: "success",
  },
  dealUpdate: {
    label: "Deal Update",
    icon: <ArrowRight className="w-4 h-4" />,
    color: "primary",
  },
};

const TYPE_OPTIONS = Object.entries(ACTIVITY_TYPE_CONFIG).map(
  ([value, config]) => ({
    value,
    label: config.label,
  }),
);

const RELATED_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "client", label: "Client" },
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "task", label: "Task" },
];

export function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [relatedTypeFilter, setRelatedTypeFilter] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const hasActiveFilters = !!(search || typeFilter || relatedTypeFilter);
  const filteredActivities = activities.filter((a) => {
    if (typeFilter && a.type !== typeFilter) return false;
    if (relatedTypeFilter && a.relatedType !== relatedTypeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${a.title || ''} ${a.description || ''} ${a.relatedType || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  useEffect(() => {
    const t = setTimeout(() => { if (searchInput !== search) { setSearch(searchInput); setPagination((p) => ({ ...p, page: 1 })); } }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Activity | null>(null);
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<{
    type: ActivityType;
    title: string;
    description: string;
    relatedType: "client" | "lead" | "deal" | "task";
    relatedId: string;
  }>({
    resolver: zodResolver(
      z.object({
        type: z.enum([
          "note",
          "call",
          "meeting",
          "email",
          "task",
          "statusChange",
          "leadConversion",
          "dealUpdate",
        ]),
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        relatedType: z.enum(["client", "lead", "deal", "task"]),
        relatedId: z.string().min(1, "Related ID is required"),
      }),
    ),
    defaultValues: {
      type: "note",
      title: "",
      description: "",
      relatedType: "client",
      relatedId: "",
    },
  });

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const response = await activitiesApi.getMyActivities({
        page: pagination.page,
        limit: pagination.limit,
      });
      if (response?.success && response?.data) {
        setActivities(response.data.items || []);
        if (response.data.pagination) {
          setPagination((prev) => ({ ...prev, ...response.data.pagination }));
        }
      } else if (Array.isArray((response as any)?.data)) {
        // Fallback if API returns raw array
        setActivities((response as any).data as Activity[]);
      } else if (response && !(response as any).success) {
        console.warn('Activities API returned non-success:', response);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      toast.error("Failed to load activities");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [pagination.page, search, typeFilter, relatedTypeFilter, sort]);

  const handleSubmitForm = async (data: any) => {
    try {
      const response = await activitiesApi.logActivity(data);
      if (response.success) {
        toast.success("Activity logged successfully");
        setModalOpen(false);
        fetchActivities();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save activity");
    }
  };

  const openCreateModal = () => {
    setEditingActivity(null);
    reset({
      type: "note",
      title: "",
      description: "",
      relatedType: "client",
      relatedId: "",
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Activities</h1>
          <p className="page-description">
            View and manage all activities across your organization
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Log Activity
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <div className="relative w-full lg:w-[380px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="w-full sm:w-[150px] shrink-0">
              <Select
                options={[{ value: "", label: "All types" }, ...TYPE_OPTIONS]}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="w-full sm:w-[150px] shrink-0">
              <Select
                options={RELATED_TYPE_OPTIONS}
                value={relatedTypeFilter}
                onChange={(e) => setRelatedTypeFilter(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch(''); setTypeFilter(''); setRelatedTypeFilter(''); }} className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50 whitespace-nowrap">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Filter className="w-3 h-3" /> Active</span>
            {typeFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">{TYPE_OPTIONS.find(o => o.value === typeFilter)?.label || typeFilter}<button onClick={() => setTypeFilter('')} className="hover:bg-primary-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            {relatedTypeFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 capitalize">{relatedTypeFilter}<button onClick={() => setRelatedTypeFilter('')} className="hover:bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            {search && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">“{search}”<button onClick={() => { setSearch(''); setSearchInput(''); }} className="hover:bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            <span className="text-xs text-gray-400">{filteredActivities.length} on page</span>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200/70 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="skeleton w-24 h-6 rounded-lg" />
                <div className="skeleton w-48 h-6 rounded-lg" />
                <div className="skeleton w-32 h-6 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <Table
            columns={[
              {
                key: "type",
                header: "Type",
                sortable: true,
                render: (activity) => {
                  const config = ACTIVITY_TYPE_CONFIG[activity.type as ActivityType];
                  if (!config) {
                    return (
                      <Badge variant="gray" size="sm" className="capitalize">
                        {String(activity.type || 'unknown').replace(/_/g, ' ')}
                      </Badge>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={config.color as any}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                  );
                },
              },
              {
                key: "title",
                header: "Title",
                sortable: true,
                render: (activity) => (
                  <div>
                    <p className="font-medium text-gray-900">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {activity.description}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                key: "relatedType",
                header: "Related To",
                sortable: true,
                                  className: 'hidden lg:table-cell',
render: (activity) => (
                  <div className="flex items-center gap-2">
                    <Badge variant="gray" size="sm" className="capitalize">
                      {activity.relatedType || '—'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {activity.relatedId ? String(activity.relatedId).slice(0, 8) + '...' : '—'}
                    </span>
                  </div>
                ),
              },
              {
                key: "user",
                header: "Created By",
                                  className: 'hidden xl:table-cell',
render: (activity) => {
                  const u = (activity as any).user || (activity as any).userId;
                  // userId may be populated object or string
                  if (u && typeof u === 'object' && (u.firstName || u.fullName)) {
                    const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User';
                    return (
                      <div className="flex items-center gap-2">
                        <Avatar name={name} src={u.avatar} size="sm" />
                        <span className="text-sm text-gray-700">{name}</span>
                      </div>
                    );
                  }
                  return <span className="text-gray-400">Unknown</span>;
                },
              },
              {
                key: "createdAt",
                header: "Time",
                sortable: true,
                                  className: 'hidden md:table-cell',
render: (activity) => (
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {formatDate(activity.createdAt)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                  render: (activity) => (
                  <Dropdown
                    trigger={
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    }
                    items={[
                      {
                        label: "View Details",
                        icon: <Eye className="w-4 h-4" />,
                        onClick: () => setViewActivity(activity),
                      },
                    ]}
                  />
                ),
              },
            ]}
            data={filteredActivities}
            keyExtractor={(activity) => activity._id}
            isLoading={isLoading}
            emptyMessage={hasActiveFilters ? "No activities match your filters. Clear to see all." : "No activities found."}
            hoverable
            striped
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} activities
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingActivity(null);
        }}
        title={editingActivity ? "Edit Activity" : "Log Activity"}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditingActivity(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="activity-form" loading={isLoading}>
              {editingActivity ? "Update" : "Log Activity"}
            </Button>
          </div>
        }
      >
        <form
          id="activity-form"
          onSubmit={handleSubmit(handleSubmitForm)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Activity Type *"
              options={TYPE_OPTIONS}
              value={watch("type")}
              onChange={(e) => setValue("type", e.target.value as ActivityType)}
              error={errors.type?.message}
            />
            <Input
              label="Title *"
              placeholder="Call with client"
              error={errors.title?.message}
              {...register("title")}
            />
            <Select
              label="Related To *"
              options={RELATED_TYPE_OPTIONS.filter((o) => o.value)}
              value={watch("relatedType")}
              onChange={(e) => setValue("relatedType", e.target.value as any)}
              error={errors.relatedType?.message}
            />
            <Input
              label="Related ID *"
              placeholder="Entity ID"
              error={errors.relatedId?.message}
              {...register("relatedId")}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              {...register("description")}
              rows={4}
              className="input"
              placeholder="Activity details..."
            />
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewActivity}
        onClose={() => setViewActivity(null)}
        title={viewActivity?.title || 'Activity Details'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setViewActivity(null)}>Close</Button>
          </div>
        }
      >
        {viewActivity && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <p className="text-xs tracking-widest uppercase text-gray-400">Type • Related</p>
              <p className="font-semibold text-gray-900 mt-1 capitalize">{String(viewActivity.type || '').replace(/_/g, ' ')} • {viewActivity.relatedType || '—'}</p>
              <p className="text-sm text-gray-600 mt-1">{viewActivity.title}</p>
              {viewActivity.description && <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{viewActivity.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Related ID</p><p className="font-medium mt-1 font-mono text-xs break-all">{viewActivity.relatedId ? String(viewActivity.relatedId) : '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Created</p><p className="font-medium mt-1">{viewActivity.createdAt ? `${formatDate(viewActivity.createdAt)} • ${formatRelativeTime(viewActivity.createdAt)}` : '—'}</p></div>
            </div>
            {(viewActivity as any).metadata && Object.keys((viewActivity as any).metadata).length > 0 && (
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Metadata</p><pre className="text-xs mt-1 p-3 rounded-xl bg-gray-900 text-gray-100 overflow-auto">{JSON.stringify((viewActivity as any).metadata, null, 2)}</pre></div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
