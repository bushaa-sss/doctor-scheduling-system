export default function ScheduleView({ schedule }) {
  const grouped = schedule.reduce((acc, item) => {
    const dateKey = new Date(item.date).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  const dates = Object.keys(grouped);

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="text-lg font-semibold text-slate-800">Schedule</h3>
      {dates.length === 0 && <p className="mt-2 text-sm text-slate-500">No schedule available.</p>}
      <div className="mt-3 space-y-4">
        {dates.map((date) => (
          <div key={date} className="rounded border border-slate-100 p-3">
            <p className="text-sm font-semibold text-slate-700">{date}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {grouped[date].map((item) => (
                <li key={item._id} className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-1">{item.duty?.name}</span>
                  <span className="text-slate-700">
                    {item.doctor?.name || "Unassigned"}
                    {item.proxyUsed ? " (On Leave)" : ""}
                  </span>
                  {item.proxyDoctor && (
                    <span className="rounded bg-amber-100 px-2 py-1 text-amber-800">
                      (Proxy: {item.proxyDoctor?.name})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
