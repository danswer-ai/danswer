import {
  type User,
  UserStatus,
  UserRole,
  USER_ROLE_LABELS,
  INVALID_ROLE_HOVER_TEXT,
} from "@/lib/types";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import useSWRMutation from "swr/mutation";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GenericConfirmModal } from "@/components/modals/GenericConfirmModal";
import { useState } from "react";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { DeleteEntityModal } from "@/components/modals/DeleteEntityModal";
import { TableHeader } from "@/components/ui/table";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { ErrorCallout } from "@/components/ErrorCallout";
import { PageSelector } from "@/components/PageSelector";
import { ThreeDotsLoader } from "@/components/Loading";

interface Props {
  setPopup: (spec: PopupSpec) => void;
  q?: string;
}

const ITEMS_PER_PAGE = 10;
const PAGES_PER_BATCH = 2;

// Creates a dropdown for changing the role of a user
const UserRoleDropdown = ({
  user,
  onSuccess,
  onError,
}: {
  user: User;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const { trigger: setUserRole, isMutating: isSettingRole } = useSWRMutation(
    "/api/manage/set-user-role",
    userMutationFetcher,
    { onSuccess, onError }
  );
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  const handleChange = (value: string) => {
    if (value === user.role) return;
    if (user.role === UserRole.CURATOR) {
      setShowConfirmModal(true);
      setPendingRole(value);
    } else {
      setUserRole({
        user_email: user.email,
        new_role: value,
      });
    }
  };

  const handleConfirm = () => {
    if (pendingRole) {
      setUserRole({
        user_email: user.email,
        new_role: pendingRole,
      });
    }
    setShowConfirmModal(false);
    setPendingRole(null);
  };

  return (
    <>
      <Select
        value={user.role}
        onValueChange={handleChange}
        disabled={isSettingRole}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(
            ([role, label]) => {
              // Dont want to ever show external permissioned users because it's scary
              if (role === UserRole.EXT_PERM_USER) return null;

              // Only want to show limited users if paid enterprise features are enabled
              // Also, dont want to show these other roles in general
              const isNotVisibleRole =
                (!isPaidEnterpriseFeaturesEnabled &&
                  role === UserRole.GLOBAL_CURATOR) ||
                role === UserRole.CURATOR ||
                role === UserRole.LIMITED ||
                role === UserRole.SLACK_USER;

              // Always show the current role
              const isCurrentRole = user.role === role;

              return isNotVisibleRole && !isCurrentRole ? null : (
                <SelectItem
                  key={role}
                  value={role}
                  title={INVALID_ROLE_HOVER_TEXT[role] ?? ""}
                  data-tooltip-delay="0"
                >
                  {label}
                </SelectItem>
              );
            }
          )}
        </SelectContent>
      </Select>
      {showConfirmModal && (
        <GenericConfirmModal
          title="Change Curator Role"
          message={`Warning: Switching roles from Curator to ${
            USER_ROLE_LABELS[pendingRole as UserRole] ??
            USER_ROLE_LABELS[user.role]
          } will remove their status as individual curators from all groups.`}
          confirmText={`Switch Role to ${
            USER_ROLE_LABELS[pendingRole as UserRole] ??
            USER_ROLE_LABELS[user.role]
          }`}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
};

const DeactivateUserButton = ({
  user,
  deactivate,
  setPopup,
  refresh,
}: {
  user: User;
  deactivate: boolean;
  setPopup: (spec: PopupSpec) => void;
  refresh: () => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    deactivate
      ? "/api/manage/admin/deactivate-user"
      : "/api/manage/admin/activate-user",
    userMutationFetcher,
    {
      onSuccess: () => {
        refresh();
        setPopup({
          message: `User ${deactivate ? "deactivated" : "activated"}!`,
          type: "success",
        });
      },
      onError: (errorMsg) =>
        setPopup({ message: errorMsg.message, type: "error" }),
    }
  );
  return (
    <Button
      className="w-min"
      onClick={() => trigger({ user_email: user.email })}
      disabled={isMutating}
      size="sm"
    >
      {deactivate ? "Deactivate" : "Activate"}
    </Button>
  );
};

const DeleteUserButton = ({
  user,
  setPopup,
  refresh,
}: {
  user: User;
  setPopup: (spec: PopupSpec) => void;
  refresh: () => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    "/api/manage/admin/delete-user",
    userMutationFetcher,
    {
      onSuccess: () => {
        refresh();
        setPopup({
          message: "User deleted successfully!",
          type: "success",
        });
      },
      onError: (errorMsg) =>
        setPopup({
          message: `Unable to delete user - ${errorMsg}`,
          type: "error",
        }),
    }
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  return (
    <>
      {showDeleteModal && (
        <DeleteEntityModal
          entityType="user"
          entityName={user.email}
          onClose={() => setShowDeleteModal(false)}
          onSubmit={() => trigger({ user_email: user.email, method: "DELETE" })}
          additionalDetails="All data associated with this user will be deleted (including personas, tools and chat sessions)."
        />
      )}

      <Button
        className="w-min"
        onClick={() => setShowDeleteModal(true)}
        disabled={isMutating}
        size="sm"
        variant="destructive"
      >
        Delete
      </Button>
    </>
  );
};

const SignedUpUserTable = ({ setPopup, q = "" }: Props) => {
  const [filters, setFilters] = useState<{
    status?: UserStatus.live | UserStatus.deactivated;
    roles?: UserRole[];
  }>({});

  const {
    currentPageData: pageOfUsers,
    isLoading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
    hasNoData,
  } = usePaginatedFetch<User>({
    itemsPerPage: ITEMS_PER_PAGE,
    pagesPerBatch: PAGES_PER_BATCH,
    endpoint: "/api/manage/users/accepted",
    query: q,
    filter: filters,
  });

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="h-24 text-center">
          <ThreeDotsLoader />
        </TableCell>
      </TableRow>
    );
  }

  if (error || !pageOfUsers) {
    return (
      <ErrorCallout
        errorTitle="Error loading users"
        errorMsg={error?.message}
      />
    );
  }

  const handlePopup = (message: string, type: "success" | "error") => {
    if (type === "success") refresh();
    setPopup({ message, type });
  };

  const onRoleChangeSuccess = () =>
    handlePopup("User role updated successfully!", "success");
  const onRoleChangeError = (errorMsg: string) =>
    handlePopup(`Unable to update user role - ${errorMsg}`, "error");

  // Creates the filter options and handles the state manipulation
  const renderFilters = () => (
    <div className="flex items-center gap-4 py-4">
      <Select
        value={filters.status || "all"}
        onValueChange={(value) =>
          setFilters((prev) => {
            if (value === "all") {
              const { status, ...rest } = prev;
              return rest;
            }
            return {
              ...prev,
              status: value as UserStatus.live | UserStatus.deactivated,
            };
          })
        }
      >
        <SelectTrigger className="w-[260px] h-[34px] bg-neutral">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-neutral-50">
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="live">Active</SelectItem>
          <SelectItem value="deactivated">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select value="roles">
        <SelectTrigger className="w-[260px] h-[34px] bg-neutral">
          <SelectValue>
            {filters.roles?.length
              ? `${filters.roles.length} role(s) selected`
              : "All Roles"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-neutral-50">
          {Object.entries(USER_ROLE_LABELS)
            .filter(([role]) => role !== UserRole.EXT_PERM_USER)
            .map(([role, label]) => (
              <div
                key={role}
                className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-gray-200"
                onClick={() => {
                  setFilters((prev) => {
                    const roleEnum = role as UserRole;
                    const currentRoles = prev.roles || [];

                    if (currentRoles.includes(roleEnum)) {
                      // Remove role if already selected
                      return {
                        ...prev,
                        roles: currentRoles.filter((r) => r !== roleEnum),
                      };
                    } else {
                      // Add role if not selected
                      return {
                        ...prev,
                        roles: [...currentRoles, roleEnum],
                      };
                    }
                  });
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.roles?.includes(role as UserRole) || false}
                  onChange={(e) => e.stopPropagation()}
                />
                <label className="text-sm font-normal">{label}</label>
              </div>
            ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      {renderFilters()}
      <Table className="overflow-visible">
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead className="text-center">Role</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>
              <div className="flex">
                <div className="ml-auto">Actions</div>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasNoData ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                {q ? (
                  <>No users found matching &quot;{q}&quot;</>
                ) : (
                  <>No users found</>
                )}
              </TableCell>
            </TableRow>
          ) : (
            pageOfUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell className="w-40 ">
                  <UserRoleDropdown
                    user={user}
                    onSuccess={onRoleChangeSuccess}
                    onError={onRoleChangeError}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <i>{user.status === "live" ? "Active" : "Inactive"}</i>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-x-2">
                    <DeactivateUserButton
                      user={user}
                      deactivate={user.status === UserStatus.live}
                      setPopup={setPopup}
                      refresh={refresh}
                    />
                    {user.status == UserStatus.deactivated && (
                      <DeleteUserButton
                        user={user}
                        setPopup={setPopup}
                        refresh={refresh}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={goToPage}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default SignedUpUserTable;
