import { useMemo, useState } from "react";

export default function DoctorForm({ duties, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    specialization: "",
    duties: [],
    shiftPreferences: ""
  });

  const departments = useMemo(() => {
    const set = new Set(duties.map((duty) => duty.department).filter(Boolean));
    return Array.from(set).sort();
  }, [duties]);

  const visibleDuties = useMemo(() => {
    if (!form.specialization) return duties;
    return duties.filter((duty) => duty.department === form.specialization);
  }, [duties, form.specialization]);

  const allVisibleSelected =
    visibleDuties.length > 0 && visibleDuties.every((duty) => form.duties.includes(duty._id));

  function toggleDuty(id) {
    setForm((prev) => {
      const exists = prev.duties.includes(id);
      return { ...prev, duties: exists ? prev.duties.filter((d) => d !== id) : [...prev.duties, id] };
    });
  }

  function handleSpecializationChange(value) {
    setForm((prev) => {
      const filteredDuties = value
        ? prev.duties.filter((dutyId) =>
            duties.some((duty) => duty._id === dutyId && duty.department === value)
          )
        : prev.duties;
      return { ...prev, specialization: value, duties: filteredDuties };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      specialization: form.specialization,
      duties: form.duties,
      allowedDuties: form.duties,
      shiftPreferences: form.shiftPreferences
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    };
    onCreate(payload);
    setForm({ name: "", email: "", specialization: "", duties: [], shiftPreferences: "" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-white p-4 shadow">
      <h3 className="text-lg font-semibold text-slate-800">Add Doctor</h3>
      <input
        className="w-full rounded border p-2"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <input
        className="w-full rounded border p-2"
        placeholder="Email (optional)"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <select
        className="w-full rounded border p-2"
        value={form.specialization}
        onChange={(e) => handleSpecializationChange(e.target.value)}
        required
      >
        <option value="">Select specialization</option>
        {departments.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
      {departments.length === 0 && (
        <p className="text-xs text-slate-500">
          Add at least one duty to define departments before adding doctors.
        </p>
      )}
      <div>
        <p className="text-sm font-medium text-slate-700">Allowed Duties</p>
        {visibleDuties.length > 0 && (
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setForm((prev) => ({
                    ...prev,
                    duties: Array.from(
                      new Set([
                        ...prev.duties,
                        ...visibleDuties.map((duty) => duty._id)
                      ])
                    )
                  }));
                } else {
                  setForm((prev) => ({
                    ...prev,
                    duties: prev.duties.filter(
                      (id) => !visibleDuties.some((duty) => duty._id === id)
                    )
                  }));
                }
              }}
            />
            Select all duties in this specialization
          </label>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {visibleDuties.map((duty) => (
            <label key={duty._id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.duties.includes(duty._id)}
                onChange={() => toggleDuty(duty._id)}
              />
              {duty.name}
            </label>
          ))}
          {visibleDuties.length === 0 && (
            <p className="text-xs text-slate-500">No duties found for this specialization.</p>
          )}
        </div>
      </div>
      <input
        className="w-full rounded border p-2"
        placeholder="Shift preferences (comma separated)"
        value={form.shiftPreferences}
        onChange={(e) => setForm({ ...form, shiftPreferences: e.target.value })}
      />
      <button className="rounded bg-brand-600 px-4 py-2 text-white">Save</button>
    </form>
  );
}
