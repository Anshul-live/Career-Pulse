import { AuthProvider } from "./context/AuthContext";
import "./App.css";
import Navbar from "./components/navbar/Navbar";
import Container from "./components/container/container";
import Last_container from "./components/last_container/Last_container";
import Footer from "./components/footer/Footer";
import Signup from "./components/signup/signup";
import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";
import { Routes, Route,Navigate } from "react-router-dom";
import OAuthSuccess from "./pages/OAuthSuccess"; 
import UploadEmails from "./pages/UploadEmails";
import ApplicationsList from "./components/Applications/ApplicationsList";
import ApplicationDetail from "./components/Applications/ApplicationDetail";





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
          <>
            <Navbar />
            <Signup />
          </>
        }
      />

      <Route
        path="/login"
        element={
          <>
            <Navbar />
            <Login />
            
          </>
        }
      />

      <Route path="/oauth-success" element={<OAuthSuccess />} />

      <Route
        path="/upload"
        element={
          <>
            <Navbar />
            <UploadEmails />
          </>
        }
      />

      <Route
        path="/dashboard"
        element={
          <>
            <Navbar />
            <Dashboard />
          </>
        }
      />

      <Route
        path="/applications"
        element={
          <>
            <Navbar />
            <ApplicationsList />
          </>
        }
      />

      <Route
        path="/applications/:id"
        element={
          <>
            <Navbar />
            <ApplicationDetail />
          </>
        }
      />
    </Routes>
    </AuthProvider>
  );
}

export default App;
