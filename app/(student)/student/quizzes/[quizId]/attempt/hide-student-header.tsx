"use client";

// Style toggled via ref so it is off while Activity keeps this page hidden (preserving-ui-state.md, "Global styles").
export function HideStudentHeader() {
  return (
    <style
      ref={(style) => {
        if (style) style.media = "";
        return () => {
          if (style) style.media = "not all";
        };
      }}
    >
      {"[data-student-header]{display:none}"}
    </style>
  );
}
