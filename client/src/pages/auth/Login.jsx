import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-3xl font-bold">AquaX</h1>
          <p className="mt-2 text-gray-500">
            Sign in to your Panchayat account
          </p>
        </div>

        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Email
          </label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="admin@example.com"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Password
          </label>

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-sm text-gray-500">
          New Panchayat?{" "}
          <Link
            to="/register"
            className="font-medium text-blue-600"
          >
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;