const mongoose = require("mongoose");

// Leave entry created by admin
const LeaveSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // Optional manual proxy override
    proxyDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", LeaveSchema);
