
// pages/OAuthSuccess.jsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

export default function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("token", token);
      
      // Fetch user info using token
      axios.get("http://localhost:8000/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        localStorage.setItem("user", JSON.stringify(res.data.data));
      })
      .catch(() => {});
      
      // Send token to local pipeline server if running
      fetch(`http://localhost:8765/token?token=${encodeURIComponent(token)}`)
        .then(() => console.log("Token sent to pipeline"))
        .catch(() => {});
      
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, []);

  return <div>Signing you in...</div>;
}
