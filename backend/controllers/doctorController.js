const Doctor = require("../models/Doctor");
const Duty = require("../models/Duty");

async function validateDutiesMatchSpecialization(specialization, dutyIds = []) {
  if (!specialization || !Array.isArray(dutyIds) || dutyIds.length === 0) return;

  const duties = await Duty.find({ _id: { $in: dutyIds } }).select("department");
  if (duties.length !== dutyIds.length) {
    throw new Error("One or more duties are invalid");
  }

  const mismatch = duties.find((duty) => duty.department !== specialization);
  if (mismatch) {
    throw new Error("Doctor can only be assigned duties within their specialization");
  }
}

// Create a new doctor
async function createDoctor(req, res) {
  try {
    const { specialization, duties = [], allowedDuties = [] } = req.body;
    await validateDutiesMatchSpecialization(specialization, duties);
    await validateDutiesMatchSpecialization(specialization, allowedDuties);

    const doctor = await Doctor.create(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// List all doctors (optionally filtered by specialization)
async function getDoctors(req, res) {
  const filter = {};
  if (req.query.specialization) {
    filter.specialization = req.query.specialization;
  }

  const doctors = await Doctor.find(filter).populate("duties").populate("allowedDuties");
  res.json(doctors);
}

// Get single doctor
async function getDoctor(req, res) {
  const doctor = await Doctor.findById(req.params.id).populate("duties").populate("allowedDuties");
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });
  res.json(doctor);
}

// Update doctor
async function updateDoctor(req, res) {
  try {
    const existing = await Doctor.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Doctor not found" });

    const specialization = req.body.specialization || existing.specialization;
    const duties = req.body.duties || existing.duties;
    const allowedDuties = req.body.allowedDuties || existing.allowedDuties;

    await validateDutiesMatchSpecialization(specialization, duties);
    await validateDutiesMatchSpecialization(specialization, allowedDuties);

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Delete doctor
async function deleteDoctor(req, res) {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });
  res.json({ message: "Doctor deleted" });
}

// Save PushSubscription for a doctor
async function savePushSubscription(req, res) {
  try {
    const { id } = req.params;
    const { pushSubscription } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { pushSubscription },
      { new: true }
    );
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res.json({ message: "Subscription saved", doctor });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  createDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  savePushSubscription
};
