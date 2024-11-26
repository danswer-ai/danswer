import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTeamspaceUsers } from "@/lib/hooks";
import { useRouter } from "next/navigation";

export const BulkAddTeamspace = ({
  teamspaceId,
  refreshUsers,
  onClose,
}: {
  teamspaceId?: string | string[];
  refreshUsers: () => void;
  onClose: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { data: users, refreshTeamspaceUsers } = useTeamspaceUsers(teamspaceId);

  const handleInvite = async () => {
    if (selectedEmails.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to invite.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/manage/admin/teamspace/user-add/${teamspaceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedEmails),
        }
      );

      if (!response.ok) throw new Error("Failed to add users");

      refreshTeamspaceUsers();
      refreshUsers();
      onClose();
      router.refresh();
      toast({
        title: "Success",
        description: "Users invited successfully",
        variant: "success",
      });
      setSelectedEmails([]);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Error inviting users",
        variant: "destructive",
      });
    }
  };

  const handleCheckboxChange = (email: string) => {
    setSelectedEmails((prevSelected) =>
      prevSelected.includes(email)
        ? prevSelected.filter((e) => e !== email)
        : [...prevSelected, email]
    );
  };

  const filteredUsers = users?.filter(
    (user) =>
      user.full_name!.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (isChecked: boolean | "indeterminate") => {
    const checked = isChecked === true;
    if (checked && filteredUsers) {
      setSelectedEmails(filteredUsers.map((user) => user.email));
    } else {
      setSelectedEmails([]);
    }
    setIsAllSelected(checked);
  };

  useEffect(() => {
    if (filteredUsers && filteredUsers.length > 0) {
      const allSelected = filteredUsers.every((user) =>
        selectedEmails.includes(user.email)
      );
      setIsAllSelected(allSelected);
    } else {
      setIsAllSelected(false);
    }
  }, [selectedEmails, filteredUsers]);

  return (
    <div className="pb-8">
      <div className="flex items-center mt-4 gap-x-2 w-full md:w-1/2 ml-auto mb-6">
        <Input
          type="text"
          placeholder="Search user"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Button disabled={selectedEmails.length <= 0} onClick={handleInvite}>
          Add
        </Button>
      </div>

      {filteredUsers && filteredUsers.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(isChecked) =>
                        handleSelectAll(!!isChecked)
                      }
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEmails.includes(user.email)}
                        onCheckedChange={() => handleCheckboxChange(user.email)}
                      />
                    </TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <p className="flex items-center justify-center py-4">No user.</p>
      )}
    </div>
  );
};
