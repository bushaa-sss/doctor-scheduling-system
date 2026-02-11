const Doctor = require("../models/Doctor");
const Duty = require("../models/Duty");
const Schedule = require("../models/Schedule");
const Leave = require("../models/Leave");
const { notifyDoctor } = require("../utils/notifications");

const OT_DUTY_NAME = "ot";
const ROTATION_DAYS = 15;

function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date) {
  const d = normalizeDate(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekStart(date) {
  const d = normalizeDate(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(weekStart) {
  const end = addDays(weekStart, ROTATION_DAYS - 1);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getWeekIndex(weekStart) {
  // 2024-01-01 is a Monday; use it as stable epoch
  const epoch = new Date("2024-01-01T00:00:00");
  const ms = weekStart.getTime() - epoch.getTime();
  return Math.floor(ms / (ROTATION_DAYS * 24 * 60 * 60 * 1000));
}

function getAllowedDutyIds(doctor) {
  const raw = Array.isArray(doctor.allowedDuties) && doctor.allowedDuties.length > 0
    ? doctor.allowedDuties
    : doctor.duties || [];
  return new Set(raw.map((id) => id.toString()));
}

function buildEligibleDoctorsByDuty(duties, doctors) {
  const map = new Map();

  duties.forEach((duty) => {
    const eligible = doctors.filter((doc) => {
      const allowed = getAllowedDutyIds(doc);
      return allowed.size === 0 || allowed.has(duty._id.toString());
    });

    eligible.sort((a, b) => a.name.localeCompare(b.name));
    map.set(duty._id.toString(), eligible);
  });

  return map;
}

function buildLeaveMap(leaves, days) {
  const map = new Map();
  days.forEach((day) => map.set(toDateKey(day), new Set()));

  leaves.forEach((leave) => {
    days.forEach((day) => {
      const dayKey = toDateKey(day);
      const start = normalizeDate(leave.startDate);
      const end = normalizeDate(leave.endDate);
      if (day >= start && day <= end) {
        map.get(dayKey).add(leave.doctor.toString());
      }
    });
  });

  return map;
}

function buildOverrideMaps(overrides) {
  const byKey = new Map();
  const byDate = new Map();

  overrides.forEach((entry) => {
    const dateKey = toDateKey(entry.date);
    const dutyId = entry.duty?._id ? entry.duty._id.toString() : entry.duty.toString();
    const key = `${dateKey}|${dutyId}`;
    byKey.set(key, entry);

    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey).push(entry);
  });

  return { byKey, byDate };
}

function isOtDuty(dutyName) {
  return (dutyName || "").toLowerCase() === OT_DUTY_NAME;
}

function isDoctorOnLeave(doctorId, day, leaveMap) {
  return leaveMap.get(toDateKey(day))?.has(doctorId) || false;
}

function isDoctorAvailable(doc, day, duty, leaveMap, assignedToday, lastAssignmentByDoctor) {
  const docId = doc._id.toString();
  if (assignedToday.has(docId)) return false;
  if (isDoctorOnLeave(docId, day, leaveMap)) return false;

  const last = lastAssignmentByDoctor.get(docId);
  if (last) {
    const prevDateKey = toDateKey(addDays(day, -1));
    if (last.dateKey === prevDateKey && last.dutyId === duty._id.toString()) {
      return false;
    }
    if (isOtDuty(duty.name) && last.dateKey === prevDateKey && last.dutyName === OT_DUTY_NAME) {
      return false;
    }
  }

  return true;
}

function findBackupDoctor(original, doctors, day, duty, leaveMap, assignedToday, lastAssignmentByDoctor, startIndex = 0) {
  if (!doctors.length) return null;
  const originalId = original?._id?.toString();

  for (let i = 0; i < doctors.length; i += 1) {
    const candidate = doctors[(startIndex + i) % doctors.length];
    const candidateId = candidate._id.toString();
    if (candidateId === originalId) continue;
    if (isDoctorAvailable(candidate, day, duty, leaveMap, assignedToday, lastAssignmentByDoctor)) {
      return { doctor: candidate, nextIndex: (startIndex + i + 1) % doctors.length };
    }
  }

  return null;
}

function findBackupDoctorRelaxed(original, doctors, day, leaveMap, startIndex = 0) {
  if (!doctors.length) return null;
  const originalId = original?._id?.toString();

  for (let i = 0; i < doctors.length; i += 1) {
    const candidate = doctors[(startIndex + i) % doctors.length];
    const candidateId = candidate._id.toString();
    if (candidateId === originalId) continue;
    if (!isDoctorOnLeave(candidateId, day, leaveMap)) {
      return { doctor: candidate, nextIndex: (startIndex + i + 1) % doctors.length };
    }
  }

  return null;
}

function selectPrimaryCandidate({
  doctors,
  rotationIndex,
  day,
  duty,
  leaveMap,
  assignedPrimaryToday,
  assignedWorkingToday,
  lastAssignmentByDoctor
}) {
  if (!doctors.length) return null;

  for (let i = 0; i < doctors.length; i += 1) {
    const candidate = doctors[(rotationIndex + i) % doctors.length];
    const id = candidate._id.toString();

    if (assignedPrimaryToday.has(id)) continue;

    if (isDoctorOnLeave(id, day, leaveMap)) {
      return { doctor: candidate, onLeave: true, nextIndex: (rotationIndex + i + 1) % doctors.length };
    }

    if (isDoctorAvailable(candidate, day, duty, leaveMap, assignedWorkingToday, lastAssignmentByDoctor)) {
      return { doctor: candidate, onLeave: false, nextIndex: (rotationIndex + i + 1) % doctors.length };
    }
  }

  return null;
}

function assignDutyWithBackup(day, duty, doctors, leaveMap, options) {
  const {
    rotationIndex,
    proxyRotationIndex,
    assignedPrimaryToday,
    assignedWorkingToday,
    lastAssignmentByDoctor,
    allowDoubleDutyFallback = true
  } = options;

  const primarySelection = selectPrimaryCandidate({
    doctors,
    rotationIndex,
    day,
    duty,
    leaveMap,
    assignedPrimaryToday,
    assignedWorkingToday,
    lastAssignmentByDoctor
  });
  if (!primarySelection) {
    return { warning: `No primary doctor for ${duty.name} on ${toDateKey(day)}` };
  }

  const primaryDoctor = primarySelection.doctor;
  const primaryId = primaryDoctor._id.toString();

  assignedPrimaryToday.add(primaryId);

  let workingDoctor = null;
  let proxyDoctor = null;
  let proxyUsed = false;
  let nextProxyIndex = proxyRotationIndex;
  let warning = null;

  if (primarySelection.onLeave) {
    const backupSelection = findBackupDoctor(
      primaryDoctor,
      doctors,
      day,
      duty,
      leaveMap,
      assignedWorkingToday,
      lastAssignmentByDoctor,
      proxyRotationIndex
    );

    if (backupSelection) {
      proxyDoctor = backupSelection.doctor;
      workingDoctor = proxyDoctor;
      proxyUsed = true;
      nextProxyIndex = backupSelection.nextIndex;
    } else if (allowDoubleDutyFallback) {
      const relaxedSelection = findBackupDoctorRelaxed(
        primaryDoctor,
        doctors,
        day,
        leaveMap,
        proxyRotationIndex
      );
      if (relaxedSelection) {
        proxyDoctor = relaxedSelection.doctor;
        workingDoctor = proxyDoctor;
        proxyUsed = true;
        nextProxyIndex = relaxedSelection.nextIndex;
        warning = `Fallback proxy assigned for ${duty.name} on ${toDateKey(day)} (doctor already assigned)`;
      } else {
        warning = `No available proxy for ${duty.name} on ${toDateKey(day)}`;
      }
    } else {
      warning = `No available proxy for ${duty.name} on ${toDateKey(day)}`;
    }
  } else {
    workingDoctor = primaryDoctor;
  }

  if (workingDoctor) {
    assignedWorkingToday.add(workingDoctor._id.toString());
    lastAssignmentByDoctor.set(workingDoctor._id.toString(), {
      dutyId: duty._id.toString(),
      dutyName: (duty.name || "").toLowerCase(),
      dateKey: toDateKey(day)
    });
  }

  return {
    primaryDoctor,
    proxyDoctor,
    workingDoctor,
    proxyUsed,
    nextPrimaryIndex: primarySelection.nextIndex,
    nextProxyIndex,
    warning
  };
}

async function getSchedulesByWeek(weekStartDate, department) {
  const weekStart = getWeekStart(weekStartDate);
  const weekEnd = getWeekEnd(weekStart);

  const filter = { date: { $gte: weekStart, $lte: weekEnd } };
  if (department) filter.department = department;

  const schedules = await Schedule.find(filter)
    .populate("duty")
    .populate("doctor")
    .populate("doctorId")
    .populate("proxyDoctor")
    .sort({ date: 1 });

  return { weekStart, weekEnd, schedules };
}

async function generateDepartmentScheduleFromData({
  departmentName,
  weekStartDate,
  duties,
  doctors,
  leaves,
  overrides
}) {
  if (!departmentName) {
    throw new Error("Department is required for rotation");
  }

  const weekStart = getWeekStart(weekStartDate);
  const weekEnd = getWeekEnd(weekStart);
  const days = Array.from({ length: ROTATION_DAYS }, (_, i) => addDays(weekStart, i));
  const weekIndex = getWeekIndex(weekStart);

  const leaveMap = buildLeaveMap(leaves, days);
  const eligibleByDuty = buildEligibleDoctorsByDuty(duties, doctors);
  const { byKey: overrideMap, byDate: overridesByDate } = buildOverrideMaps(overrides);

  const rotationPointers = new Map();
  const proxyRotationPointers = new Map();
  duties.forEach((duty, dutyIndex) => {
    const eligible = eligibleByDuty.get(duty._id.toString()) || [];
    rotationPointers.set(duty._id.toString(), eligible.length ? (weekIndex + dutyIndex) % eligible.length : 0);
    proxyRotationPointers.set(duty._id.toString(), eligible.length ? (weekIndex + dutyIndex + 1) % eligible.length : 0);
  });

  const lastAssignmentByDoctor = new Map();
  const schedulesToCreate = [];
  const notifications = [];
  const warnings = [];

  for (const day of days) {
    const dateKey = toDateKey(day);
    const assignedPrimaryToday = new Set();
    const assignedWorkingToday = new Set();

    const overrideEntries = overridesByDate.get(dateKey) || [];
    overrideEntries.forEach((entry) => {
      if (entry.doctor) {
        assignedPrimaryToday.add(entry.doctor.toString());
      }
      if (entry.proxyDoctor) {
        assignedWorkingToday.add(entry.proxyDoctor.toString());
      } else if (entry.doctor && entry.proxyUsed !== true) {
        assignedWorkingToday.add(entry.doctor.toString());
      }
    });

    for (const duty of duties) {
      const overrideKey = `${dateKey}|${duty._id.toString()}`;
      if (overrideMap.has(overrideKey)) continue;

      const eligibleDoctors = eligibleByDuty.get(duty._id.toString()) || [];
      if (eligibleDoctors.length === 0) {
        warnings.push(`No eligible doctors for ${duty.name} in ${departmentName}`);
        continue;
      }

      const rotationIndex = rotationPointers.get(duty._id.toString()) || 0;
      const proxyIndex = proxyRotationPointers.get(duty._id.toString()) || 0;

      const assignment = assignDutyWithBackup(day, duty, eligibleDoctors, leaveMap, {
        rotationIndex,
        proxyRotationIndex: proxyIndex,
        assignedPrimaryToday,
        assignedWorkingToday,
        lastAssignmentByDoctor
      });

      if (assignment.warning) warnings.push(assignment.warning);

      rotationPointers.set(duty._id.toString(), assignment.nextPrimaryIndex || rotationIndex);
      proxyRotationPointers.set(duty._id.toString(), assignment.nextProxyIndex || proxyIndex);

      if (!assignment.primaryDoctor) continue;

      schedulesToCreate.push({
        date: day,
        weekStart,
        department: departmentName,
        duty: duty._id,
        doctor: assignment.primaryDoctor._id,
        doctorId: assignment.primaryDoctor._id,
        proxyDoctor: assignment.proxyDoctor ? assignment.proxyDoctor._id : null,
        proxyUsed: Boolean(assignment.proxyDoctor),
        isGenerated: true,
        isSent: false,
        isOverride: false
      });

      const dateLabel = day.toDateString();
      if (assignment.proxyDoctor) {
        notifications.push(
          notifyDoctor(assignment.proxyDoctor, {
            title: "Proxy Assignment",
            body: `You are covering ${duty.name} for ${assignment.primaryDoctor.name} on ${dateLabel}.`
          })
        );
        notifications.push(
          notifyDoctor(assignment.primaryDoctor, {
            title: "Proxy Assigned",
            body: `${assignment.proxyDoctor.name} will cover your ${duty.name} on ${dateLabel}.`
          })
        );
      } else {
        notifications.push(
          notifyDoctor(assignment.primaryDoctor, {
            title: "Schedule Assigned",
            body: `You are scheduled for ${duty.name} on ${dateLabel}.`
          })
        );
      }
    }
  }

  await Schedule.deleteMany({
    date: { $gte: weekStart, $lte: weekEnd },
    department: departmentName,
    isOverride: false
  });

  if (schedulesToCreate.length > 0) {
    await Schedule.insertMany(schedulesToCreate);
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications);
  }

  const finalSchedules = await Schedule.find({
    date: { $gte: weekStart, $lte: weekEnd },
    department: departmentName
  })
    .populate("duty")
    .populate("doctor")
    .populate("doctorId")
    .populate("proxyDoctor")
    .sort({ date: 1 });

  return {
    weekStart,
    weekEnd,
    department: departmentName,
    count: finalSchedules.length,
    warnings,
    schedules: finalSchedules
  };
}

// Generates a 15-day schedule for a department using DB data.
async function generateDepartmentSchedule(departmentName, weekStartDate) {
  const weekStart = getWeekStart(weekStartDate);
  const weekEnd = getWeekEnd(weekStart);

  const [duties, doctors] = await Promise.all([
    Duty.find({ department: departmentName }).sort({ name: 1 }),
    Doctor.find({ specialization: departmentName }).sort({ name: 1 })
  ]);

  const doctorIds = doctors.map((doc) => doc._id);

  const [leaves, overrides] = await Promise.all([
    Leave.find({
      doctor: { $in: doctorIds },
      $or: [
        { startDate: { $lte: weekEnd } },
        { endDate: { $gte: weekStart } }
      ]
    }),
    Schedule.find({
      date: { $gte: weekStart, $lte: weekEnd },
      department: departmentName,
      isOverride: true
    }).populate("duty")
  ]);

  return generateDepartmentScheduleFromData({
    departmentName,
    weekStartDate,
    duties,
    doctors,
    leaves,
    overrides
  });
}

module.exports = {
  getWeekStart,
  getWeekEnd,
  getSchedulesByWeek,
  isDoctorAvailable,
  findBackupDoctor,
  assignDutyWithBackup,
  generateDepartmentSchedule,
  generateDepartmentScheduleFromData
};
