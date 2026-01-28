import axios from "axios";
import { API_BASE } from "./url";

const MyAxiosInstance = (opt) => {
  let headers = {};

  if (opt === 1) {
    const token = localStorage.getItem("guardToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } else if (opt === 3) {
    const dataEntryKey = localStorage.getItem("dataEntryKey");
    if (dataEntryKey) {
      headers.dataEntryKey = dataEntryKey;
    }
  } else {
    const token = localStorage.getItem("token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const instance = axios.create({
    baseURL: opt === 1 ? `${API_BASE}/guard` : `${API_BASE}`,
    headers,
  });

  // 🧩 Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 403) {
        console.log("🔒 Auth expired");

        if (opt === 1) {
          localStorage.removeItem("guardToken");
        } else if (opt !== 3) {
          localStorage.removeItem("token");
        }

        // 🔁 Refresh the page
        window.location.reload();
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export default MyAxiosInstance;
