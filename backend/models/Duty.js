const mongoose = require("mongoose");

// Duty definition like OPD/OT with a duration in hours
const DutySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    duration: { type: Number, required: true },
    // Department/specialization this duty belongs to (e.g., Surgery, Pediatrics)
    department: { type: String, required: true }
  },
  { timestamps: true }
);

DutySchema.index({ name: 1, department: 1 }, { unique: true });

module.exports = mongoose.model("Duty", DutySchema);
