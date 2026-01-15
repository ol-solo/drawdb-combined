import axios from "axios";

// Get backend URL - use relative URL if VITE_BACKEND_URL is empty or not set (for combined deployment)
function getBackendUrl() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (!backendUrl || backendUrl === '') {
    // Use relative URL when running in same container
    return '';
  }
  return backendUrl;
}

export async function send(subject, message, attachments) {
  return await axios.post(`${getBackendUrl()}/email/send`, {
    subject,
    message,
    attachments,
  });
}
