const express = require("express");
const Leave = require("../models/Leave");
const Doctor = require("../models/Doctor");
const { generateDepartmentSchedule } = require("../utils/scheduler");
const { notifyDoctor } = require("../utils/notifications");

const router = express.Router();

async function regenerateForLeave(leave) {
  const doctor = await Doctor.findById(leave.doctor);
  if (!doctor) return;

  // Regenerate schedules for the week of start and end date (department-specific)
  await generateDepartmentSchedule(doctor.specialization, leave.startDate);
  await generateDepartmentSchedule(doctor.specialization, leave.endDate);
}

router.post("/", async (req, res) => {
  try {
    const leave = await Leave.create(req.body);
    await regenerateForLeave(leave);
    res.status(201).json(leave);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  const leaves = await Leave.find().populate("doctor").populate("proxyDoctor");
  res.json(leaves);
});

router.get("/:id", async (req, res) => {
  const leave = await Leave.findById(req.params.id).populate("doctor").populate("proxyDoctor");
  if (!leave) return res.status(404).json({ error: "Leave not found" });
  res.json(leave);
});

router.put("/:id", async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    await regenerateForLeave(leave);
    res.json(leave);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const leave = await Leave.findByIdAndDelete(req.params.id);
  if (!leave) return res.status(404).json({ error: "Leave not found" });

  await regenerateForLeave(leave);

  const doctor = await Doctor.findById(leave.doctor);
  await notifyDoctor(doctor, {
    title: "Schedule Resumed",
    body: "Your leave ended and your duties are back on rotation."
  });

  res.json({ message: "Leave deleted" });
});

module.exports = router;
