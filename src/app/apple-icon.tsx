import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#be241f",
        }}
      >
        <div
          style={{
            width: 120,
            height: 76,
            borderRadius: 80,
            background: "#faf6ea",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 46, background: "#2a1c14", display: "flex" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
