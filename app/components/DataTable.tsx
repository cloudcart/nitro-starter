import {type ReactNode, useId} from 'react';
import {Pagination, type PaginationProps, useTranslation} from '@cloudcart/nitrogen';
import {buttonClass} from '~/components/ui/Button';

/** A column of a `DataTable`: its header, what each row shows in it, and `end` for amounts and counts. */
export type Column<Row> = {header: string; cell: (row: Row) => ReactNode; align?: 'start' | 'end'};

type DataTableProps<Row> = {
  /** What the table lists, for screen readers. */
  caption: string;
  columns: Array<Column<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
};

/**
 * Rows of data as a table, with column headers and a caption for screen readers. On a narrow screen it scrolls
 * sideways inside its frame, which takes the keyboard's focus so it can be scrolled without a mouse.
 */
export function DataTable<Row>({caption, columns, rows, rowKey}: DataTableProps<Row>) {
  const captionId = useId();
  const align = (column: Column<Row>) => (column.align === 'end' ? 'text-right' : 'text-left');

  return (
    <div
      role="region"
      aria-labelledby={captionId}
      // A region that scrolls takes the keyboard's focus, so it can be scrolled without a mouse (WCAG 2.1.1).
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- the region scrolls
      tabIndex={0}
      className="overflow-x-auto rounded-card border border-border"
    >
      <table className="w-full border-collapse">
        <caption id={captionId} className="sr-only">
          {caption}
        </caption>
        <thead className="bg-surface">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`px-4 py-3 text-small font-medium whitespace-nowrap text-muted ${align(column)}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.header} className={`px-4 py-3 align-middle ${align(column)}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A `DataTable` of a paginated list, with "Load previous" above it and "Load more" below. */
export function PaginatedTable<Row>({
  connection,
  ...table
}: Omit<DataTableProps<Row>, 'rows'> & {connection: PaginationProps<Row>['connection']}) {
  const {t} = useTranslation();
  const linkClass = buttonClass('secondary', {fullWidth: true});

  return (
    <Pagination<Row> connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => (
        <div className="flex flex-col gap-4">
          <PreviousLink className={linkClass}>
            {isLoading ? t('listing.loading') : t('listing.loadPrevious')}
          </PreviousLink>
          <DataTable {...table} rows={nodes} />
          <NextLink className={linkClass}>{isLoading ? t('listing.loading') : t('listing.loadMore')}</NextLink>
        </div>
      )}
    </Pagination>
  );
}
