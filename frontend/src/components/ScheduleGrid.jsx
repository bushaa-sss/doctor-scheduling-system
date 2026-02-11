function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date) {
  const d = normalizeDate(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getRotationStart(date) {
  const d = normalizeDate(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateLabel(date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

function resolveTimeLabel(entry) {
  return entry.time || "";
}

function resolveCategory(entry) {
  const dutyName = (entry.duty?.name || entry.duty || "").toLowerCase();
  if (dutyName.includes("ot")) return "emergency";
  if (dutyName.includes("ward")) return "onsite";
  if (dutyName.includes("opd")) return "remote";
  return "onsite";
}

const CATEGORY_STYLES = {
  onsite: "bg-emerald-100 text-emerald-900 border-emerald-200",
  remote: "bg-sky-100 text-sky-900 border-sky-200",
  emergency: "bg-violet-100 text-violet-900 border-violet-200",
  default: "bg-slate-100 text-slate-800 border-slate-200"
};

export default function ScheduleGrid({ schedule }) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="rounded-lg bg-white p-4 shadow">
        <h3 className="text-lg font-semibold text-slate-800">Schedule</h3>
        <p className="mt-2 text-sm text-slate-500">No schedule available.</p>
      </div>
    );
  }

  const sorted = [...schedule].sort((a, b) => new Date(a.date) - new Date(b.date));
  const startDate = sorted[0]?.weekStart ? new Date(sorted[0].weekStart) : getRotationStart(sorted[0].date);
  const days = Array.from({ length: 15 }, (_, i) => addDays(startDate, i));

  const dutyMap = new Map();
  sorted.forEach((entry) => {
    const duty = entry.duty || {};
    const dutyId = duty._id || entry.duty || duty.name;
    if (!dutyId) return;
    if (!dutyMap.has(dutyId)) {
      dutyMap.set(dutyId, {
        id: dutyId,
        name: duty.name || String(entry.duty || "Duty")
      });
    }
  });
  const duties = Array.from(dutyMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const grid = new Map();
  days.forEach((day) => {
    duties.forEach((duty) => {
      grid.set(`${toDateKey(day)}|${duty.id}`, []);
    });
  });

  sorted.forEach((entry) => {
    const entryDate = entry.date ? new Date(entry.date) : null;
    if (!entryDate) return;
    const dayKey = toDateKey(entryDate);
    if (!days.some((day) => toDateKey(day) === dayKey)) return;

    const duty = entry.duty || {};
    const dutyId = duty._id || entry.duty || duty.name;
    if (!dutyId) return;

    const key = `${dayKey}|${dutyId}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(entry);
  });

  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">On Call Schedule</h3>
          <p className="text-sm text-slate-500">15-day rotation view</p>
        </div>
        <div />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="w-44 border border-slate-200 px-3 py-2">DUTY</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="border border-slate-200 px-3 py-2">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                  <div className="text-xs text-slate-500">{formatDateLabel(day)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {duties.map((duty) => (
              <tr key={duty.id}>
                <th className="border border-slate-200 px-3 py-3 text-slate-700">
                  <div className="font-semibold">{duty.name}</div>
                </th>
                {days.map((day) => {
                  const entries = grid.get(`${toDateKey(day)}|${duty.id}`) || [];
                  return (
                    <td key={`${day.toISOString()}-${duty.id}`} className="border border-slate-200 px-2 py-2">
                      <div className="space-y-2">
                        {entries.length === 0 && (
                          <div className="text-xs text-slate-300">—</div>
                        )}
                        {entries.map((entry) => {
                          const category = resolveCategory(entry);
                          const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.default;
                          const doctorName =
                            entry.doctor?.name || entry.doctorId?.name || "Unassigned";
                          const dept = entry.department ? entry.department : "";
                          const proxyName = entry.proxyDoctor?.name || null;
                          const proxyText = entry.proxyUsed
                            ? `Proxy: ${proxyName || "TBD"}`
                            : proxyName
                              ? `Proxy: ${proxyName}`
                              : "";
                          const timeLabel = resolveTimeLabel(entry);

                          return (
                            <div
                              key={entry._id || `${doctorName}-${entry.date}`}
                              className={`rounded border px-2 py-1 ${style}`}
                            >
                              <div className="text-xs font-semibold">{doctorName}</div>
                              {timeLabel && (
                                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-800">
                                  {timeLabel}
                                </div>
                              )}
                              {dept && <div className="text-[11px] text-slate-600">{dept}</div>}
                              {proxyText && (
                                <div className="text-[10px] text-slate-500">{proxyText}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
