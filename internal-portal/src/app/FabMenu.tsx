"use client";
import { useState } from "react";
import Image from "next/image";

const menuOptions = [
  { label: "Cleaning Products", key: "products" },
  { label: "Contact Details", key: "contact" },
  { label: "Operations", key: "operations" },
  { label: "Settings", key: "settings" },
];

export default function FabMenu() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("");

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBgColor(e.target.value);
    document.body.style.backgroundColor = e.target.value;
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={() => {
            setOpen(false);
            setActive(null);
          }}
          aria-label="Close menu overlay"
        />
      )}
      {/* FAB */}
      <button
        className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full bg-white shadow-2xl flex items-center justify-center border-2 border-blue-600 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-300"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        style={{ padding: 0 }}
      >
        <Image
          src="/scratchsolid-logo.jpg"
          alt="Company Logo"
          width={24}
          height={24}
          className="w-6 h-6 object-contain rounded-full"
          priority
        />
      </button>
      {/* Popover */}
      {open && !active && (
        <div className="fixed bottom-28 left-10 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-zinc-200 animate-fab-pop flex flex-col gap-0 p-2">
          {menuOptions.map((opt, i) => (
            <button
              key={opt.key}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl hover:bg-blue-50 text-lg font-medium text-zinc-800 transition-colors focus:outline-none mb-1"
              onClick={() => setActive(opt.key)}
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-base">
                {i + 1}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {/* Sub-windows */}
      {open && active === "products" && (
        <div className="fixed bottom-28 left-10 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 animate-fab-pop p-6 flex flex-col">
          <button className="self-end mb-2 text-zinc-400 hover:text-zinc-700" onClick={() => setActive(null)} aria-label="Close">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
          <h2 className="text-xl font-bold mb-2 text-blue-700">Cleaning Products</h2>
          <div className="text-zinc-700">List your cleaning products here.</div>
        </div>
      )}
      {open && active === "contact" && (
        <div className="fixed bottom-28 left-10 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 animate-fab-pop p-6 flex flex-col">
          <button className="self-end mb-2 text-zinc-400 hover:text-zinc-700" onClick={() => setActive(null)} aria-label="Close">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
          <h2 className="text-xl font-bold mb-2 text-blue-700">Contact Details</h2>
          <div className="mb-2">
            <div className="font-semibold">Phone:</div>
            <div>+1 234 567 8901</div>
            <div className="font-semibold mt-2">Email:</div>
            <div>info@scratchsolid.com</div>
          </div>
        </div>
      )}
      {open && active === "settings" && (
        <div className="fixed bottom-28 left-10 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 animate-fab-pop p-6 flex flex-col">
          <button className="self-end mb-2 text-zinc-400 hover:text-zinc-700" onClick={() => setActive(null)} aria-label="Close">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
          <h2 className="text-xl font-bold mb-2 text-blue-700">Settings</h2>
          <label className="flex items-center gap-2 mt-2">
            <span>Background color:</span>
            <input
              type="color"
              value={bgColor}
              onChange={handleColorChange}
              className="w-8 h-8 border-none bg-transparent cursor-pointer"
            />
          </label>
        </div>
      )}
      {open && active === "operations" && (
        <div className="fixed bottom-28 left-10 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 animate-fab-pop p-6 flex flex-col">
          <button className="self-end mb-2 text-zinc-400 hover:text-zinc-700" onClick={() => setActive(null)} aria-label="Close">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
          <h2 className="text-xl font-bold mb-2 text-blue-700">Operations & Timeslots</h2>
          <div className="text-zinc-700">
            <div className="mb-2">Our cleaning operations run in two main timeslots each day:</div>
            <ul className="list-disc pl-5 mb-2">
              <li><b>08:00 - 12:00</b>: Morning session</li>
              <li><b>13:00 - 17:00</b>: Afternoon session</li>
            </ul>
            <div>Contact us for custom arrangements or to learn more about our operational details.</div>
          </div>
        </div>
      )}
    </>
  );
}
