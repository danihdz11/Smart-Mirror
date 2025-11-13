import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MirrorView from "./pages/MirrorView";
import WeatherWidget from "./weather/weatherWidget/weatherWidget";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <MirrorView>
              <div className="absolute top-6 left-6 pointer-events-auto text-white text-2xl">
                Reloj
              </div>

              {/* Aquí estaba tu widget de clima */}
              <div className="absolute top-6 right-6 pointer-events-auto">
                <WeatherWidget />
              </div>

              <button className="absolute bottom-6 left-6 pointer-events-auto text-black text-2xl">
                holaaaaaa
              </button>
            </MirrorView>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
