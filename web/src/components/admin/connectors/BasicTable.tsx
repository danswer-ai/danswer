import React, { FC } from "react";

type Column = {
  header: string;
  key: string;
};

type TableData = {
  [key: string]: string | number | JSX.Element;
};

interface BasicTableProps {
  columns: Column[];
  data: TableData[];
}

export const BasicTable: FC<BasicTableProps> = ({ columns, data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          <tr className="text-left border border-gray-300">
            {columns.map((column, index) => (
              <th key={index} className="px-4 py-2 font-bold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={rowIndex % 2 === 0 ? "bg-gray-600" : "bg-gray-700"}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className="px-4 py-2 border-b border-gray-500"
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
