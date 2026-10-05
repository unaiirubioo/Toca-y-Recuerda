"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Este fallback sustituye a TODO el layout (incluida <html>) si algo
  // revienta antes de que el propio layout llegue a renderizar — por
  // eso es deliberadamente mínimo, con estilos en línea, sin depender
  // de globals.css, Tailwind ni otros componentes.
  return (
    <html lang="es">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F7F4EC",
          color: "#212F3C",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Ups, algo ha ido mal</h1>
          <p style={{ color: "#4C5F73", marginBottom: 20 }}>
            No ha sido culpa tuya. Inténtalo otra vez en un momento.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#D8933B",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
