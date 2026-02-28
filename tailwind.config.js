/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#065f46",
                "background-light": "#f6f8f7",
                "background-dark": "#121212",
                "surface-light": "#ffffff",
                "border-light": "#f1f3f2",
                "accent-dark": "#1a1a1a",
                "text-muted": "#64748b",
            },
            fontFamily: {
                sans: ["Public Sans", "sans-serif"]
            }
        }
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require('@tailwindcss/container-queries'),
    ],
}
