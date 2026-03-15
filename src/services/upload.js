import { apiFetch } from "./api.js";

// ─────────────────────────────────────────────────────────────
// uploadToCloudinary
//
// 1. Pide una firma temporal al backend
// 2. Sube el archivo directo a Cloudinary con esa firma
// 3. Confirma con el backend que el archivo existe (opcional)
//
// @param {File}     file          - archivo a subir
// @param {string}   resourceType  - "image" | "video"
// @param {Function} onProgress    - callback(percent: number)
// @returns {Promise<string>}      - secure_url del archivo subido
// ─────────────────────────────────────────────────────────────
export async function uploadToCloudinary(file, resourceType = "image", onProgress = null) {

    // ── Step 1: get signed params from our backend ────────────
    const sigData = await apiFetch("/upload/signature", {
        method: "POST",
        body: { resource_type: resourceType, folder: "teamup_projects" },
    });

    const { signature, timestamp, api_key, cloud_name, folder } = sigData;

    // ── Step 2: upload directly to Cloudinary ─────────────────
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", api_key);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);
    // NOTE: do NOT append resource_type to formData, it goes in the URL

    const secure_url = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                let msg = "Upload failed";
                try { msg = JSON.parse(xhr.responseText)?.error?.message ?? msg; } catch (_) { }
                reject(new Error(msg));
            }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`,
        );
        xhr.send(formData);
    });

    // ── Step 3: confirm with backend (optional but recommended) ─
    // Validates the file actually exists in Cloudinary.
    // Remove this block if you want a faster upload with less requests.
    try {
        const publicId = secure_url
            .split("/upload/")[1]           // strip base URL
            .replace(/\.[^.]+$/, "");       // strip extension → public_id

        await apiFetch("/upload/confirm", {
            method: "POST",
            body: { public_id: publicId, secure_url, resource_type: resourceType },
        });
    } catch (confirmErr) {
        // Non-fatal — the URL is valid if Cloudinary returned it
        console.warn("[upload] confirm step failed (non-fatal):", confirmErr.message);
    }

    return secure_url;
}