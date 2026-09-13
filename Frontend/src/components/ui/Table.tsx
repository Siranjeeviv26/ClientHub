import React from 'react';
import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  width?: string;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  striped = false,
  hoverable = true,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="table-container bg-white rounded-2xl border border-gray-200/70 shadow-sm">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={{ width: column.width }} className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    <div className="skeleton h-4 w-3/4 rounded-lg" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="empty-state bg-white rounded-2xl border border-gray-200/70 shadow-sm">
        <div className="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="empty-state-title">No data found</p>
        <p className="empty-state-description">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={clsx('table-container bg-white rounded-2xl border border-gray-200/70 shadow-sm', className)}>
      <table className="table w-full">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={clsx(column.className, column.sortable && 'cursor-pointer select-none', column.key === 'actions' && 'sticky right-0 bg-gray-50/50 z-10 border-l border-gray-200/70')}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={keyExtractor(row)}
              className={clsx(
                'group',
                hoverable && 'hover:bg-gray-50/60 transition-colors',
                striped && rowIndex % 2 === 1 && 'bg-gray-50/30',
                onRowClick && 'cursor-pointer',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={column.key} className={clsx(column.className, 'align-middle py-4', column.key === 'actions' && 'sticky right-0 bg-white group-hover:bg-gray-50/60 z-10 border-l border-gray-200/70')}>
                  {column.render ? column.render(row, rowIndex) : (row as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
