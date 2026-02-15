
import axios from "axios";
import React, { useState } from "react";
import InputField from "../common_fields/input_fields";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

const Signup = () => {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const navigate = useNavigate();
  const { setIsLoggedIn } = useAuth();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("FORM DATA:", form);
    try {
      console.log("FORM DATA:", form);

      const res = await axios.post(
        "http://localhost:8000/users/register",
        
          {
            fullName: form.fullName,
            email: form.email,
            password: form.password,
          }  
        ,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (res.status === 201) {
        alert("Signup successful!");

        setIsLoggedIn(true);
        navigate("/login");
      } else {
        alert(res.data.message || "Something went wrong");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error signing up");
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = "http://localhost:8000/auth/google";
  };

  const handleGithubAuth = () => {
    console.log("GitHub Auth clicked");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">
          Create Account
        </h2>

        <form onSubmit={handleSubmit}>
          <InputField
            label="FullName"
            type="text"
            name="fullName"
            placeholder="Enter your full name"
            value={form.fullname}
            onChange={handleChange}
          />
          <InputField
            label="Email"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
          />
          <InputField
            label="Password"
            type="password"
            name="password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg mt-4 font-semibold transition-all"
          >
            Sign Up
          </button>
        </form>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-300" />
          <span className="px-2 text-gray-500 text-sm">OR</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogleAuth}
            className="flex items-center justify-center gap-3 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-all"
          >
            <FcGoogle className="text-2xl" />
            <span className="font-medium text-gray-700">
              Continue with Google
            </span>
          </button>

          <button
            onClick={handleGithubAuth}
            className="flex items-center justify-center gap-3 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-all"
          >
            <FaGithub className="text-2xl text-gray-800" />
            <span className="font-medium text-gray-700">
              Continue with GitHub
            </span>
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 font-semibold hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
