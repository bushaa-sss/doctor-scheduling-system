import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Doctors from "./pages/Doctors";
import Duties from "./pages/Duties";
import Schedule from "./pages/Schedule";
import Leaves from "./pages/Leaves";

const tabs = [
  { id: "dashboard", label: "Dashboard", component: Dashboard },
  { id: "doctors", label: "Doctors", component: Doctors },
  { id: "duties", label: "Duties", component: Duties },
  { id: "schedule", label: "Schedule", component: Schedule },
  { id: "leaves", label: "Leaves", component: Leaves }
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const ActiveComponent = tabs.find((t) => t.id === active)?.component || Dashboard;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Doctor Scheduling System</h1>
            <p className="text-sm text-slate-600">Weekly rotation, leaves, and notifications</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`rounded px-3 py-2 text-sm ${
                  active === tab.id
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <ActiveComponent />
      </main>
    </div>
  );
}
