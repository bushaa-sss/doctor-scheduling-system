import { useState } from "react";

export default function DutyForm({ onCreate }) {
  const [form, setForm] = useState({ name: "", duration: "", department: "" });

  function handleSubmit(e) {
    e.preventDefault();
    onCreate({ name: form.name, duration: Number(form.duration), department: form.department });
    setForm({ name: "", duration: "", department: "" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-white p-4 shadow">
      <h3 className="text-lg font-semibold text-slate-800">Add Duty</h3>
      <input
        className="w-full rounded border p-2"
        placeholder="Duty name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <input
        className="w-full rounded border p-2"
        placeholder="Department (e.g., Surgery)"
        value={form.department}
        onChange={(e) => setForm({ ...form, department: e.target.value })}
        required
      />
      <input
        className="w-full rounded border p-2"
        placeholder="Duration (hours)"
        type="number"
        value={form.duration}
        onChange={(e) => setForm({ ...form, duration: e.target.value })}
        required
      />
      <button className="rounded bg-brand-600 px-4 py-2 text-white">Save</button>
    </form>
  );
}
