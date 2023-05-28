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
    <div>
      <table className="w-full table-auto">
        <thead>
          <tr className="text-left bg-gray-700">
            {columns.map((column, index) => (
              <th
                key={index}
                className={
                  "px-4 py-2 font-bold" +
                  (index === 0 ? " rounded-tl-sm" : "") +
                  (index === columns.length - 1 ? " rounded-tr-sm" : "")
                }
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="text-sm">
              {columns.map((column, colIndex) => {
                return (
                  <td
                    key={colIndex}
                    className="py-2 px-4 border-b border-gray-800"
                  >
                    {row[column.key]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
