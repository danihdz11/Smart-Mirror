import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AuthButtons() {
  const navigate = useNavigate();
  const [userExists, setUserExists] = useState<boolean>(false);

  // Revisar si hay sesión en localStorage
  useEffect(() => {
    const user = localStorage.getItem("user");
    setUserExists(!!user);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUserExists(false);
    // navigate("/login");
  };

  return (
    <div className="absolute top-4 right-6 flex gap-3 pointer-events-auto z-50">
      {!userExists ? (
        <>
          <button
            onClick={() => navigate("/login")}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/register")}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-all shadow-sm"
          >
            Sign Up
          </button>
        </>
      ) : (
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all shadow-sm"
        >
          Logout
        </button>
      )}
    </div>
  );
}
