import React, { useState } from "react";

// Mock users for POC
const MOCK_USERS = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    name: "Administrator",
    email: "admin@example.com",
  },
  {
    id: 2,
    username: "editor",
    password: "editor123",
    name: "Document Editor",
    email: "editor@example.com",
  },
  {
    id: 3,
    username: "viewer",
    password: "viewer123",
    name: "Document Viewer",
    email: "viewer@example.com",
  },
];

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5174/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store token and user info
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Call parent callback
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (mockUser) => {
    setUsername(mockUser.username);
    setPassword(mockUser.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              OnlyOffice POC
            </h1>
            <p className="text-slate-400 text-sm">
              Sign in to access the document editor
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
                placeholder="Enter username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
                placeholder="Enter password"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Quick Login Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-4 text-center">
              Quick Login (Mock Users)
            </p>
            <div className="space-y-2">
              {MOCK_USERS.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleQuickLogin(user)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700/30 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 transition text-left"
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="text-slate-500 ml-2">({user.username})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              This is a POC with mock authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

