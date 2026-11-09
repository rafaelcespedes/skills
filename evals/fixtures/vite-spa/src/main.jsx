import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, useParams } from "react-router-dom";
import data from "./data/work.json";
import "./style.css";
function Home() { return <main><h1>{data.me.name}</h1><p>{data.me.headline}</p>{data.work.map((w) => <p key={w.id}><Link to={`/work/${w.id}`}>{w.name}</Link></p>)}</main>; }
function Work() { const { id } = useParams(); const w = data.work.find((x) => x.id === id); return <article><h1>{w.name}</h1><p>{w.what}</p><div dangerouslySetInnerHTML={{ __html: w.details }} /></article>; }
createRoot(document.getElementById("root")).render(
  <BrowserRouter><Routes><Route path="/" element={<Home />} /><Route path="/work/:id" element={<Work />} /></Routes>
  <footer><a href={data.me.instagram}>Instagram</a></footer></BrowserRouter>);
