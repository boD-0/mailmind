"use client";
import { useParams } from "next/navigation";

export default function ProjectDetailsPage() {
  const params = useParams();
  const id = params.id;

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h1>Detalii Proiect: {id}</h1>
      <p>Pagina este în construcție...</p>
    </div>
  );
}