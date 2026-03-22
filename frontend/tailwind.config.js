/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#09131f",
        foreground: "#eff6ff",
        muted: "#9fb2c7",
        accent: "#d6b98c",
        emerald: "#67c4b5",
        panel: "rgba(10, 22, 37, 0.78)"
      },
      fontFamily: {
        sans: ["Segoe UI", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        display: ["Georgia", "Times New Roman", "serif"]
      },
      boxShadow: {
        soft: "0 18px 80px rgba(3, 7, 18, 0.28)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
