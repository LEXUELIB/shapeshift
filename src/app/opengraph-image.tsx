import { ImageResponse } from "next/og";
import { isZh, t } from "@/lib/i18n";

export const alt = t("Shapeshift: a text box morphing into an event card as you type");
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A static shot of the shell mid-morph: the input above, the event card growing below it. */
export default function OpengraphImage() {
  const ink = "#1a1a19";
  const muted = "#706e68";
  // The screenshot follows the UI language so the share card is not an English
  // mock-up of a Chinese app.
  const typed = isZh ? "明天下午三点和普里亚视频会议" : "dinner with priya friday 8pm on zoom";
  const header = t("Event");
  const badge = t("Video call");
  const title = isZh ? "视频会议" : "Dinner";
  const chips = isZh ? ["明天", "15:00", "普里亚"] : ["Friday", "8 PM", "Priya"];
  const tagline = t("Shapeshift: an input that becomes what you mean");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fafaf9", gap: 36 }}>
        <div
          style={{
            width: 760,
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            border: "2px solid #e8e7e4",
            borderRadius: 48,
            boxShadow: "0 30px 70px -20px rgba(26,26,25,0.18)",
            padding: "34px 40px",
            gap: 26,
          }}
        >
          <div style={{ fontSize: 38, color: ink, letterSpacing: -0.5, display: "flex" }}>
            {typed}
            <span style={{ color: "#3b5bdb" }}>|</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "#f4f4f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 30, height: 26, borderRadius: 6, border: `4px solid ${ink}` }} />
            </div>
            <div style={{ fontSize: 26, color: muted, display: "flex" }}>{header}</div>
            <div style={{ marginLeft: "auto", fontSize: 22, color: muted, border: "2px solid #e8e7e4", borderRadius: 999, padding: "6px 16px", display: "flex" }}>{badge}</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: ink, display: "flex" }}>{title}</div>
          <div style={{ display: "flex", gap: 14 }}>
            {chips.map((c) => (
              <div key={c} style={{ fontSize: 24, color: "#57564f", background: "#f4f4f2", borderRadius: 999, padding: "8px 20px", display: "flex" }}>
                {c}
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 30, color: muted, display: "flex" }}>{tagline}</div>
      </div>
    ),
    size,
  );
}
