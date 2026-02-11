const mongoose = require("mongoose");

// Single schedule entry for a date + duty
const ScheduleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    weekStart: { type: Date, default: null },
    department: { type: String, required: true },
    duty: { type: mongoose.Schema.Types.ObjectId, ref: "Duty", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    proxyDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null },
    proxyUsed: { type: Boolean, default: false },
    isGenerated: { type: Boolean, default: false },
    isSent: { type: Boolean, default: false },
    // Admin override flags for a specific day/duty assignment
    isOverride: { type: Boolean, default: false },
    overrideBy: { type: String, default: null },
    overrideNote: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", ScheduleSchema);
