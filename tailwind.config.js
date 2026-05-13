/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#2F5D50",
                secondary: "#6F4E37",
                accent: "#C08B5C",
                background: "#F5F1EA",
                dark: "#1F2421",
                success: "#4CAF50",
                warning: "#D98E04",
                danger: "#B23A48",
            }
        },
    },

    plugins: [],
}
