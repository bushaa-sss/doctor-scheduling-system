import { useEffect, useState } from "react";
import DutyForm from "../components/DutyForm";
import { api } from "../api/api";

export default function Duties() {
  const [duties, setDuties] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", duration: "", department: "" });

  async function loadData() {
    const list = await api.getDuties();
    setDuties(list);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(data) {
    await api.createDuty(data);
    await loadData();
  }

  async function handleDelete(id) {
    await api.deleteDuty(id);
    await loadData();
  }

  function startEdit(duty) {
    setEditingId(duty._id);
    setEditForm({
      name: duty.name || "",
      duration: duty.duration ?? "",
      department: duty.department || ""
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", duration: "", department: "" });
  }

  async function handleUpdate(id) {
    await api.updateDuty(id, {
      name: editForm.name,
      duration: Number(editForm.duration),
      department: editForm.department
    });
    cancelEdit();
    await loadData();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <DutyForm onCreate={handleCreate} />
      <div className="rounded-lg bg-white p-4 shadow">
        <h3 className="text-lg font-semibold text-slate-800">Duties</h3>
        <ul className="mt-3 space-y-3">
          {duties.map((duty) => (
            <li key={duty._id} className="rounded border p-3">
              {editingId === duty._id ? (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      className="rounded border p-2"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Duty name"
                    />
                    <input
                      className="rounded border p-2"
                      type="number"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                      placeholder="Duration"
                    />
                    <input
                      className="rounded border p-2"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      placeholder="Department"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUpdate(duty._id)}
                      className="rounded bg-emerald-600 px-3 py-1 text-sm text-white"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded bg-slate-200 px-3 py-1 text-sm text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{duty.name}</p>
                    <p className="text-sm text-slate-600">Duration: {duty.duration} hrs</p>
                    <p className="text-sm text-slate-500">Department: {duty.department}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => startEdit(duty)}
                      className="rounded bg-amber-500 px-3 py-1 text-xs text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(duty._id)}
                      className="rounded bg-rose-600 px-3 py-1 text-xs text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
