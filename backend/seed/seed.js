const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Doctor = require("../models/Doctor");
const Duty = require("../models/Duty");
const Leave = require("../models/Leave");
const { generateDepartmentSchedule, getWeekStart } = require("../utils/scheduler");

dotenv.config();

async function seed() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) throw new Error("MONGO_URI missing");

  await mongoose.connect(MONGO_URI);

  await Promise.all([
    Doctor.deleteMany({}),
    Duty.deleteMany({}),
    Leave.deleteMany({})
  ]);

  const duties = await Duty.insertMany([
    { name: "OPD", duration: 8, department: "General Medicine" },
    { name: "OT", duration: 6, department: "Surgery" },
    { name: "Ward", duration: 10, department: "General Medicine" }
  ]);

  const doctors = await Doctor.insertMany([
    {
      name: "Dr. Aisha Khan",
      email: "aisha.khan@example.com",
      specialization: "General Medicine",
      duties: [duties[0]._id, duties[2]._id],
      allowedDuties: [duties[0]._id, duties[2]._id]
    },
    {
      name: "Dr. Brian Lee",
      email: "brian.lee@example.com",
      specialization: "Surgery",
      duties: [duties[1]._id],
      allowedDuties: [duties[1]._id]
    },
    {
      name: "Dr. Carla Singh",
      email: "carla.singh@example.com",
      specialization: "General Medicine",
      duties: [duties[0]._id, duties[2]._id],
      allowedDuties: [duties[0]._id, duties[2]._id]
    }
  ]);

  const weekStart = getWeekStart(new Date());
  await generateDepartmentSchedule("General Medicine", weekStart);
  await generateDepartmentSchedule("Surgery", weekStart);

  console.log("Seed complete:");
  console.log(`- Duties: ${duties.length}`);
  console.log(`- Doctors: ${doctors.length}`);
  console.log(`- Schedule week starting: ${weekStart.toDateString()}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
