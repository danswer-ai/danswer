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
          <tr className="text-left bg-gray-700">
            {columns.map((column, index) => (
              <th
                key={index}
                className={
                  "px-4 py-2 font-bold" +
                  (index === 0 ? " rounded-tl-md" : "") +
                  (index === columns.length - 1 ? " rounded-tr-md" : "")
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
                let entryClassName = "px-4 py-2 border-b border-gray-700";
                const isFinalRow = rowIndex === data.length - 1;
                if (colIndex === 0) {
                  entryClassName += " border-l";
                  if (isFinalRow) {
                    entryClassName += " rounded-bl-md";
                  }
                }
                if (colIndex === columns.length - 1) {
                  entryClassName += " border-r";
                  if (isFinalRow) {
                    entryClassName += " rounded-br-md";
                  }
                }
                return (
                  <td key={colIndex} className={entryClassName}>
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
