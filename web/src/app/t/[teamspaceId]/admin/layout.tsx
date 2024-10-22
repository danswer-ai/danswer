import { Layout } from "@/components/admin/Layout";

export default async function TeamspaceAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { teamspaceId: string };
}) {
  const isTeamspace = true;
  const teamspaceId = params.teamspaceId;

  return await Layout({ children, isTeamspace, teamspaceId });
}
