"use client";

// Dimensions for 2100x2100 canvas
const LOGO_WIDTH = 328.14;
const LOGO_HEIGHT = 68.13;
const ICON_SIZE = 28;

export function GraphicFooter() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 32,
        paddingRight: 32,
        paddingTop: 24,
        paddingBottom: 24,
      }}
    >
      {/* Dracoviz Logo */}
      <div
        style={{
          position: "relative",
          width: LOGO_WIDTH,
          height: LOGO_HEIGHT,
        }}
      >
        <img
          src="/assets/graphic/dracoviz-full-logo.png"
          alt="Dracoviz"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "left",
          }}
        />
      </div>

      {/* Tagline */}
      <span style={{ fontFamily: "Prompt, sans-serif", color: "white", fontSize: 30 }}>
        Pokémon GO data insights and infographics. Find more at:
      </span>

      {/* Website */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "white", fontSize: 30 }}>
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
        <span>dracoviz.com</span>
      </div>

      {/* X / Twitter */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "white", fontSize: 30 }}>
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span>dracoviz</span>
      </div>

      {/* Instagram */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "white", fontSize: 30 }}>
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        <span>_dracoviz</span>
      </div>
    </div>
  );
}
