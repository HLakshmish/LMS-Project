import React, { useCallback, useMemo } from 'react';
import { 
  useTable, 
  useSortBy, 
  usePagination, 
  useGlobalFilter, 
  Column, 
  Row, 
  Cell,
  TableInstance,
  TableState,
  UsePaginationInstanceProps,
  UsePaginationState,
  UseSortByInstanceProps,
  UseSortByState,
  UseGlobalFiltersInstanceProps,
  UseGlobalFiltersState,
  HeaderGroup
} from 'react-table';

interface TableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  initialState?: {
    pageSize?: number;
    sortBy?: { id: string; desc: boolean }[];
  };
  filterPlaceholder?: string;
}

type TableInstanceWithHooks<T extends object> = TableInstance<T> &
  UsePaginationInstanceProps<T> &
  UseSortByInstanceProps<T> &
  UseGlobalFiltersInstanceProps<T> & {
    state: TableState<T> &
      UsePaginationState<T> &
      UseSortByState<T> &
      UseGlobalFiltersState<T>;
  };

const Table = <T extends object>({
  columns,
  data,
  initialState = { pageSize: 10 },
  filterPlaceholder = 'Search...'
}: TableProps<T>) => {
  // Memoize columns and data to prevent unnecessary re-renders
  const memoizedColumns = useMemo(() => columns, [columns]);
  const memoizedData = useMemo(() => data, [data]);
  
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    setGlobalFilter,
    state: { pageIndex, pageSize, globalFilter }
  } = useTable<T>(
    {
      columns: memoizedColumns,
      data: memoizedData,
      initialState: {
        pageSize: initialState.pageSize,
        sortBy: initialState.sortBy || []
      } as any // Type assertion needed due to complex state type
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  ) as TableInstanceWithHooks<T>;

  // Use useCallback for event handlers to prevent unnecessary re-renders
  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGlobalFilter(e.target.value || undefined);
    },
    [setGlobalFilter]
  );

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPageSize(Number(e.target.value));
    },
    [setPageSize]
  );

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <input
            value={globalFilter || ''}
            onChange={handleFilterChange}
            placeholder={filterPlaceholder}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {[10, 20, 30, 40, 50].map(size => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table {...getTableProps()} className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            {headerGroups.map((headerGroup: HeaderGroup<T>) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column: any) => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.render('Header')}
                    <span>
                      {column.isSorted
                        ? column.isSortedDesc
                          ? ' 🔽'
                          : ' 🔼'
                        : ''}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            {...getTableBodyProps()}
            className="bg-white divide-y divide-gray-200"
          >
            {page.map((row: Row<T>, i: number) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.cells.map((cell: Cell<T>) => {
                    return (
                      <td
                        {...cell.getCellProps()}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {cell.render('Cell') as React.ReactNode}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              !canPreviousPage ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => nextPage()}
            disabled={!canNextPage}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              !canNextPage ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{pageIndex * pageSize + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min((pageIndex + 1) * pageSize, data.length)}
              </span>{' '}
              of <span className="font-medium">{data.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => gotoPage(0)}
                disabled={!canPreviousPage}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  !canPreviousPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">First</span>
                {'<<'}
              </button>
              <button
                onClick={() => previousPage()}
                disabled={!canPreviousPage}
                className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                  !canPreviousPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Previous</span>
                {'<'}
              </button>
              {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
                const pageNum = pageIndex - 2 + i;
                if (pageNum >= 0 && pageNum < pageCount) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => gotoPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        pageNum === pageIndex
                          ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      } text-sm font-medium`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                }
                return null;
              })}
              <button
                onClick={() => nextPage()}
                disabled={!canNextPage}
                className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                  !canNextPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Next</span>
                {'>'}
              </button>
              <button
                onClick={() => gotoPage(pageCount - 1)}
                disabled={!canNextPage}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  !canNextPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Last</span>
                {'>>'}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Table);
