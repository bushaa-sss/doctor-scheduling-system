import { useEffect, useState } from "react";
import LeaveForm from "../components/LeaveForm";
import { api } from "../api/api";

export default function Leaves() {
  const [doctors, setDoctors] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    proxyDoctor: ""
  });

  useEffect(() => {
    api.getDoctors().then(setDoctors);
    api.getLeaves().then(setLeaves);
  }, []);

  async function handleCreate(data) {
    await api.createLeave(data);
    const list = await api.getLeaves();
    setLeaves(list);
  }

  function toInputDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function startEdit(leave) {
    setEditingId(leave._id);
    setEditForm({
      startDate: toInputDate(leave.startDate),
      endDate: toInputDate(leave.endDate),
      proxyDoctor: leave.proxyDoctor?._id || ""
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ startDate: "", endDate: "", proxyDoctor: "" });
  }

  async function handleUpdate(id) {
    await api.updateLeave(id, {
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      proxyDoctor: editForm.proxyDoctor || null
    });
    cancelEdit();
    const list = await api.getLeaves();
    setLeaves(list);
  }

  async function handleDelete(id) {
    await api.deleteLeave(id);
    const list = await api.getLeaves();
    setLeaves(list);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <LeaveForm doctors={doctors} onCreate={handleCreate} />
      <div className="rounded-lg bg-white p-4 shadow">
        <h3 className="text-lg font-semibold text-slate-800">Leaves</h3>
        <ul className="mt-3 space-y-3">
          {leaves.map((leave) => (
            <li key={leave._id} className="rounded border p-3 text-sm">
              {editingId === leave._id ? (
                <div className="space-y-3">
                  <p className="font-medium text-slate-800">{leave.doctor?.name}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      className="rounded border p-2"
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      required
                    />
                    <input
                      className="rounded border p-2"
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      required
                    />
                  </div>
                  <select
                    className="w-full rounded border p-2"
                    value={editForm.proxyDoctor}
                    onChange={(e) => setEditForm({ ...editForm, proxyDoctor: e.target.value })}
                  >
                    <option value="">Auto pick proxy</option>
                    {doctors.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUpdate(leave._id)}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs text-white"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded bg-slate-200 px-3 py-1 text-xs text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{leave.doctor?.name}</p>
                      <p className="text-slate-600">
                        {new Date(leave.startDate).toDateString()} -{" "}
                        {new Date(leave.endDate).toDateString()}
                      </p>
                      {leave.proxyDoctor && (
                        <p className="text-amber-700">Proxy: {leave.proxyDoctor?.name}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEdit(leave)}
                        className="rounded bg-amber-500 px-3 py-1 text-xs text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(leave._id)}
                        className="rounded bg-rose-600 px-3 py-1 text-xs text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
