import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AuthButtons() {
  const navigate = useNavigate();
  const [userExists, setUserExists] = useState<boolean>(false);

  // Revisar si hay sesión en localStorage
  // También escuchar cambios cuando el usuario hace login/logout
  useEffect(() => {
    const checkUser = () => {
      const user = localStorage.getItem("user");
      setUserExists(!!user);
    };
    
    // Verificar al montar
    checkUser();
    
    // Escuchar cambios en localStorage (por si se modifica desde otra pestaña/componente)
    window.addEventListener('storage', checkUser);
    
    // También verificar periódicamente para cambios locales
    const interval = setInterval(checkUser, 500);
    
    return () => {
      window.removeEventListener('storage', checkUser);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUserExists(false);
    
    // Disparar evento personalizado para que otros componentes se actualicen
    window.dispatchEvent(new CustomEvent('userLogout'));
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
