import { createElement as h } from "react";

const GREEN = "#16a34a";
const DARK = "#111827";

export function iconElement(size: number) {
  const pad = size * 0.16;
  return h(
    "div",
    {
      style: {
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: GREEN,
        borderRadius: size * 0.22,
      },
    },
    h(
      "div",
      {
        style: {
          width: size - pad * 2,
          height: size - pad * 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        },
      },
      h(
        "span",
        {
          style: {
            fontSize: (size - pad * 2) * 0.62,
            fontWeight: 800,
            color: "white",
            fontFamily: "sans-serif",
            lineHeight: 1,
          },
        },
        "€"
      ),
      h(
        "div",
        {
          style: {
            position: "absolute",
            bottom: 0,
            right: 0,
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size * 0.34,
            background: DARK,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${Math.max(2, Math.round(size * 0.02))}px solid ${GREEN}`,
          },
        },
        h(
          "span",
          {
            style: {
              color: "white",
              fontSize: size * 0.2,
              fontWeight: 900,
              fontFamily: "sans-serif",
              lineHeight: 1,
            },
          },
          "✓"
        )
      )
    )
  );
}
