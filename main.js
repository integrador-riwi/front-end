import { router } from "./scripts/router.js";

router("/login");

window.addEventListener("popstate", () => {
    router(location.pathname);
});