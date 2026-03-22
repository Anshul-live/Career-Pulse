import { AuthProvider } from "./context/AuthContext";
import "./App.css";
import Navbar from "./components/navbar/Navbar";
import Container from "./components/container/container";
import Footer from "./components/footer/Footer";
import Signup from "./components/signup/signup";
import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";
import Groups from "./components/Groups/Groups";
import { Routes, Route } from "react-router-dom";
import OAuthSuccess from "./pages/OAuthSuccess"; 
import UploadEmails from "./pages/UploadEmails";

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={<Container />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route path="/oauth-success" element={<OAuthSuccess />} />

        <Route
          path="/upload"
          element={<UploadEmails />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/groups"
          element={<Groups />}
        />
      </Routes>
      <Footer />
    </AuthProvider>
  );
}

export default App;
