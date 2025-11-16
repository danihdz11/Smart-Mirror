import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MirrorView from "./pages/MirrorView";
import WeatherWidget from "./widgets/weatherWidget/weatherWidget";
import ToDoWidget from "./widgets/toDoWidget/toDoWidget";
import QuoteWidget from "./widgets/quoteWidget/quoteWidget";
import NewsWidget from "./widgets/newsWidget/newsWidget"; // <- Importamos el widget de noticias
import ClockWidget from "./widgets/clockWidget/clockWidget";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/mirror"
          element={
            <MirrorView>
              <div className="absolute top-6 left-6 pointer-events-auto">
                <ClockWidget />
              </div>

              <div className="absolute top-6 right-6 flex flex-col gap-4 pointer-events-auto">
                <WeatherWidget />
                <ToDoWidget />
                <QuoteWidget />
                <NewsWidget /> {/* <- Aquí añadimos el widget de noticias */}
              </div>

              <button className="absolute bottom-6 left-6 pointer-events-auto text-black text-2xl">
                holaaaaaa
              </button>
            </MirrorView>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
