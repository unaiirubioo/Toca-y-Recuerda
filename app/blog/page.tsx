import { redirect } from "next/navigation";

// El apartado "Blog" se renombró a "Preguntas y respuestas" (spec).
// Mantenemos esta redirección por si algún enlace antiguo sigue apuntando aquí.
export default function LegacyBlogRedirect() {
  redirect("/preguntas-y-respuestas");
}
