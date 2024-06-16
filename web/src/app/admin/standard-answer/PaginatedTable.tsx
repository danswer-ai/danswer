import React, { useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";

interface Data {
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
}

interface Column {
  name: string;
  key: string;
}

// const columns = [
//   { name: 'ID', key: 'id' },
//   { name: 'Name', key: 'name' },
//   { name: 'Email', key: 'email' },
//   { name: 'Age', key: 'age' },
//   { name: 'City', key: 'city' },
// ];

const PaginatedTable = ({
  data,
  columns,
}: {
  data: Data[];
  columns: Column[];
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [pageSize, setPageSize] = useState(1);

  //   const filteredData = data.filter((item) => {
  //     const searchMatch = Object.values(item)
  //       .join(' ')
  //       .toLowerCase()
  //       .includes(searchTerm.toLowerCase());

  //     const columnFilterMatch =
  //       filterColumn && filterValue
  //         ? item[filterColumn as keyof Data]
  //             .toString()
  //             .toLowerCase()
  //             .includes(filterValue.toLowerCase())
  //         : true;

  //     return searchMatch && columnFilterMatch;
  //   });

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterColumn = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterColumn(e.target.value);
    setFilterValue("");
  };

  const handleFilterValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterValue(e.target.value);
  };

  const handlePageSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(parseInt(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="mx-auto">
      {/* <div className="mb-4 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={handleSearch}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center">
          <select
            value={filterColumn}
            onChange={handleFilterColumn}
            className="mr-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Filter by column</option>
            {columns.map((column) => (
              <option key={column.key} value={column.key}>
                {column.name}
              </option>
            ))}
          </select>
          {filterColumn && (
            <input
              type="text"
              placeholder={`Filter by ${filterColumn}`}
              value={filterValue}
              onChange={handleFilterValue}
              className="mr-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div> */}
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableHeaderCell key={column.key}>{column.name}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.email}</TableCell>
              <TableCell>{item.age}</TableCell>
              <TableCell>{item.city}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <div className="px-3 py-2 border-t border-b border-gray-300">
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PaginatedTable;
