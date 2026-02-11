import { useState } from "react";

export default function LeaveForm({ doctors, onCreate }) {
  const [form, setForm] = useState({
    doctor: "",
    startDate: "",
    endDate: "",
    proxyDoctor: ""
  });

  function handleSubmit(e) {
    e.preventDefault();
    onCreate({
      doctor: form.doctor,
      startDate: form.startDate,
      endDate: form.endDate,
      proxyDoctor: form.proxyDoctor || null
    });
    setForm({ doctor: "", startDate: "", endDate: "", proxyDoctor: "" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-white p-4 shadow">
      <h3 className="text-lg font-semibold text-slate-800">Add Leave</h3>
      <select
        className="w-full rounded border p-2"
        value={form.doctor}
        onChange={(e) => setForm({ ...form, doctor: e.target.value })}
        required
      >
        <option value="">Select doctor</option>
        {doctors.map((doc) => (
          <option key={doc._id} value={doc._id}>
            {doc.name}
          </option>
        ))}
      </select>
      <input
        className="w-full rounded border p-2"
        type="date"
        placeholder="Starting date"
        value={form.startDate}
        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        required
      />
      <input
        className="w-full rounded border p-2"
        type="date"
        placeholder="Joining date"
        value={form.endDate}
        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
        required
      />
      <select
        className="w-full rounded border p-2"
        value={form.proxyDoctor}
        onChange={(e) => setForm({ ...form, proxyDoctor: e.target.value })}
      >
        <option value="">Auto pick proxy</option>
        {doctors.map((doc) => (
          <option key={doc._id} value={doc._id}>
            {doc.name}
          </option>
        ))}
      </select>
      <button className="rounded bg-brand-600 px-4 py-2 text-white">Save</button>
    </form>
  );
}
