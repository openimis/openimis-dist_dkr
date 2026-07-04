// All API calls to the FastAPI backend go through this module.
// BASE_URL can be overridden with VITE_API_BASE_URL in a .env file so the
// frontend can point at a different backend port/host without a code change.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError(
      `Could not reach the backend at ${BASE_URL}. Is it running?`,
      0
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `HTTP ${res.status}`, res.status);
  }

  return res.json();
}

export const api = {
  /** Fetch all claims with pre-scored summaries for the sidebar list. */
  getClaims: () => request("/claims"),

  /** Fetch a single claim by ID. */
  getClaim: (id) => request(`/claims/${id}`),

  /** Run the full validation pipeline (rules + AI explanation + FHIR build) on a claim. */
  validateClaim: (id) => request(`/claims/${id}/validate`, { method: "POST" }),

  /** Validate an arbitrary claim payload without persisting it. */
  validateRaw: (claimData) =>
    request("/validate", {
      method: "POST",
      body: JSON.stringify(claimData),
    }),

  /** Save officer corrections to a claim, then re-validate. */
  correctClaim: (id, correctedData) =>
    request(`/claims/${id}/correct`, {
      method: "POST",
      body: JSON.stringify(correctedData),
    }),

  /** Submit the validated claim's FHIR ClaimResponse to openIMIS. */
  submitClaim: (id) => request(`/claims/${id}/submit`, { method: "POST" }),

  /** Create a new claim and add it to the queue. Requires the POST /claims
   *  backend route — see backend/main.py in the project README. */
  createClaim: (claimData) =>
    request("/claims", {
      method: "POST",
      body: JSON.stringify(claimData),
    }),
};

export { ApiError };
