import { Card, CardContent } from "@/components/ui/card";
import { Database, Globe, User } from "lucide-react";

function Slider({
  bg = "primary",
  value = 0,
}: {
  bg?: string;
  value?: number;
}) {
  return (
    <div className="w-full h-2 relative rounded-pill bg-secondary-100">
      <div
        className={`absolute left-0 h-full rounded-pill bg-${bg}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function Usage() {
  return (
    <div className="mt-8 w-full">
      <div>
        <h2 className="font-bold text:lg md:text-xl">Usage</h2>
        <p className="text-sm">
          Tracks and manages how tools and resources are used within the
          workspace, ensuring efficient operation and consistent performance for
          all users
        </p>
      </div>

      <div className="w-full grid grid-cols-2 gap-6 mt-8">
        <Card>
          <CardContent className="space-y-2">
            <div className="bg-secondary-100 inline-block p-2 rounded-sm">
              <Database className="stroke-secondary" />
            </div>
            <div>
              <h3 className="pt-2">Embedding Storage</h3>
              <span className="text-sm text-subtle">2323 items</span>
            </div>
            <Slider bg="secondary" value={50} />

            <p className="text-sm text-subtle font-medium">20 GB 0f 300 GB</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <div className="bg-brand-100 inline-block p-2 rounded-sm">
              <Globe className="stroke-primary" />
            </div>
            <div>
              <h3 className="pt-2">Embedding Storage</h3>
              <span className="text-sm text-subtle">2323 items</span>
            </div>
            <Slider value={50} />
            <p className="text-sm text-subtle font-medium">20 GB 0f 300 GB</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <div className="bg-success-500-100 inline-block p-2 rounded-sm">
              <User className="stroke-success" />
            </div>
            <div>
              <h3 className="pt-2">Embedding Storage</h3>
              <span className="text-sm text-subtle">2323 items</span>
            </div>
            <Slider bg="success" value={50} />
            <p className="text-sm text-subtle font-medium">20 GB 0f 300 GB</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
