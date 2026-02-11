import { useEffect, useState } from "react";
import { api } from "../api/api";

export default function Dashboard() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  async function registerPush() {
    try {
      if (!selectedDoctor) {
        setMessage("Select a doctor to attach the subscription.");
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("Push notifications are not supported in this browser.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/service-worker.js");
      const publicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        setMessage("Missing REACT_APP_VAPID_PUBLIC_KEY in environment.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await api.savePushSubscription(selectedDoctor, subscription);
      setMessage("Push subscription saved for doctor.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="text-xl font-semibold text-slate-800">Quick Setup</h2>
        <p className="mt-1 text-sm text-slate-600">
          Register push notifications for doctors. Each doctor should subscribe from their own device.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            className="rounded border p-2"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="">Select doctor</option>
            {doctors.map((doc) => (
              <option key={doc._id} value={doc._id}>
                {doc.name}
              </option>
            ))}
          </select>
          <button className="rounded bg-brand-600 px-4 py-2 text-white" onClick={registerPush}>
            Enable Notifications
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow">
          <p className="text-sm opacity-80">Doctors</p>
          <p className="text-2xl font-semibold">{doctors.length}</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 p-4 text-white shadow">
          <p className="text-sm opacity-80">Weekly Rotation</p>
          <p className="text-2xl font-semibold">Automated</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 p-4 text-white shadow">
          <p className="text-sm opacity-80">Push Alerts</p>
          <p className="text-2xl font-semibold">Enabled</p>
        </div>
      </section>
    </div>
  );
}
