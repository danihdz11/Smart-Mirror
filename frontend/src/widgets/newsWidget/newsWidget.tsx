import React, { useEffect, useState } from "react";

interface Article {
  title: string;
  description: string;
  url: string;
  source: { name: string };
}

const NewsWidget: React.FC = () => {
  const [news, setNews] = useState<Article[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/news");
        const data = await response.json();
        setNews((data?.data || []).slice(0, 5));
      } catch (error) {
        console.error("Error al cargar noticias:", error);
      }
    };
    fetchNews();
  }, []);

  // return (
  //   <div className="bg-[rgba(253,235,216,0.4)] rounded-2xl shadow-md p-4 text-black w-72 max-w-full overflow-hidden"> 
  //     <h2 className="text-xl text-[#5B3000] font-bold mb-2">Noticias del día</h2>
  //     <ul className="text-sm space-y-2">
  //       {news.length > 0 ? (
  //         news.map((article, index) => (
  //           <li key={index}>
  //             <a
  //               href={article.url}
  //               target="_blank"
  //               rel="noopener noreferrer"
  //               className="hover:underline text-[#8F4C00] break-words"
  //             >
  //               {article.title}
  //             </a>
  //             <p className="text-xs text-gray-700">{article.source?.name}</p>
  //           </li>
  //         ))
  //       ) : (
  //         <p>Cargando noticias...</p>
  //       )}
  //     </ul>
  //   </div>
  // );

  return (
  <div className="bg-[rgba(253,235,216,0.4)] backdrop-blur-sm rounded-xl shadow-sm p-4 w-72 max-w-full overflow-hidden text-[#5B3000]">
    <h2 className="text-lg font-semibold mb-3 tracking-wide">
      Noticias del día
    </h2>

    <ul className="text-sm space-y-3">
      {news.length > 0 ? (
        news.map((article, index) => (
          <li key={index} className="group">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8F4C00] group-hover:text-[#5B3000] transition-colors duration-150 font-medium leading-snug"
            >
              {article.title}
            </a>
            <p className="text-xs text-[#5B3000]/70 mt-0.5">
              {article.source?.name}
            </p>
          </li>
        ))
      ) : (
        <p className="text-[#5B3000]/70 text-sm">Cargando noticias...</p>
      )}
    </ul>
  </div>
);
};

export default NewsWidget;
