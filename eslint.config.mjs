export default [
    {
        ignores: ["node_modules/**", "coverage/**", ".env*"],
    },
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            "semi": "error",
            "prefer-const": "error"
        }
    }
];
