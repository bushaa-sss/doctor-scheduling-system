function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
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

function formatDateLabel(date) {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch (err) {
    return String(date);
  }
}

function formatDateOnly(date) {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch (err) {
    return String(date);
  }
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

function buildRotationGrid(entries, daysCount = 15) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const startDate = sorted[0]?.weekStart
    ? new Date(sorted[0].weekStart)
    : getRotationStart(sorted[0].date);
  const days = Array.from({ length: daysCount }, (_, i) => addDays(startDate, i));

  const dutyMap = new Map();
  sorted.forEach((entry) => {
    const duty = entry.duty || {};
    const dutyId = duty._id || entry.duty || duty.name;
    if (!dutyId) return;
    if (!dutyMap.has(dutyId)) {
      dutyMap.set(dutyId, {
        id: dutyId,
        name: duty.name || String(entry.duty || "Duty"),
        department: entry.department || ""
      });
    }
  });

  const duties = Array.from(dutyMap.values());
  const nameCounts = duties.reduce((acc, duty) => {
    acc[duty.name] = (acc[duty.name] || 0) + 1;
    return acc;
  }, {});

  const dutyList = duties
    .map((duty) => ({
      ...duty,
      displayName:
        nameCounts[duty.name] > 1 && duty.department
          ? `${duty.name} (${duty.department})`
          : duty.name
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const grid = new Map();
  days.forEach((day) => {
    dutyList.forEach((duty) => {
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

  return {
    startDate,
    endDate: addDays(startDate, daysCount - 1),
    days,
    duties: dutyList,
    grid
  };
}

module.exports = {
  formatDateLabel,
  formatDateOnly,
  resolveTimeLabel,
  resolveCategory,
  buildRotationGrid,
  toDateKey
};
