import React, { useState } from "react";
import InputField from "../common_fields/input_fields";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { Link } from "react-router-dom";
import {useGoogleLogin} from '@react-oauth/google'
import axios from "axios";



const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });


  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await axios.post(
      "http://localhost:8000/users/login",
      {
        email: form.email,
        password: form.password,
      }
    );

    console.log("SUCCESS:", res.data);
 
    localStorage.setItem("token", res.data.data.accessToken);
    localStorage.setItem("user", JSON.stringify(res.data.data.user));
    //localStorage.setItem("token", res.data.token);
    alert("Login successful!");
    window.location.href = "/dashboard";

  } catch (err) {
    console.log("ERROR:", err);

    if (err.response) {
      alert(err.response.data.message);
    } else {
      alert("Server not responding");
    }
  }
};


  const handleGoogleAuth = () => {
  window.location.href = "http://localhost:8000/auth/google";
};

  const handleGithubAuth = () => {
    console.log("GitHub Auth clicked");
    // Yaha GitHub OAuth logic aayega
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back 👋</h2>
          <p className="text-gray-500">Sign in to continue to your dashboard</p>
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleSubmit}>
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
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
          />

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl mt-4 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Sign In
          </button>
        </form>

        {/* OR Divider */}
        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-300" />
          <span className="px-2 text-gray-500 text-sm">OR</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Social Auth Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogleAuth}
            className="flex items-center justify-center gap-3 border border-gray-200 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <FcGoogle className="text-2xl" />
            <span className="font-medium text-gray-700">
              Continue with Google
            </span>
          </button>

          <button
            onClick={handleGithubAuth}
            className="flex items-center justify-center gap-3 border border-gray-200 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <FaGithub className="text-2xl text-gray-800" />
            <span className="font-medium text-gray-700">
              Continue with GitHub
            </span>
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center mt-4">
          Don’t have an account?{" "}
          <Link
            to="/signup"
            className="text-blue-600 font-semibold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
