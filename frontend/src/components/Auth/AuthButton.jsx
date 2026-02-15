// components/AuthButtons.jsx
export default function AuthButtons() {
  const handleGoogle = () => {
    // open backend OAuth route
    window.location.href ="http://localhost:4000/auth/google";
  };

  return (
    <button
      onClick={handleGoogle}
      className="bg-white text-gray-800 px-4 py-2 rounded shadow flex items-center gap-2"
    >
      <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
      Sign in with Google
    </button>
  );
}
