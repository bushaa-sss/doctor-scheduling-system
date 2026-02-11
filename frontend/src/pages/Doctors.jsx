import { useEffect, useMemo, useState } from "react";
import DoctorForm from "../components/DoctorForm";
import { api } from "../api/api";

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [duties, setDuties] = useState([]);
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    specialization: "",
    duties: [],
    shiftPreferences: ""
  });

  async function loadData() {
    const [doctorList, dutyList] = await Promise.all([api.getDoctors(), api.getDuties()]);
    setDoctors(doctorList);
    setDuties(dutyList);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(data) {
    await api.createDoctor(data);
    await loadData();
  }

  async function handleDelete(id) {
    await api.deleteDoctor(id);
    await loadData();
  }

  function startEdit(doc) {
    setEditingId(doc._id);
    setEditForm({
      name: doc.name || "",
      email: doc.email || "",
      specialization: doc.specialization || "",
      duties: (doc.allowedDuties || doc.duties || []).map((duty) => duty._id || duty),
      shiftPreferences: Array.isArray(doc.shiftPreferences)
        ? doc.shiftPreferences.join(", ")
        : ""
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", email: "", specialization: "", duties: [], shiftPreferences: "" });
  }

  function toggleEditDuty(id) {
    setEditForm((prev) => {
      const exists = prev.duties.includes(id);
      return { ...prev, duties: exists ? prev.duties.filter((d) => d !== id) : [...prev.duties, id] };
    });
  }

  function handleEditSpecializationChange(value) {
    setEditForm((prev) => {
      const filteredDuties = value
        ? prev.duties.filter((dutyId) =>
            duties.some((duty) => duty._id === dutyId && duty.department === value)
          )
        : prev.duties;
      return { ...prev, specialization: value, duties: filteredDuties };
    });
  }

  async function handleUpdate(id) {
    const payload = {
      name: editForm.name,
      email: editForm.email,
      specialization: editForm.specialization,
      duties: editForm.duties,
      allowedDuties: editForm.duties,
      shiftPreferences: editForm.shiftPreferences
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    };
    await api.updateDoctor(id, payload);
    cancelEdit();
    await loadData();
  }

  const specializations = useMemo(() => {
    const set = new Set(doctors.map((doc) => doc.specialization));
    return Array.from(set);
  }, [doctors]);

  const filteredDoctors = specializationFilter
    ? doctors.filter((doc) => doc.specialization === specializationFilter)
    : doctors;

  const editVisibleDuties = useMemo(() => {
    if (!editForm.specialization) return duties;
    return duties.filter((duty) => duty.department === editForm.specialization);
  }, [duties, editForm.specialization]);

  const editDepartments = useMemo(() => {
    const set = new Set(duties.map((duty) => duty.department).filter(Boolean));
    if (editForm.specialization) set.add(editForm.specialization);
    return Array.from(set).sort();
  }, [duties, editForm.specialization]);

  const editAllVisibleSelected =
    editVisibleDuties.length > 0 &&
    editVisibleDuties.every((duty) => editForm.duties.includes(duty._id));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <DoctorForm duties={duties} onCreate={handleCreate} />
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-800">Doctors</h3>
          <select
            className="rounded border p-2 text-sm"
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
          >
            <option value="">All Specializations</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
        <ul className="mt-3 space-y-3">
          {filteredDoctors.map((doc) => (
            <li key={doc._id} className="rounded border p-3">
              {editingId === doc._id ? (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      className="rounded border p-2"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Name"
                    />
                    <input
                      className="rounded border p-2"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Email (optional)"
                      type="email"
                    />
                    <select
                      className="rounded border p-2"
                      value={editForm.specialization}
                      onChange={(e) => handleEditSpecializationChange(e.target.value)}
                    >
                      <option value="">Select specialization</option>
                      {editDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Allowed Duties</p>
                    {editVisibleDuties.length > 0 && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={editAllVisibleSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm((prev) => ({
                                ...prev,
                                duties: Array.from(
                                  new Set([
                                    ...prev.duties,
                                    ...editVisibleDuties.map((duty) => duty._id)
                                  ])
                                )
                              }));
                            } else {
                              setEditForm((prev) => ({
                                ...prev,
                                duties: prev.duties.filter(
                                  (id) => !editVisibleDuties.some((duty) => duty._id === id)
                                )
                              }));
                            }
                          }}
                        />
                        Select all duties in this specialization
                      </label>
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {editVisibleDuties.map((duty) => (
                        <label key={duty._id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.duties.includes(duty._id)}
                            onChange={() => toggleEditDuty(duty._id)}
                          />
                          {duty.name}
                        </label>
                      ))}
                      {editVisibleDuties.length === 0 && (
                        <p className="text-xs text-slate-500">No duties found for this specialization.</p>
                      )}
                    </div>
                  </div>
                  <input
                    className="rounded border p-2"
                    value={editForm.shiftPreferences}
                    onChange={(e) => setEditForm({ ...editForm, shiftPreferences: e.target.value })}
                    placeholder="Shift preferences (comma separated)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUpdate(doc._id)}
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
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{doc.name}</p>
                      <p className="text-sm text-slate-600">{doc.specialization}</p>
                      {doc.email && <p className="text-xs text-slate-500">{doc.email}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEdit(doc)}
                        className="rounded bg-amber-500 px-3 py-1 text-xs text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="rounded bg-rose-600 px-3 py-1 text-xs text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {doc.duties?.map((duty) => (
                      <span key={duty._id} className="rounded bg-slate-100 px-2 py-1">
                        {duty.name}
                      </span>
                    ))}
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
