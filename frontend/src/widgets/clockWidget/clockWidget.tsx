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


      // Obtener día de la semana
      const weekday = now.toLocaleDateString("es-ES", { weekday: "long" });

      // Formatear DD/MM/YYYY
      const day = now.getDate().toString().padStart(2, "0");
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear();

      // Construir el formato final
      setDate(`${weekday}, ${day}/${month}/${year}`);
      
      // Formatear fecha
      // const options: Intl.DateTimeFormatOptions = {
      //   weekday: "long",
      //   year: "numeric",
      //   month: "long",
      //   day: "numeric",
      // };
      // setDate(now.toLocaleDateString("es-ES", options));
    };

    // Actualizar inmediatamente
    updateTime();

    // Actualizar cada segundo
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[rgba(253,235,216,0.4)] backdrop-blur-sm rounded-2xl p-3 text-[#5B3000] shadow-2xl text-center pointer-events-auto">
      <div className="text-4xl font-bold mb-1 font-mono">{time}</div>
      <div className="text-large font-medium capitalize">{date}</div>
    </div>
  );
};

export default ClockWidget;

//bg-[#FDEBD8]