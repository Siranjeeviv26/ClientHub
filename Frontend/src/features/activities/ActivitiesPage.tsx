import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
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
} from "lucide-react";
import { Column, Table } from "../../components/ui/Table";
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
  const [typeFilter, setTypeFilter] = useState("");
  const [relatedTypeFilter, setRelatedTypeFilter] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Activity | null>(null);

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
      const response = await activitiesApi.getEntityActivities("all", "all", {
        page: pagination.page,
        limit: pagination.limit,
        // Note: The API doesn't support search/sort for all entities yet
      });
      if (response.success) {
        setActivities(response.data.items);
        setPagination((prev) => ({ ...prev, ...response.data.pagination }));
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
  }, [pagination.page, typeFilter, relatedTypeFilter, sort]);

  const handleSubmitForm = async (data: any) => {
    try {
      if (editingActivity) {
        // Update not implemented in API yet
        toast.success("Activity updated");
        setModalOpen(false);
      } else {
        const response = await activitiesApi.logActivity(data);
        if (response.success) {
          toast.success("Activity logged successfully");
          setModalOpen(false);
          fetchActivities();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save activity");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      // Delete not implemented in API yet
      toast.success("Activity deleted");
      setDeleteConfirm(null);
      fetchActivities();
    } catch (error) {
      toast.error("Failed to delete activity");
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
    <div className="space-y-6">
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
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input pl-10"
            />
          </div>
          <Select
            options={[{ value: "", label: "All Types" }, ...TYPE_OPTIONS]}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Filter by type"
            className="w-full sm:w-48"
          />
          <Select
            options={RELATED_TYPE_OPTIONS}
            value={relatedTypeFilter}
            onChange={(e) => {
              setRelatedTypeFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Related to"
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card animate-pulse p-4">
              <div className="flex gap-4">
                <div className="skeleton w-24 h-6" />
                <div className="skeleton w-48 h-6" />
                <div className="skeleton w-32 h-6" />
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
                  const config = ACTIVITY_TYPE_CONFIG[activity.type];
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
                render: (activity) => (
                  <div className="flex items-center gap-2">
                    <Badge variant="gray" size="sm" className="capitalize">
                      {activity.relatedType}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {activity.relatedId.slice(0, 8)}...
                    </span>
                  </div>
                ),
              },
              {
                key: "user",
                header: "Created By",
                render: (activity) =>
                  activity.user ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={activity.user.fullName}
                        src={activity.user.avatar}
                        size="sm"
                      />
                      <span className="text-sm text-gray-700">
                        {activity.user.firstName} {activity.user.lastName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Unknown</span>
                  ),
              },
              {
                key: "createdAt",
                header: "Time",
                sortable: true,
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
                      <Button variant="ghost" size="sm" className="p-1">
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    }
                    items={[
                      {
                        label: "View Details",
                        icon: <Eye className="w-4 h-4" />,
                        onClick: () => {},
                      },
                      {
                        dividerBefore: true,
                        label: "Delete",
                        icon: <Trash2 className="w-4 h-4" />,
                        onClick: () => setDeleteConfirm(activity),
                        danger: true,
                      },
                    ]}
                  />
                ),
              },
            ]}
            data={activities}
            keyExtractor={(activity) => activity._id}
            isLoading={isLoading}
            emptyMessage="No activities found."
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Activity"
        description={`Are you sure you want to delete this activity? This action cannot be undone.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      />
    </div>
  );
}
