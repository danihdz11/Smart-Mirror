import React, { useEffect, useState } from "react";

const ClockWidget: React.FC = () => {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Formatear hora (HH:MM:SS)
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
      
      // Formatear fecha
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      setDate(now.toLocaleDateString("es-ES", options));
    };

    // Actualizar inmediatamente
    updateTime();

    // Actualizar cada segundo
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 text-white shadow-2xl pointer-events-auto">
      <div className="text-6xl font-bold mb-2 font-mono">{time}</div>
      <div className="text-xl font-medium capitalize">{date}</div>
    </div>
  );
};

export default ClockWidget;

