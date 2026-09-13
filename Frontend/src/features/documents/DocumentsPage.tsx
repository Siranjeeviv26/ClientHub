import React, { useEffect, useState } from 'react';
import {
  Upload,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  X,
  FileText,
  File,
  Image,
  Table,
  MoreVertical,
} from 'lucide-react';
import { Table as UiTable, Column } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { documentsApi, Document } from '../../api/documents';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { DocumentUpload } from './DocumentUpload';
import toast from 'react-hot-toast';

const FOLDER_OPTIONS = [
  { value: '', label: 'All folders' },
  { value: 'Client', label: 'Client' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Deal', label: 'Deal' },
  { value: 'Proposal', label: 'Proposal' },
  { value: 'Invoice', label: 'Invoice' },
  { value: 'General', label: 'General' },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(fileType: string) {
  const ext = fileType.toLowerCase();
  if (ext.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (ext.includes('word') || ext.includes('doc')) return <FileText className="w-5 h-5 text-blue-500" />;
  if (ext.includes('excel') || ext.includes('sheet') || ext.includes('xls')) return <Table className="w-5 h-5 text-green-600" />;
  if (ext.includes('image') || ext.includes('png') || ext.includes('jpg') || ext.includes('jpeg')) return <Image className="w-5 h-5 text-purple-500" />;
  if (ext.includes('csv')) return <Table className="w-5 h-5 text-teal-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function getFolderBadgeVariant(folder: string): 'primary' | 'success' | 'warning' | 'danger' | 'gray' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'gray'> = {
    Client: 'primary',
    Lead: 'warning',
    Deal: 'success',
    Proposal: 'gray',
    Invoice: 'danger',
    General: 'gray',
  };
  return map[folder] || 'gray';
}

export function DocumentsPage() {
  const { user: currentUser } = useAuth();
  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Document | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentsApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        folder: folderFilter || undefined,
      });
      if (response.success) {
        setDocuments(response.data.items);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchDocuments();
  }, [pagination.page, search, folderFilter]);

  const handleUpload = async (formData: FormData) => {
    await documentsApi.upload(formData);
    toast.success('Document uploaded successfully');
    setUploadModalOpen(false);
    fetchDocuments();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await documentsApi.delete(deleteConfirm._id);
      toast.success('Document deleted');
      setDeleteConfirm(null);
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await documentsApi.getDownloadUrl(doc._id);
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        toast.error('Download not available for demo documents');
      }
    } catch {
      toast.error('Failed to get download URL');
    }
  };

  const columns: Column<Document>[] = [
    {
      key: 'fileName',
      header: 'File',
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            {getFileIcon(doc.fileType)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate max-w-[250px]">{doc.fileName}</p>
            {doc.description && (
              <p className="text-xs text-gray-500 truncate max-w-[250px]">{doc.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'folder',
      header: 'Folder',
      sortable: true,
      render: (doc) => (
        <Badge variant={getFolderBadgeVariant(doc.folder)} size="sm">
          {doc.folder}
        </Badge>
      ),
    },
    {
      key: 'fileSize',
      header: 'Size',
      className: 'hidden lg:table-cell',
      render: (doc) => <span className="text-sm text-gray-600">{formatFileSize(doc.fileSize)}</span>,
    },
    {
      key: 'uploadedBy',
      header: 'Uploaded By',
      className: 'hidden lg:table-cell',
      render: (doc) => <span className="text-sm text-gray-600">{typeof doc.uploadedBy === 'string' ? doc.uploadedBy : (doc.uploadedBy as any)?.fullName || 'Unknown'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      className: 'hidden lg:table-cell',
      sortable: true,
      render: (doc) => <span className="text-sm text-gray-600">{formatDate(doc.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (doc) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200">
              <MoreVertical className="w-4 h-4" />
            </Button>
          }
          items={[
            {
              label: 'Download',
              icon: <Download className="w-4 h-4" />,
              onClick: () => handleDownload(doc),
            },
            canDelete && {
              dividerBefore: true,
              label: 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => setDeleteConfirm(doc),
              danger: true,
            },
          ].filter(Boolean) as DropdownItem[]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-description">Manage and organize your files</p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)} leftIcon={<Upload className="w-4 h-4" />}>
          Upload Document
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <div className="relative w-full lg:w-[380px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by file name..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Filter className="w-3.5 h-3.5" /> Filters
            </div>
            <div className="w-full sm:w-[160px] shrink-0">
              <Select
                options={FOLDER_OPTIONS}
                value={folderFilter}
                onChange={(e) => { setFolderFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="h-9 text-sm"
              />
            </div>
            {(search || folderFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch(''); setFolderFilter(''); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        {(search || folderFilter) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{pagination.total} results</span>
            {folderFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" /> {FOLDER_OPTIONS.find(o => o.value === folderFilter)?.label}
                <button onClick={() => setFolderFilter('')} className="ml-1 hover:bg-primary-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
                "{search}"
                <button onClick={() => { setSearchInput(''); setSearch(''); }} className="ml-1 hover:bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      <UiTable
        columns={columns}
        data={documents}
        keyExtractor={(doc) => doc._id}
        isLoading={isLoading}
        emptyMessage="No documents found. Upload your first document to get started."
        hoverable
        striped
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} documents
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
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
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Document"
        size="md"
      >
        <DocumentUpload
          onUpload={handleUpload}
          onCancel={() => setUploadModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteConfirm?.fileName}"? This action cannot be undone.`}
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
