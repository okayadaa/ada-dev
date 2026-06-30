"use client";

import { Caveat } from "next/font/google";
import { useEffect, useState } from "react";

import styles from "./aboutModal.module.css";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600"],
});

const EXIT_DURATION = 200;

type AboutModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const timeout = window.setTimeout(() => setRendered(false), EXIT_DURATION);
    return () => window.clearTimeout(timeout);
  }, [open, rendered]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!rendered) return null;

  return (
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="About me"
      onClick={onClose}
    >
      <div
        className={`${styles.card} ${closing ? styles.cardClosing : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <div className={`${styles.page} ${caveat.className}`}>
          <h2 className={styles.title}>About Me:</h2>
          <p className={styles.body}>
          Hi, I'm Ada, a developer based in New York City. I'm passionate about building interactive web experiences and exploring 3D web development, data analytics, and emerging AI technologies. I enjoy transforming ideas into intuitive, user-centered applications that blend creativity with technical problem-solving.
<br></br><br></br> 
My experience spans both frontend and backend development, and I'm always looking for opportunities to expand my skills through hands-on projects. I primarily work with React, Next.js, Three.js, TypeScript, Python, FastAPI, AWS, Terraform, and Vercel. Whether I'm experimenting with new technologies or refining existing applications, I'm motivated by continuous learning and creating solutions that are both functional and engaging.
          </p>
        </div>
      </div>
    </div>
  );
}
