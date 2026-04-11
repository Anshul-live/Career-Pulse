import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/navbar/Navbar";
import Container from "./components/container/Container";
import Footer from "./components/footer/Footer";
import Signup from "./components/signup/Signup";
import Login from "./components/login/Login";
import Dashboard from "./components/dashboard/Dashboard";
import Groups from "./components/groups/Groups";
import { Routes, Route } from "react-router-dom";
import OAuthSuccess from "./pages/OAuthSuccess"; 
import UploadEmails from "./pages/UploadEmails";
import ResolveUnknowns from "./pages/ResolveUnknowns";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Container />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/oauth-success" element={<OAuthSuccess />} />
            <Route path="/upload" element={<UploadEmails />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/resolve" element={<ResolveUnknowns />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
