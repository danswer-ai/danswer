import { EE_ENABLED } from "@/lib/constants";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!EE_ENABLED) {
    return (
      <div className="flex h-screen">
        <div className="mx-auto my-auto text-lg font-bold text-red-500">
          This funcitonality is only available in the Enterprise Edition :(
        </div>
      </div>
    );
  }

  return children;
}
