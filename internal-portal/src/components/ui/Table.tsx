import React from 'react';

interface TableProps<T> {
  data: T[];
  columns: { key: string; header: string; render?: (row: T) => React.ReactNode }[];
  keyExtractor: (row: T) => string;
}

export function Table<T>({ data, columns, keyExtractor }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-blue-200/30 shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-blue-50/80 backdrop-blur-sm">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left font-semibold">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map(row => (
            <tr key={keyExtractor(row)} className="hover:bg-blue-50/40 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
