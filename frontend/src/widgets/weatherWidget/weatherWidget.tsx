import React, { useEffect, useState } from "react";

type WeatherType = "Soleado" | "Nublado" | "Noche" | "Lluvia";

const WeatherWidget: React.FC = () => {
  const city = "Guadalajara";
  const temperature = "25°C";

  const [weatherDescription, setWeatherDescription] = useState<WeatherType>("Soleado");

  const iconMap: Record<WeatherType, string> = {
    Soleado: "/weather/sun.png",
    Nublado: "/weather/cloud.png",
    Noche: "/weather/moon.png",
    Lluvia: "/weather/rain.png",
  };

  const weatherOrder: WeatherType[] = ["Soleado", "Nublado", "Lluvia", "Noche"];

  // Cambia el clima cada 5 segundos
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % weatherOrder.length;
      setWeatherDescription(weatherOrder[index]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getBackgroundColor = () => {
    switch (weatherDescription) {
      case "Soleado":
        return "bg-yellow-400/60";
      case "Nublado":
        return "bg-gray-500/60";
      case "Noche":
        return "bg-blue-900/70";
      case "Lluvia":
        return "bg-blue-500/60";
      default:
        return "bg-black/50";
    }
  };

  return (
    <div
      className={`relative rounded-2xl p-4 flex flex-col items-center justify-center text-white w-40 h-40 shadow-lg ${getBackgroundColor()} transition-all duration-700`}
    >
      <h2 className="text-lg font-bold mb-1">{city}</h2>
      <span className="text-3xl font-bold">{temperature}</span>

      {/* Ícono que cambia */}
      <img
        key={weatherDescription} // 🔑 fuerza animación al cambiar
        src={iconMap[weatherDescription]}
        alt={weatherDescription}
        className="w-10 h-10 mt-2 object-contain transition-all duration-700 ease-in-out"
      />

      <p className="mt-1 text-sm">{weatherDescription}</p>
    </div>
  );
};

export default WeatherWidget;
