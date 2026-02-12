import { useEffect, useMemo, useState } from "react";
import ScheduleGrid from "../components/ScheduleGrid";
import { api, API_BASE } from "../api/api";

export default function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [message, setMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [sendFailures, setSendFailures] = useState([]);
  const [gmailStatus, setGmailStatus] = useState({ authenticated: false, email: "" });
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState("");

  const canGenerate = Boolean(department);

  async function loadDepartments() {
    const duties = await api.getDuties();
    const deptSet = new Set(duties.map((duty) => duty.department));
    const list = Array.from(deptSet);
    setDepartments(list);
    if (!department && list.length > 0) {
      setDepartment(list[0]);
    }
  }

  async function loadSchedule(selectedDepartment) {
    if (!selectedDepartment) {
      setSchedule([]);
      return;
    }
    const list = await api.getSchedule(selectedDepartment, startDate || undefined);
    setSchedule(list);
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadSchedule(department);
  }, [department, startDate]);

  useEffect(() => {
    api
      .getGmailStatus()
      .then((data) => setGmailStatus(data))
      .catch(() => setGmailStatus({ authenticated: false, email: "" }));
  }, []);

  async function handleDisconnectGmail() {
    try {
      await api.logoutGmail();
      setGmailStatus({ authenticated: false, email: "" });
      setActionMessage("Gmail disconnected.");
      setActionStatus("success");
    } catch (err) {
      setActionMessage(err.message);
      setActionStatus("error");
    }
  }

  async function handleGenerate() {
    if (!department) {
      setMessage("Select a department to generate rotation.");
      return;
    }
    setActionMessage("");
    setActionStatus("");
    setSendFailures([]);
    const result = await api.generateSchedule(department, startDate || undefined);
    setMessage(
      `Generated 15-day schedule for ${department} starting ${new Date(result.weekStart).toDateString()}`
    );
    await loadSchedule(department);
  }

  function openGmailPopup() {
    return new Promise((resolve, reject) => {
      const url = `${API_BASE.replace(/\/api$/, "")}/api/auth/google`;
      const width = 520;
      const height = 640;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        url,
        "gmailAuth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        reject(new Error("Popup blocked. Please allow popups and try again."));
        return;
      }

      const origin = new URL(API_BASE.replace(/\/api$/, "")).origin;
      let settled = false;
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Login timed out. Please try again."));
      }, 120000);

      // COOP on Google pages blocks reading popup.closed; use status polling instead.
      const statusPoll = setInterval(async () => {
        try {
          const status = await api.getGmailStatus();
          if (status?.authenticated) {
            setGmailStatus(status);
            cleanup();
            resolve(true);
          }
        } catch {
          // Ignore transient errors while user is authenticating.
        }
      }, 1500);

      function cleanup() {
        if (settled) return;
        settled = true;
        clearInterval(statusPoll);
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      }

      function onMessage(event) {
        if (event.origin !== origin) return;
        if (!event.data || event.data.type !== "gmail-auth") return;

        cleanup();
        if (event.data.success) {
          api
            .getGmailStatus()
            .then((data) => setGmailStatus(data))
            .catch(() => setGmailStatus({ authenticated: false, email: "" }));
          resolve(true);
        } else {
          reject(new Error(event.data.error || "Login failed."));
        }
      }

      window.addEventListener("message", onMessage);
    });
  }

  async function handleSendSchedule() {
    setActionMessage("");
    setActionStatus("");
    setSendFailures([]);
    setIsSending(true);
    try {
      if (!gmailStatus.authenticated) {
        await openGmailPopup();
      }
      const result = await api.sendGeneratedSchedule(department, currentWeekStart);
      if (result.failed && result.failed > 0) {
        setActionMessage(result.message || "Some emails failed to send.");
        setActionStatus("error");
        setSendFailures(result.failures || []);
      } else {
        setActionMessage(result.message || "Schedule sent to doctors.");
        setActionStatus("success");
        setSendFailures([]);
      }
      await loadSchedule(department);
    } catch (err) {
      setActionMessage(err.message);
      setActionStatus("error");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDownloadSchedule() {
    setActionMessage("");
    setActionStatus("");
    setSendFailures([]);
    setIsDownloading(true);
    try {
      const { blob, filename } = await api.downloadSchedule(department, currentWeekStart);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `weekly_schedule_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setActionMessage("Schedule download started.");
      setActionStatus("success");
    } catch (err) {
      setActionMessage(err.message);
      setActionStatus("error");
    } finally {
      setIsDownloading(false);
    }
  }

  const weekLabel = useMemo(() => {
    if (!schedule.length) return "";
    const first = schedule[0]?.date;
    return first ? new Date(first).toDateString() : "";
  }, [schedule]);

  const currentWeekStart = useMemo(() => {
    if (!schedule.length) return "";
    const fromEntry = schedule[0]?.weekStart;
    if (fromEntry) return fromEntry;
    const date = schedule[0]?.date ? new Date(schedule[0].date) : null;
    if (!date) return "";
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const start = new Date(date);
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }, [schedule]);

  const hasGenerated = useMemo(
    () => schedule.some((entry) => entry.isGenerated),
    [schedule]
  );
  const generatedEntries = useMemo(
    () => schedule.filter((entry) => entry.isGenerated),
    [schedule]
  );
  const isAlreadySent = useMemo(() => {
    if (!generatedEntries.length) return false;
    return generatedEntries.every((entry) => entry.isSent);
  }, [generatedEntries]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow">
        <label className="text-sm font-medium text-slate-700">Select Department for Rotation</label>
        <select
          className="rounded border p-2"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          {departments.length === 0 && <option value="">No departments</option>}
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
        <input
          className="rounded border p-2"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <button
          className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          Generate Rotation
        </button>
        {message && <span className="text-sm text-emerald-600">{message}</span>}
      </div>
      {hasGenerated && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow">
          <button
            className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={handleSendSchedule}
            disabled={isSending || isAlreadySent}
          >
            {isAlreadySent ? "Schedule Sent" : isSending ? "Sending..." : "Send Schedule"}
          </button>
          {gmailStatus.authenticated && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Connected as {gmailStatus.email || "Google User"}</span>
              <button
                type="button"
                className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700"
                onClick={handleDisconnectGmail}
              >
                Disconnect
              </button>
            </div>
          )}
          <button
            className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            onClick={handleDownloadSchedule}
            disabled={isDownloading}
          >
            {isDownloading ? "Preparing..." : "Download Schedule"}
          </button>
          {actionMessage && (
            <span
              className={`text-sm ${
                actionStatus === "error" ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {actionMessage}
            </span>
          )}
          {sendFailures.length > 0 && (
            <div className="w-full rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <p className="font-medium">Failed to send:</p>
              <ul className="mt-2 list-disc pl-5">
                {sendFailures.map((item) => (
                  <li key={item.email || item.doctorId}>
                    {item.name || "Doctor"} ({item.email || "no email"}): {item.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {weekLabel && (
        <p className="text-sm text-slate-600">
          Showing 15-day rotation starting {weekLabel} for {department}
        </p>
      )}
      <ScheduleGrid schedule={schedule} />
    </div>
  );
}
