/** Validation Results Tailwind preset
 *  Provides tokens & utilities for the diagnostics screen.
 *  Import this file inside tailwind.config.js via `import validationPreset from "./tailwind.validation.preset.js";`
 *  and add `presets: [validationPreset]`.
 */

export default {
  theme: {
    extend: {
      colors: {
        validation: {
          red: {
            light: "#FEECEC",
            DEFAULT: "#FF6A6A",
          },
          amber: {
            light: "#FFF4E5",
            DEFAULT: "#FFA640",
          },
          green: {
            light: "#E6F7ED",
            DEFAULT: "#2FAA66",
          },
          gray: {
            50: "#F8F9FA",
            100: "#F1F3F5",
            200: "#E9ECEF",
            300: "#DEE2E6",
            400: "#ADB5BD",
            500: "#868E96",
            600: "#495057",
            700: "#343A40",
          },
          border: {
            soft: "rgba(0,0,0,0.06)",
            medium: "rgba(0,0,0,0.12)",
          },
          shadow: {
            soft: "0 1px 2px rgba(0,0,0,0.04)",
            hover: "0 4px 10px rgba(0,0,0,0.06)",
          },
        },
      },
      boxShadow: {
        "validation-soft": "0 1px 2px rgba(0,0,0,0.04)",
        "validation-hover": "0 4px 10px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        "validation-card": "12px",
      },
    },
  },
  plugins: [
    function ({ addComponents, theme }) {
      addComponents({
        ".validation-card": {
          borderRadius: theme("borderRadius.validation-card"),
          border: `1px solid ${theme("colors.validation.border.soft")}`,
          backgroundColor: theme("colors.white"),
          boxShadow: theme("boxShadow.validation-soft"),
        },
        ".validation-card-hover": {
          "&:hover": {
            boxShadow: theme("boxShadow.validation-hover"),
            transform: "translateY(-2px)",
            transition: "box-shadow 0.2s ease, transform 0.2s ease",
          },
        },
        ".validation-toggle": {
          border: `1px solid ${theme("colors.validation.border.medium")}`,
          borderRadius: "9999px",
          backgroundColor: theme("colors.white"),
          padding: "6px 14px",
          fontWeight: 500,
          fontSize: "0.875rem",
          cursor: "pointer",
          transition: "background-color 0.2s ease, color 0.2s ease",
        },
        ".validation-toggle-active": {
          backgroundColor: theme("colors.validation.gray.100"),
          borderColor: theme("colors.validation.gray.300"),
          color: theme("colors.validation.gray.700"),
          fontWeight: 600,
        },
        ".validation-score-badge": {
          borderRadius: "9999px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          border: `1px solid ${theme("colors.validation.border.soft")}`,
          backgroundColor: theme("colors.validation.gray.50"),
        },
      });
    },
  ],
};

