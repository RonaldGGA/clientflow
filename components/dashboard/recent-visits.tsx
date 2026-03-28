interface RecentVisit {
  id: string;
  clientName: string;
  serviceName: string;
  actualPrice: number;
  createdAt: string;
}

interface RecentVisitsProps {
  visits: RecentVisit[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function RecentVisits({ visits }: RecentVisitsProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-medium text-zinc-400">Recent visits</h2>

      {visits.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-600">
          No visits recorded yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="pb-3 text-left font-medium text-zinc-500">
                  Client
                </th>
                <th className="pb-3 text-left font-medium text-zinc-500">
                  Service
                </th>
                <th className="pb-3 text-right font-medium text-zinc-500">
                  Price
                </th>
                <th className="pb-3 text-right font-medium text-zinc-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {visits.map((visit) => (
                <tr key={visit.id} className="group">
                  <td className="py-3 font-medium text-white">
                    {visit.clientName}
                  </td>
                  <td className="py-3 text-zinc-400">{visit.serviceName}</td>
                  <td className="py-3 text-right font-medium text-emerald-400">
                    {formatPrice(visit.actualPrice)}
                  </td>
                  <td className="py-3 text-right text-zinc-500">
                    {formatDate(visit.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
