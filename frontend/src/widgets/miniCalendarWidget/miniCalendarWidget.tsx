import React from "react";

const MiniCalendar: React.FC = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Nombre del mes
  const monthName = today.toLocaleString("es-MX", { month: "long" });

  // Primer día del mes
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
  const startingDay = firstDay === 0 ? 6 : firstDay - 1; // Convertir para que lunes sea inicio

  // Días del mes
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Crear arreglo de días con espacios vacíos al inicio
  const calendarDays = [
    ...Array(startingDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      style={{
        width: "210px",
        padding: "15px",
        borderRadius: "20px",
        background: "rgba(255, 248, 230, 0.35)", // crema con transparencia
        backdropFilter: "blur(6px)",
        color: "#333",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 0 15px rgba(0,0,0,0.2)",
      }}
    >
      {/* Título */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "18px", fontWeight: "bold" }}>
          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </div>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>{year}</div>
      </div>

      {/* Días de la semana */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          marginBottom: "6px",
          fontSize: "12px",
          opacity: 0.7,
        }}
      >
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      {/* Números del calendario */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          rowGap: "6px",
          fontSize: "14px",
        }}
      >
        {calendarDays.map((day, index) => {
          const isToday = day === today.getDate();

          return (
            <div
              key={index}
              style={{
                padding: "4px 0",
                borderRadius: "7px",
                background: isToday ? "rgba(255, 200, 80, 0.6)" : "transparent",
                fontWeight: isToday ? "bold" : "normal",
              }}
            >
              {day || ""}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
