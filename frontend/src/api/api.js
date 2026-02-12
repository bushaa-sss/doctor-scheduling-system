import axiosModule from "axios/dist/browser/axios.cjs";
import axios from "axios";
// const axios = axiosModule?.default || axiosModule;

export const API_BASE =
  process.env.REACT_APP_API_BASE ||
  "https://doctor-scheduling-system-production-fb40.up.railway.app";


// const client = axios.create({
//   baseURL: API_BASE,
//   headers: { "Content-Type": "application/json" },
//   withCredentials: true
// });
const client = axios.create({
  baseURL: `${API_BASE}/api`, // now all requests are relative to /api
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});


function buildError(err) {
  if (err?.response?.data?.error) return new Error(err.response.data.error);
  if (err?.message) return new Error(err.message);
  return new Error("Request failed");
}

async function request(path, { method = "get", data, params, responseType } = {}) {
  try {
    const res = await client.request({
      url: path,
      method,
      data,
      params,
      responseType
    });
    return res.data;
  } catch (err) {
    throw buildError(err);
  }
}

function getFilenameFromHeader(header) {
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match ? match[1] : null;
}

export const api = {
  getDoctors: (specialization) => {
    const params = {};
    if (specialization) params.specialization = specialization;
    return request("/doctors", { params });
  },
  createDoctor: (data) => request("/doctors", { method: "post", data }),
  updateDoctor: (id, data) => request(`/doctors/${id}`, { method: "put", data }),
  deleteDoctor: (id) => request(`/doctors/${id}`, { method: "delete" }),

  getDuties: (department) => {
    const params = {};
    if (department) params.department = department;
    return request("/duties", { params });
  },
  createDuty: (data) => request("/duties", { method: "post", data }),
  updateDuty: (id, data) => request(`/duties/${id}`, { method: "put", data }),
  deleteDuty: (id) => request(`/duties/${id}`, { method: "delete" }),

  getLeaves: () => request("/leaves"),
  createLeave: (data) => request("/leaves", { method: "post", data }),
  updateLeave: (id, data) => request(`/leaves/${id}`, { method: "put", data }),
  deleteLeave: (id) => request(`/leaves/${id}`, { method: "delete" }),

  getSchedule: (department, start, end) => {
    const params = {};
    if (department) params.department = department;
    if (start) params.start = start;
    if (end) params.end = end;
    return request("/schedule", { params });
  },
  generateSchedule: (department, startDate) =>
    request("/schedule/generate", {
      method: "post",
      data: { department, startDate }
    }),
  sendGeneratedSchedule: (department, weekStart) =>
    request("/schedule/send-generated", {
      method: "post",
      data: { department, weekStart }
    }),
  downloadSchedule: async (department, weekStart) => {
    try {
      const res = await client.get("/schedule/download", {
        responseType: "blob",
        params: department ? { department, weekStart } : undefined
      });
      return {
        blob: res.data,
        filename: getFilenameFromHeader(res.headers["content-disposition"])
      };
    } catch (err) {
      throw buildError(err);
    }
  },

  getGmailStatus: () => request("/auth/status"),
  logoutGmail: () => request("/auth/logout", { method: "post" }),

  savePushSubscription: (doctorId, pushSubscription) =>
    request(`/doctors/${doctorId}/push-subscription`, {
      method: "post",
      data: { pushSubscription }
    })
};

export default api;
