import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MirrorView from "./pages/MirrorView";
import WeatherWidget from "./widgets/weatherWidget/weatherWidget";
import ToDoWidget from "./widgets/toDoWidget/toDoWidget";
import QuoteWidget from "./widgets/quoteWidget/quoteWidget";
import NewsWidget from "./widgets/newsWidget/newsWidget";
import MiniCalendar from "./widgets/miniCalendarWidget/miniCalendarWidget";

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

              {/* Reloj */}
              <div className="absolute top-6 left-6 pointer-events-auto text-white text-2xl">
                Reloj
              </div>

              {/* Calendario (izquierda) */}
              <div className="absolute top-24 left-6 pointer-events-auto">
                <MiniCalendar />
              </div>

              {/* Widgets derechos */}
              <div className="absolute top-6 right-6 flex flex-col gap-4 pointer-events-auto">
                <WeatherWidget />
                <ToDoWidget />
                <QuoteWidget />
                <NewsWidget />
              </div>

              {/* Botón izquierda abajo */}
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
