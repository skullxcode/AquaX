import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/useAuth";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    panchayatName: "",
    panchayatCode: "",
    district: "",
    state: "",
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
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errors = err.response?.data?.errors;

      setError(
        errors?.map((item) => item.message).join(", ") ||
        err.response?.data?.message ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    ["name", "Administrator Name"],
    ["email", "Email Address"],
    ["password", "Password"],
    ["panchayatName", "Panchayat Name"],
    ["panchayatCode", "Panchayat Code"],
    ["district", "District"],
    ["state", "State"],
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-5 rounded-xl bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-3xl font-bold">AquaX</h1>
          <p className="mt-2 text-gray-500">
            Register your Gram Panchayat
          </p>
        </div>

        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {fields.map(([name, label]) => (
          <div key={name}>
            <label className="mb-2 block text-sm font-medium">
              {label}
            </label>

            <input
              type={name === "password" ? "password" : name === "email" ? "email" : "text"}
              name={name}
              value={form[name]}
              onChange={handleChange}
              required
              minLength={name === "password" ? 8 : undefined}
              className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register Panchayat"}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-blue-600">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;