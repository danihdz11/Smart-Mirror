import React, { useState, useEffect } from "react";

const quotes = [
  "Cree en ti mismo y en todo lo que eres.",
  "Cada día es una nueva oportunidad para mejorar.",
  "La disciplina vence al talento cuando el talento no se disciplina.",
  "Haz hoy lo que otros no quieren, para lograr mañana lo que otros no pueden.",
  "Los grandes cambios siempre vienen acompañados de una fuerte sacudida.",
  "La constancia es el puente entre tus sueños y la realidad.",
  "Nunca es tarde para ser quien podrías haber sido."
];

const QuoteWidget: React.FC = () => {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  return (
    <div className="bg-[#fff8dc] bg-opacity-90 text-gray-800 p-4 rounded-2xl text-center shadow-lg max-w-xs border border-yellow-200">
      <h2 className="text-lg font-semibold mb-2 text-yellow-800">✨ Frase del día ✨</h2>
      <p className="italic text-sm">{quote}</p>
    </div>
  );
};

export default QuoteWidget;
