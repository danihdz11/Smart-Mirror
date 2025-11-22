import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import MirrorView from "./pages/MirrorView";

import WeatherWidget from "./widgets/weatherWidget/weatherWidget";
import ToDoWidget from "./widgets/toDoWidget/toDoWidget";
import QuoteWidget from "./widgets/quoteWidget/quoteWidget";
import NewsWidget from "./widgets/newsWidget/newsWidget";
import MiniCalendar from "./widgets/miniCalendarWidget/miniCalendarWidget";
import ClockWidget from "./widgets/clockWidget/clockWidget";
import AuthButtons from "./widgets/authButtons/authButtons";
import AddTaskWidget from "./widgets/addTaskWidget/addTaskWidget";
import { useVirtualAssistant } from "./hooks/useVirtualAssistant";

// Componente para inicializar el asistente virtual
function VirtualAssistantInitializer() {
  useVirtualAssistant();
  return null;
}

function App() {
  const [refreshTasks, setRefreshTasks] = useState(0);
  return (
    <BrowserRouter>
      <VirtualAssistantInitializer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/mirror"
          element={
            <MirrorView>
              <AuthButtons />
              <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto">
                <ClockWidget />
              </div>

              {/* Calendario y Noticias(izquierda) */}
              <div className="absolute top-6 left-6 pointer-events-auto">
                <MiniCalendar />
              </div>
              <div className="absolute bottom-6 left-6 pointer-events-auto">
                <NewsWidget />
              </div>

              {/* Widgets derechos */}
              <div className="absolute top-16 right-6 flex flex-col gap-4 items-end pointer-events-auto">
                <WeatherWidget />
                <ToDoWidget refresh={refreshTasks}/>
                {/* <QuoteWidget /> */}
              </div>

              <AddTaskWidget onTaskAdded={() => setRefreshTasks((prev) => prev + 1)}/>
            </MirrorView>
          }
        />
        {/* <Route path="/" element={<Navigate to="/login" replace />} /> */}
        <Route path="/" element={<Navigate to="/mirror" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
