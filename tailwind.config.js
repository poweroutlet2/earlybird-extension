/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    fontSize: {
      xs: "1.2rem",
      sm: "1.4rem",
      base: "1.6rem",
      lg: "1.8rem",
      xl: "2rem",
      "2xl": "2.4rem",
      "3xl": "3rem",
      "4xl": "3.6rem",
      "5xl": "4.8rem",
      "6xl": "6rem",
      "7xl": "7.2rem",
      "8xl": "9.6rem",
      "9xl": "12.8rem"
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" }
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" }
        }
      },
      colors: {
        main: "#88aaee",
        mainAccent: "#4d80e6", // not needed for shadcn components
        overlay: "rgba(0,0,0,0.8)", // background color overlay for alert dialogs, modals, etc.

        // light mode
        bg: "#dfe5f2",
        text: "#000",
        border: "#000",

        // dark mode
        darkBg: "#272933",
        darkText: "#eeefe9",
        darkBorder: "#000",
        secondaryBlack: "#1b1b1b" // opposite of plain white, not used pitch black because borders and box-shadows are that color
      },
      borderRadius: {
        base: "4px"
      },
      boxShadow: {
        light: '1.75px 1px 0px 0px #000',
        dark: '1.25px .5px 0px 0px #000',
      },
      translate: {
        boxShadowX: '1.75px',
        boxShadowY: '1px',
        reverseBoxShadowX: '-1.75px',
        reverseBoxShadowY: '-1px',
      },
      fontWeight: {
        base: "500",
        heading: "700"
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
