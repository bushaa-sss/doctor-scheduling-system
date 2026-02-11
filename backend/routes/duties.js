const express = require("express");
const Duty = require("../models/Duty");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, department } = req.body;
    if (!name || !department) {
      return res.status(400).json({ error: "name and department are required" });
    }
    const existing = await Duty.findOne({ name, department });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Duty name already exists in this department" });
    }
    const duty = await Duty.create(req.body);
    res.status(201).json(duty);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.department) {
    filter.department = req.query.department;
  }
  const duties = await Duty.find(filter).sort({ name: 1 });
  res.json(duties);
});

router.get("/:id", async (req, res) => {
  const duty = await Duty.findById(req.params.id);
  if (!duty) return res.status(404).json({ error: "Duty not found" });
  res.json(duty);
});

router.put("/:id", async (req, res) => {
  try {
    const current = await Duty.findById(req.params.id);
    if (!current) return res.status(404).json({ error: "Duty not found" });

    const name = req.body.name || current.name;
    const department = req.body.department || current.department;
    const duplicate = await Duty.findOne({
      _id: { $ne: current._id },
      name,
      department
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ error: "Duty name already exists in this department" });
    }

    const duty = await Duty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!duty) return res.status(404).json({ error: "Duty not found" });
    res.json(duty);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const duty = await Duty.findByIdAndDelete(req.params.id);
  if (!duty) return res.status(404).json({ error: "Duty not found" });
  res.json({ message: "Duty deleted" });
});

module.exports = router;
