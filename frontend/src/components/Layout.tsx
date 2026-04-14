import { ReactNode } from "react";
import Navbar from "./Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 56 }}>
        {children}
      </div>
    </>
  );
}
