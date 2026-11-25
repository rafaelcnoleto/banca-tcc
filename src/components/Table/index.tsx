import type { ReactNode } from 'react';

export interface TableColumn<T> {
  header: string;
  accessor: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  rowClassName?: (item: T) => string;
  renderActions?: (item: T) => ReactNode;
}

export const Table = <T,>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Nenhum registro encontrado.',
  rowClassName,
  renderActions,
}: TableProps<T>) => {
  const totalColunas = columns.length + (renderActions ? 1 : 0);

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                scope="col"
                className={`text-secondary fw-semibold small ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
            {renderActions && (
              <th scope="col" className="text-secondary fw-semibold small text-end">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={totalColunas} className="text-center text-muted py-4">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className={rowClassName ? rowClassName(item) : ''}>
                {columns.map((col) => (
                  <td key={col.header} className={col.className}>
                    {col.accessor(item)}
                  </td>
                ))}
                {renderActions && <td className="text-end">{renderActions(item)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
