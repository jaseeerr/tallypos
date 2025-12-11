import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const endpoint = isLogin ? "/login" : "/signup";

      const res = await axios.post(`${API_BASE}${endpoint}`, {
        username,
        password,
      });

      if (isLogin) {
        localStorage.setItem("token", res.data.token);
        setMessage("Login successful!");
      } else {
        setMessage("Signup successful!");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 text-white w-full max-w-md p-8 rounded-xl shadow-xl">

        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-6">
          {isLogin ? "Admin Login" : "Admin Signup"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-md bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-md bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition font-semibold py-2 rounded-md"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        {/* Message */}
        {message && (
          <p className="text-center mt-4 text-sm text-yellow-300">
            {message}
          </p>
        )}

        {/* Toggle Button */}
        <p className="text-center mt-6 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:underline"
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
