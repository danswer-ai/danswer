import React from "react";
import { User } from "@/lib/types";
import {
  Table,
  TableCell,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SlackUserTableProps {
  users: User[];
}

const SlackUserTable: React.FC<SlackUserTableProps> = ({ users }) => {
  return (
    <>
      <p className="mb-4 text-sm text-gray-600">
        This list displays Slack users who have access to Danswer through the
        Slack integration.
      </p>
      <ul className="list-disc pl-5">
        {users.map((user) => (
          <li key={user.id} className="mb-2">
            {user.email}
          </li>
        ))}
      </ul>
    </>
  );
};

export default SlackUserTable;
