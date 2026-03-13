import { AuthProvider } from "./context/AuthContext";
import "./App.css";
import Navbar from "./components/navbar/Navbar";
import Container from "./components/container/container";
import Last_container from "./components/last_container/Last_container";
import Footer from "./components/footer/Footer";
import Signup from "./components/signup/signup";
import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";
import Groups from "./components/Groups/Groups";
import { Routes, Route, Navigate } from "react-router-dom";
import OAuthSuccess from "./pages/OAuthSuccess"; 
import UploadEmails from "./pages/UploadEmails";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={        
            <>        
              <Navbar />
              <Container />
              <Last_container />
              <Footer />
            </>
          }
        />

        <Route
          path="/signup"
          element={
            <div className="min-h-screen bg-black pt-16">
              <Navbar />
              <Signup />
            </div>
          }
        />

        <Route
          path="/login"
          element={
            <div className="min-h-screen bg-black pt-16">
              <Navbar />
              <Login />
            </div>
          }
        />

        <Route path="/oauth-success" element={<OAuthSuccess />} />

        <Route
          path="/upload"
          element={
            <>
              <Navbar />
              <div className="pt-16">
                <UploadEmails />
              </div>
            </>
          }
        />

        <Route
          path="/dashboard"
          element={
            <>
              <Navbar />
              <div className="pt-16 min-h-screen">
                <Dashboard />
              </div>
            </>
          }
        />

        <Route
          path="/groups"
          element={
            <>
              <Navbar />
              <div className="pt-16 min-h-screen">
                <Groups />
              </div>
            </>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
