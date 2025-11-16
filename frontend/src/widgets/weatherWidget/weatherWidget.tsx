import React, { useEffect, useState } from "react";
import { getWeather } from "../../services/api";
import type { WeatherData } from "../../services/api";

type WeatherType = "Soleado" | "Nublado" | "Noche" | "Lluvia";

const WeatherWidget: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const iconMap: Record<WeatherType, string> = {
    Soleado: "/weather/sun.png",
    Nublado: "/weather/cloud.png",
    Noche: "/weather/moon.png",
    Lluvia: "/weather/rain.png",
  };

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener ubicación del usuario desde localStorage
      const userStr = localStorage.getItem("user");
      let city = "Guadalajara"; // Ciudad por defecto
      let country = "MX";

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.location) {
            city = user.location;
          }
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }
      }

      const data = await getWeather(city, country);
      setWeatherData(data);
    } catch (err: any) {
      console.error("Error fetching weather:", err);
      setError(err.response?.data?.error || "Error al obtener el clima");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar clima inmediatamente
    fetchWeather();

    // Actualizar clima cada 5 minutos
    const interval = setInterval(() => {
      fetchWeather();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, []);

  const getBackgroundColor = () => {
    if (!weatherData) return "bg-black/50";

    switch (weatherData.weatherType) {
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

  if (loading && !weatherData) {
    return (
      <div className="relative rounded-2xl p-4 flex flex-col items-center justify-center text-white w-40 h-40 shadow-lg bg-black/50">
        <p className="text-sm">Cargando...</p>
      </div>
    );
  }

  if (error && !weatherData) {
    return (
      <div className="relative rounded-2xl p-4 flex flex-col items-center justify-center text-white w-40 h-40 shadow-lg bg-red-500/60">
        <p className="text-xs text-center">{error}</p>
      </div>
    );
  }

  const weatherType = weatherData?.weatherType || "Nublado";
  const city = weatherData?.city || "Cargando...";
  const temperature = weatherData ? `${weatherData.temperature}°C` : "--°C";

  return (
    <div
      className={`relative rounded-2xl p-4 flex flex-col items-center justify-center text-white w-40 h-40 shadow-lg ${getBackgroundColor()} transition-all duration-700`}
    >
      <h2 className="text-lg font-bold mb-1">{city}</h2>
      <span className="text-3xl font-bold">{temperature}</span>

      {/* Ícono que cambia */}
      <img
        key={weatherType}
        src={iconMap[weatherType]}
        alt={weatherType}
        className="w-10 h-10 mt-2 object-contain transition-all duration-700 ease-in-out"
      />

      <p className="mt-1 text-sm capitalize">{weatherData?.description || weatherType}</p>
    </div>
  );
};

export default WeatherWidget;
