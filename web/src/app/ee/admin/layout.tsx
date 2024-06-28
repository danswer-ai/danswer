/* Duplicate of `/app/admin/layout.tsx */

import { SharedServerLayout } from "@/components/admin/SharedServerLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return await SharedServerLayout({ children });
}
