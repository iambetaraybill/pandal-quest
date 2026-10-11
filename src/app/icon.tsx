import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            width: 360,
            height: 220,
            borderRadius: 220,
            background: "#faf6ea",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: 130,
              background: "#2a1c14",
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
