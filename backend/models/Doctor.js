const mongoose = require("mongoose");

// Doctor profile and scheduling preferences
const DoctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, default: "" },
    specialization: { type: String, required: true },
    // Backward-compatible list of duties a doctor can do
    duties: [{ type: mongoose.Schema.Types.ObjectId, ref: "Duty" }],
    // Preferred explicit list of allowed duties for scheduling
    allowedDuties: [{ type: mongoose.Schema.Types.ObjectId, ref: "Duty" }],
    shiftPreferences: [{ type: String }],
    // Stores the browser's PushSubscription JSON for Web Push
    pushSubscription: { type: Object, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", DoctorSchema);
