// src/api.js
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Tạo một instance của axios với cấu hình sẵn
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Function để cập nhật token
const updateToken = () => {
  const token = localStorage.getItem("token");
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// Cập nhật token ban đầu
updateToken();

// THÊM REQUEST INTERCEPTOR - QUAN TRỌNG!
api.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage mỗi lần gọi API
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Xử lý response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn, đăng xuất user
      localStorage.removeItem("token");
      console.log("Hết hạn token");

      // Chỉ redirect về login nếu không đang ở admin panel
      if (!window.location.pathname.startsWith("/admin")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
export { updateToken };
