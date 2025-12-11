import axios from "axios";
import { API_BASE } from "./url";

const MyAxiosInstance = (opt) => {
  let token;
  if (opt == 1) {
    token = localStorage.getItem("guardToken");
  } else {
    token = localStorage.getItem("token");
  }

  const instance = axios.create({
    baseURL: opt == 1 ? `${API_BASE}/guard` : `${API_BASE}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // 🧩 Add response interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 403) {
        console.log("🔒 Auth expired");

        if (opt == 1) {
          localStorage.removeItem("guardToken");
        } else {
          localStorage.removeItem("adminToken");
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
