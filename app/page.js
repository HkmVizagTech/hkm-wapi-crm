"use client";
import { useEffect } from "react";
import { useRouter }  from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard"); }, []);
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#07090f" }}>
      <div style={{ width:36, height:36, border:"3px solid #1c2a3f",
        borderTopColor:"#25d366", borderRadius:"50%",
        animation:"spin .7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
