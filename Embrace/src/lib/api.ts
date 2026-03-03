/**
 * Generic API Fetcher for backend integrations.
 * Replace BASE_URL when the real backend is deployed.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function fetcher<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "An error occurred while fetching the data.");
    }

    return response.json();
}
