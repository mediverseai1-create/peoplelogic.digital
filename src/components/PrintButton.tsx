"use client";

export function PrintButton() {
  return (
    <button className="btn-secondary" onClick={() => window.print()} type="button">
      Print / Save as PDF
    </button>
  );
}
