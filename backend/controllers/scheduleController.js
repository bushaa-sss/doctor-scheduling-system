const ExcelJS = require("exceljs");
const Schedule = require("../models/Schedule");
const { sendGmailMessage } = require("../utils/gmailService");
const { getWeekStart, getSchedulesByWeek, generateDepartmentSchedule } = require("../utils/scheduler");
const {
  buildRotationGrid,
  formatDateLabel,
  formatDateOnly,
  resolveTimeLabel,
  resolveCategory,
  toDateKey
} = require("../utils/scheduleGrid");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeFilePart(value) {
  return String(value || "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

async function getLatestWeekStartForDepartment(department, weekStartOverride) {
  if (weekStartOverride) {
    const overrideDate = new Date(weekStartOverride);
    if (!Number.isNaN(overrideDate.getTime())) {
      overrideDate.setHours(0, 0, 0, 0);
      return overrideDate;
    }
  }
  const latest = await Schedule.findOne({
    department,
    isGenerated: true,
    weekStart: { $ne: null }
  })
    .sort({ weekStart: -1, date: -1 })
    .select("weekStart");

  if (latest?.weekStart) return latest.weekStart;

  const latestByDate = await Schedule.findOne({ department, isGenerated: true })
    .sort({ date: -1 })
    .select("date");
  if (!latestByDate?.date) return null;
  return getWeekStart(latestByDate.date);
}

function buildGridEmailHtml(gridData) {
  if (!gridData) return "<p>No schedule entries available.</p>";

  const { days, duties, grid, startDate, endDate } = gridData;

  const headerCells = days
    .map(
      (day) => `
        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left; background: #f8fafc;">
          ${escapeHtml(day.toLocaleDateString("en-US", { weekday: "short" }))}<br/>
          <span style="color:#64748b; font-size: 12px;">${escapeHtml(formatDateOnly(day))}</span>
        </th>
      `
    )
    .join("");

  const rows = duties
    .map((duty) => {
      const cells = days
        .map((day) => {
          const key = `${toDateKey(day)}|${duty.id}`;
          const entries = grid.get(key) || [];
          if (entries.length === 0) {
            return `<td style="border: 1px solid #e2e8f0; padding: 8px; color: #cbd5f5; font-size: 12px;">—</td>`;
          }

          const blocks = entries
            .map((entry) => {
              const doctorName = entry.doctorId?.name || entry.doctor?.name || "Unassigned";
              const department = entry.department || "";
              const proxyName = entry.proxyDoctor?.name || (entry.proxyUsed ? "TBD" : "");
              const timeLabel = resolveTimeLabel(entry);
              const category = resolveCategory(entry);
              const colorMap = {
                onsite: "#d1fae5",
                remote: "#dbeafe",
                emergency: "#ede9fe",
                default: "#e2e8f0"
              };
              const bg = colorMap[category] || colorMap.default;

              return `
                <div style="background:${bg}; border:1px solid #e2e8f0; border-radius:6px; padding:6px; margin-bottom:6px;">
                  <div style="font-weight:600; font-size:12px;">${escapeHtml(doctorName)}</div>
                  ${
                    timeLabel
                      ? `<div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; font-weight:700;">
                    ${escapeHtml(timeLabel)}
                  </div>`
                      : ""
                  }
                  ${department ? `<div style="font-size:11px; color:#64748b;">${escapeHtml(department)}</div>` : ""}
                  ${proxyName ? `<div style="font-size:10px; color:#64748b;">Proxy: ${escapeHtml(proxyName)}</div>` : ""}
                </div>
              `;
            })
            .join("");

          return `<td style="border: 1px solid #e2e8f0; padding: 6px; vertical-align: top;">${blocks}</td>`;
        })
        .join("");

      return `
        <tr>
          <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left; background: #f8fafc;">
            ${escapeHtml(duty.displayName || duty.name)}
          </th>
          ${cells}
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">On Call Schedule</h2>
      <p style="margin-top: 0; color: #475569;">
        ${escapeHtml(formatDateLabel(startDate))} - ${escapeHtml(formatDateLabel(endDate))}
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr>
            <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left; background: #f8fafc;">
              Duty
            </th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// API: generate or regenerate schedule for a given week + department
async function generateSchedule(req, res) {
  try {
    const { department, startDate } = req.body;
    if (!department) {
      return res.status(400).json({ error: "department is required" });
    }
    const result = await generateDepartmentSchedule(department, startDate || new Date());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// CRUD: list schedules by week (optionally filtered by department)
async function getSchedules(req, res) {
  const start = req.query.start ? new Date(req.query.start) : new Date();
  const startDate = getWeekStart(start);
  const department = req.query.department || undefined;
  const result = await getSchedulesByWeek(startDate, department);
  const schedules = result.schedules.map((entry) => ({
    ...entry.toObject(),
    proxyUsed: Boolean(entry.proxyDoctor)
  }));
  res.json(schedules);
}

async function createSchedule(req, res) {
  try {
    const payload = {
      ...req.body,
      proxyUsed: Boolean(req.body.proxyDoctor)
    };
    if (payload.doctor && !payload.doctorId) payload.doctorId = payload.doctor;
    if (payload.doctorId && !payload.doctor) payload.doctor = payload.doctorId;
    if (payload.date) payload.weekStart = getWeekStart(payload.date);
    const schedule = await Schedule.create(payload);
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function updateSchedule(req, res) {
  try {
    const updates = { ...req.body };
    if (updates.doctor && !updates.doctorId) updates.doctorId = updates.doctor;
    if (updates.doctorId && !updates.doctor) updates.doctor = updates.doctorId;
    if (updates.date) updates.weekStart = getWeekStart(updates.date);
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    res.json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function deleteSchedule(req, res) {
  const schedule = await Schedule.findByIdAndDelete(req.params.id);
  if (!schedule) return res.status(404).json({ error: "Schedule not found" });
  res.json({ message: "Schedule deleted" });
}

// Admin override for a specific date + duty
async function overrideSchedule(req, res) {
  try {
    const { date, duty, doctor, proxyDoctor, overrideBy, overrideNote, department } = req.body;
    if (!date || !duty || !doctor || !department) {
      return res.status(400).json({ error: "date, duty, doctor, and department are required" });
    }

    const overrideDate = new Date(date);
    overrideDate.setHours(0, 0, 0, 0);

    const payload = {
      date: overrideDate,
      weekStart: getWeekStart(overrideDate),
      department,
      duty,
      doctor,
      doctorId: doctor,
      proxyDoctor: proxyDoctor || null,
      proxyUsed: Boolean(proxyDoctor),
      isOverride: true,
      overrideBy: overrideBy || "admin",
      overrideNote: overrideNote || null
    };

    const schedule = await Schedule.findOneAndUpdate(
      { date: overrideDate, duty, department },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Notify doctors about override/proxy
    const Doctor = require("../models/Doctor");
    const { notifyDoctor } = require("../utils/notifications");
    const primaryDoctor = await Doctor.findById(doctor);
    const proxyDoc = proxyDoctor ? await Doctor.findById(proxyDoctor) : null;
    const dateLabel = overrideDate.toDateString();

    if (proxyDoc) {
      await notifyDoctor(proxyDoc, {
        title: "Proxy Assignment",
        body: `You are covering duty on ${dateLabel}.`
      });
      await notifyDoctor(primaryDoctor, {
        title: "Proxy Assigned",
        body: `${proxyDoc.name} will cover your duty on ${dateLabel}.`
      });
    } else if (primaryDoctor) {
      await notifyDoctor(primaryDoctor, {
        title: "Schedule Updated",
        body: `You are assigned a duty on ${dateLabel}.`
      });
    }

    res.json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Send full generated schedule to doctors (email)
async function sendGeneratedSchedule(req, res) {
  try {
    const { department, weekStart: requestedWeekStart } = req.body;
    if (!department) {
      return res.status(400).json({ error: "department is required" });
    }

    const weekStart = await getLatestWeekStartForDepartment(department, requestedWeekStart);
    if (!weekStart) {
      return res.status(404).json({ error: "No generated schedules found for department." });
    }

    const generated = await Schedule.find({
      department,
      weekStart,
      isGenerated: true,
      isSent: false
    })
      .populate("duty")
      .populate("doctor")
      .populate("doctorId")
      .populate("proxyDoctor")
      .sort({ date: 1 });

    if (generated.length === 0) {
      return res.status(404).json({ error: "No generated schedules to send." });
    }

    const doctorMap = new Map();
    const missingEmailDoctors = [];

    generated.forEach((entry) => {
      const doc = entry.doctorId || entry.doctor;
      if (!doc) return;
      doctorMap.set(doc._id.toString(), doc);
    });

    if (doctorMap.size === 0) {
      return res.status(400).json({ error: "No doctors found for generated schedules." });
    }
    const recipients = Array.from(doctorMap.values()).filter((doc) => doc.email);
    doctorMap.forEach((doc) => {
      if (!doc.email) {
        missingEmailDoctors.push({
          doctorId: doc._id,
          name: doc.name,
          email: "",
          status: "missing",
          error: "Missing email"
        });
      }
    });
    if (recipients.length === 0) {
      return res.status(400).json({
        error: "No doctors with email found in generated schedules.",
        failures: missingEmailDoctors,
        failed: missingEmailDoctors.length,
        sent: 0
      });
    }

    const minDate = generated.reduce(
      (min, entry) => (entry.date < min ? entry.date : min),
      generated[0].date
    );
    const maxDate = generated.reduce(
      (max, entry) => (entry.date > max ? entry.date : max),
      generated[0].date
    );

    const scheduleForEmail = await Schedule.find({
      department,
      weekStart
    })
      .populate("duty")
      .populate("doctor")
      .populate("doctorId")
      .populate("proxyDoctor")
      .sort({ date: 1 });

    const gridData = buildRotationGrid(
      scheduleForEmail.length > 0 ? scheduleForEmail : generated,
      15
    );
    const emailHtml = buildGridEmailHtml(gridData);
    const subject = `On Call Schedule (${formatDateLabel(minDate)} - ${formatDateLabel(maxDate)})`;

    const sendResults = await Promise.allSettled(
      recipients.map((doc) =>
        sendGmailMessage(req, {
          to: doc.email,
          subject,
          html: emailHtml
        })
      )
    );

    const report = recipients.map((doc, index) => ({
      doctorId: doc._id,
      name: doc.name,
      email: doc.email,
      status: sendResults[index].status,
      error:
        sendResults[index].status === "rejected"
          ? sendResults[index].reason?.message || "Send failed"
          : null
    }));

    const failures = report.filter((item) => item.status === "rejected");
    const allFailures = [...failures, ...missingEmailDoctors];
    const sentCount = report.length - failures.length;

    if (failures.length === 0) {
      await Schedule.updateMany(
        { _id: { $in: generated.map((entry) => entry._id) } },
        { $set: { isSent: true } }
      );
    }

    res.json({
      message:
        allFailures.length === 0
          ? `Schedule sent to ${sentCount} doctors.`
          : `Sent ${sentCount} of ${report.length + missingEmailDoctors.length} emails.`,
      sent: sentCount,
      failed: allFailures.length,
      failures: allFailures
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// Download generated schedule as Excel
async function downloadSchedule(req, res) {
  try {
    const department = req.query.department;
    const requestedWeekStart = req.query.weekStart;
    if (!department) {
      return res.status(400).json({ error: "department is required" });
    }

    const weekStart = await getLatestWeekStartForDepartment(department, requestedWeekStart);
    if (!weekStart) {
      return res.status(404).json({ error: "No generated schedules found for department." });
    }

    const schedules = await Schedule.find({
      department,
      weekStart
    })
      .populate("duty")
      .populate("doctor")
      .populate("doctorId")
      .sort({ date: 1 });

    if (schedules.length === 0) {
      return res.status(404).json({ error: "No generated schedules found." });
    }

    const gridData = buildRotationGrid(schedules, 15);
    if (!gridData) {
      return res.status(404).json({ error: "No generated schedules found." });
    }

    const { days, duties, grid, startDate, endDate } = gridData;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Schedule");

    sheet.columns = [
      { header: "Duty", key: "duty", width: 22 },
      ...days.map((day) => ({
        header: `${day.toLocaleDateString("en-US", { weekday: "short" })} ${formatDateOnly(day)}`,
        key: toDateKey(day),
        width: 26
      }))
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    const fillMap = {
      onsite: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } },
      remote: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } },
      emergency: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } },
      default: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }
    };

    duties.forEach((duty, index) => {
      const rowIndex = index + 2;
      sheet.getCell(rowIndex, 1).value = duty.displayName || duty.name;
      sheet.getCell(rowIndex, 1).font = { bold: true };
      sheet.getCell(rowIndex, 1).alignment = { vertical: "middle" };

      days.forEach((day, dayIndex) => {
        const cell = sheet.getCell(rowIndex, dayIndex + 2);
        const entries = grid.get(`${toDateKey(day)}|${duty.id}`) || [];
        if (entries.length === 0) {
          cell.value = "";
          cell.alignment = { vertical: "top", wrapText: true };
          return;
        }

        const lines = entries.map((entry) => {
          const doctorName = entry.doctorId?.name || entry.doctor?.name || "Unassigned";
          const department = entry.department || "";
          const timeLabel = resolveTimeLabel(entry);
          const proxyName = entry.proxyDoctor?.name || (entry.proxyUsed ? "TBD" : "");
          const proxyLabel = proxyName ? `Proxy: ${proxyName}` : "";
          const parts = [doctorName, timeLabel, department, proxyLabel].filter(Boolean);
          return parts.join(" · ");
        });

        cell.value = lines.join("\n");
        cell.alignment = { vertical: "top", wrapText: true };

        if (entries.length === 1) {
          const category = resolveCategory(entries[0]);
          cell.fill = fillMap[category] || fillMap.default;
        }
      });
    });

    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const startLabel = safeFilePart(formatDateOnly(startDate));
    const endLabel = safeFilePart(formatDateOnly(endDate));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=on_call_schedule_${startLabel}_to_${endLabel}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  generateSchedule,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  overrideSchedule,
  sendGeneratedSchedule,
  downloadSchedule,
  generateDepartmentSchedule
};
