import React from "react";

export function Flower({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <g fill="currentColor">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={i}
            cx="60"
            cy="31"
            rx="13"
            ry="27"
            transform={`rotate(${i * 45} 60 60)`}
          />
        ))}
        <circle cx="60" cy="60" r="21" />
      </g>
      <circle cx="60" cy="60" r="10" fill="#f7f5ed" />
    </svg>
  );
}
