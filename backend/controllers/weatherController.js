import fetch from "node-fetch";

export const getWeather = async (req, res) => {
  try {
    const { city, country = "MX" } = req.query;

    if (!city) {
      return res.status(400).json({ error: "Se requiere el parámetro 'city'" });
    }

    if (!process.env.OPENWEATHER_API_KEY) {
      return res.status(500).json({ error: "API key de OpenWeather no configurada" });
    }

    // Construir URL de OpenWeatherMap API
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${country}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=es`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: "Ciudad no encontrada" });
      }
      return res.status(response.status).json({
        error: `Error al obtener el clima: ${response.statusText}`
      });
    }

    const data = await response.json();

    // Mapear el código del clima a descripciones en español
    const weatherCode = data.weather[0].main;
    const iconCode = data.weather[0].icon;
    const isNight = iconCode.endsWith("n");
    const weatherDescription = mapWeatherCode(weatherCode, isNight);

    // Formatear respuesta
    const weatherData = {
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      weatherType: weatherDescription,
      humidity: data.main.humidity,
      icon: iconCode,
      feelsLike: Math.round(data.main.feels_like),
    };

    res.json(weatherData);

  } catch (error) {
    console.error("Error al obtener el clima:", error);
    res.status(500).json({ error: "Error al obtener el clima" });
  }
};

// Función para mapear códigos de OpenWeather a tipos de clima del widget
const mapWeatherCode = (code, isNight) => {
  const codeMap = {
    "Clear": isNight ? "Noche" : "Soleado",
    "Clouds": "Nublado",
    "Rain": "Lluvia",
    "Drizzle": "Lluvia",
    "Thunderstorm": "Lluvia",
    "Snow": "Nublado",
    "Mist": "Nublado",
    "Fog": "Nublado",
    "Haze": "Nublado",
    "Smoke": "Nublado",
    "Dust": "Nublado",
    "Sand": "Nublado",
    "Ash": "Nublado",
    "Squall": "Lluvia",
    "Tornado": "Lluvia",
  };

  return codeMap[code] || "Nublado";
};

