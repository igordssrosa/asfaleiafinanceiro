import { useEffect, useState } from "react";

type ApiResponse = {
  status: string;
  message: string;
};

function App() {
  const [message, setMessage] = useState("Conectando ao servidor...");

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;

    async function checkApi() {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Erro ao acessar o servidor");
        }

        const data: ApiResponse = await response.json();
        setMessage(data.message);
      } catch {
        setMessage("Não foi possível conectar ao backend");
      }
    }

    checkApi();
  }, []);

  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "40px",
      }}
    >
      <h1>Sistema Financeiro Asfaleia</h1>
      <p>{message}</p>
    </main>
  );
}

export default App;