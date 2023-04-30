import { Sidebar } from "@/components/admin/connectors/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar
        title="Connectors"
        collections={[
          {
            name: "Connectors",
            items: [
              { name: "Slack", link: "/admin/connectors/slack" },
              { name: "Web", link: "/admin/connectors/web" },
            ],
          },
        ]}
      />
      <div className="p-12 min-h-screen bg-gray-900 text-gray-100 w-full">
        {children}
      </div>
    </div>
  );
}
