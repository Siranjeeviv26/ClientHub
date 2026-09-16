import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Filter,
  Search,
  User,
  FileText,
  Trash2,
  Edit,
  LogIn,
  LogOut,
  Shield,
  X,
} from "lucide-react";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { auditLogsApi } from "../../api/audit-logs";
import { AuditLog, PaginatedResponse } from "../../types";
import { formatDateTime } from "../../utils/formatters";
import toast from "react-hot-toast";

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "CREATE", label: "Create" },
  { value: "READ", label: "Read" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "All entities" },
  { value: "client", label: "Client" },
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "task", label: "Task" },
  { value: "user", label: "User" },
  { value: "invoice", label: "Invoice" },
  { value: "document", label: "Document" },
  { value: "organization", label: "Organization" },
  { value: "notification", label: "Notification" },
];

function getActionBadgeVariant(
  action: string,
): "success" | "primary" | "warning" | "danger" | "gray" {
  const a = action.toUpperCase();
  if (a === "CREATE") return "success";
  if (a === "READ") return "primary";
  if (a === "UPDATE") return "warning";
  if (a === "DELETE") return "danger";
  if (a === "LOGIN") return "primary";
  if (a === "LOGOUT") return "gray";
  return "gray";
}

function getActionIcon(action: string) {
  const a = action.toUpperCase();
  if (a === "CREATE") return <FileText className="w-3.5 h-3.5" />;
  if (a === "READ") return <FileText className="w-3.5 h-3.5" />;
  if (a === "UPDATE") return <Edit className="w-3.5 h-3.5" />;
  if (a === "DELETE") return <Trash2 className="w-3.5 h-3.5" />;
  if (a === "LOGIN") return <LogIn className="w-3.5 h-3.5" />;
  if (a === "LOGOUT") return <LogOut className="w-3.5 h-3.5" />;
  return <Activity className="w-3.5 h-3.5" />;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (search) params.search = search;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await auditLogsApi.getLogs(params);
      if (response.success) {
        setLogs(response.data.items || []);
        if (response.data.pagination) {
          setPagination((p) => ({ ...p, ...response.data.pagination }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    actionFilter,
    entityFilter,
    search,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = (page: number) => {
    setPagination((p) => ({ ...p, page }));
  };

  const clearFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setSearchInput("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const hasActiveFilters =
    actionFilter || entityFilter || search || dateFrom || dateTo;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
            <Activity className="w-3.5 h-3.5" /> Audit Logs
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">Audit Logs</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">Track every action across your workspace — creates, updates, deletes, and auth events with user, entity, and IP context.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {pagination.total} total
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600">
            <Shield className="w-3 h-3" /> Org scope
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by user name..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>
          <div className="flex-1 min-w-[140px] max-w-[180px]">
            <Select
              options={ACTION_OPTIONS}
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="h-9 text-sm w-full"
            />
          </div>
          <div className="flex-1 min-w-[140px] max-w-[180px]">
            <Select
              options={ENTITY_OPTIONS}
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="h-9 text-sm w-full"
            />
          </div>
          <div className="flex-1 min-w-[140px] max-w-[160px]">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="From"
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300"
            />
          </div>
          <div className="flex-1 min-w-[140px] max-w-[160px]">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="To"
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50 shrink-0"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            {actionFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">
                Action: {actionFilter}
                <button
                  onClick={() => setActionFilter("")}
                  className="hover:bg-primary-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {entityFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700 capitalize">
                Entity: {entityFilter}
                <button
                  onClick={() => setEntityFilter("")}
                  className="hover:bg-primary-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
                "{search}"
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                  }}
                  className="hover:bg-gray-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
                From: {dateFrom}
                <button
                  onClick={() => setDateFrom("")}
                  className="hover:bg-gray-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
                To: {dateTo}
                <button
                  onClick={() => setDateTo("")}
                  className="hover:bg-gray-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <Table
        columns={[
          {
            key: "createdAt",
            header: "Timestamp",
            sortable: true,
            width: "170px",
            render: (log) => (
              <span className="whitespace-nowrap text-sm text-gray-600">
                {formatDateTime(log.createdAt)}
              </span>
            ),
          },
          {
            key: "userId",
            header: "User",
            width: "180px",
            render: (log) => (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm leading-tight">
                    {log.user?.fullName || "Unknown User"}
                  </p>
                  {log.user?.email && (
                    <p className="text-xs text-gray-500 truncate">
                      {log.user.email}
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "action",
            header: "Action",
            width: "130px",
            render: (log) => (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {getActionIcon(log.action)}
                <Badge
                  variant={getActionBadgeVariant(log.action)}
                  size="sm"
                  className="capitalize"
                >
                  {log.action.toLowerCase()}
                </Badge>
              </span>
            ),
          },
          {
            key: "entity",
            header: "Entity",
            width: "120px",
            render: (log) => (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-700 capitalize">
                  {log.entity}
                </span>
              </span>
            ),
          },
          {
            key: "entityId",
            header: "Entity ID",
            width: "140px",
            className: "hidden lg:table-cell",
            render: (log) => (
              <span
                className="text-sm text-gray-500 font-mono truncate block max-w-[120px]"
                title={log.entityId}
              >
                {log.entityId ? log.entityId.slice(-8) : "—"}
              </span>
            ),
          },
          {
            key: "ipAddress",
            header: "IP Address",
            width: "130px",
            className: "hidden lg:table-cell",
            render: (log) => (
              <span className="text-sm text-gray-500 font-mono whitespace-nowrap">
                {log.ipAddress || "—"}
              </span>
            ),
          },
        ]}
        data={logs}
        keyExtractor={(log) => log._id}
        isLoading={isLoading}
        emptyMessage="No audit logs found matching your filters."
        hoverable
        striped
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200/70 px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} logs
          </p>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Single page info */}
      {pagination.totalPages <= 1 && pagination.total > 0 && (
        <div className="flex items-center justify-center">
          <p className="text-sm text-gray-500">
            Showing {pagination.total} {pagination.total === 1 ? "log" : "logs"}
          </p>
        </div>
      )}
    </div>
  );
}
