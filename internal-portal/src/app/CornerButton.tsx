"use client";
import { useState } from "react";

export default function CornerButton() {
  const [open, setOpen] = useState(false);
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
          onClick={() => setOpen(false)}
          aria-label="Close menu overlay"
        />
      )}
      {/* Floating Action Button */}
      <button
        className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-blue-600 hover:scale-110 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-300"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        style={{ padding: 0 }}
      >
        <img
          src="/scratchsolid-logo.jpg"
          alt="Company Logo"
          className="w-10 h-10 object-contain rounded-full"
        />
      </button>
      {/* Popover/Drawer */}
      {open && (
        <div className="fixed bottom-28 right-10 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 animate-fab-pop flex flex-col gap-0">
          {/* Caret */}
          <div className="absolute -top-3 right-8 w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24"><polygon points="12,0 24,24 0,24" fill="#fff" stroke="#e0e7ef" strokeWidth="1"/></svg>
          </div>
          {/* Close Button */}
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 focus:outline-none"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg>
          </button>
          {/* Content */}
          <div className="p-6 pt-8 flex flex-col gap-6">
            <section>
              <h2 className="text-xl font-bold mb-2 text-blue-700">Contact Details</h2>
              <div className="mb-2">
                <div className="font-semibold">Phone:</div>
                <div>+1 234 567 8901</div>
                <div className="font-semibold mt-2">Email:</div>
                <div>info@scratchsolid.com</div>
              </div>
            </section>
            <section>
              <h3 className="text-lg font-semibold mb-1 text-blue-700">Preferences</h3>
              <label className="flex items-center gap-2">
                <span>Background color:</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={handleColorChange}
                  className="w-8 h-8 border-none bg-transparent cursor-pointer"
                />
              </label>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
