import { Layout } from "@/components/adminPageComponents/Layout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return await Layout({ children });
}
