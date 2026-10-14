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
          <div className={styles.writing}>
          <h2 className={styles.title}>About Me:</h2>
          <p className={styles.body}>
          Hi, I'm Ada, a developer based in New York City. I'm passionate about building interactive web experiences and exploring 3D web development, data analytics, and emerging AI technologies. I enjoy transforming ideas into intuitive, user-centered applications that blend creativity with technical problem-solving.
<br></br><br></br> 
My experience spans both frontend and backend development, and I'm always looking for opportunities to expand my skills through hands-on projects. I primarily work with React, Next.js, Three.js, TypeScript, Python, FastAPI, AWS, Terraform, and Vercel. Whether I'm experimenting with new technologies or refining existing applications, I'm motivated by continuous learning and creating solutions that are both functional and engaging.
          </p>
          <section className={styles.projects} aria-labelledby="side-projects-title">
            <h3 id="side-projects-title" className={styles.projectsTitle}>Side projects</h3>
            <a
              className={styles.projectLink}
              href="https://www.chaicoffeelit.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.chaicoffeelit.org/
            </a>
            <a
              className={styles.projectLink}
              href="https://pawscare-plus.streamlit.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://pawscare-plus.streamlit.app/
            </a>
          </section>
          </div>
          <aside className={styles.doodles} aria-hidden="true">
            <div className={styles.sketch}>
              <svg viewBox="0 0 120 90" fill="none">
                <path d="M15 18L103 15L106 72L17 75Z M44 18L46 73 M74 17L76 72" />
                <path d="M28 35v20m0-12c-13-12-13 4 0 5m0-9c13-13 13 4 0 5 M59 32v21m0-12c-13-12-13 4 0 5m0-9c13-13 13 4 0 5 M89 32v21m0-12c-13-12-13 4 0 5m0-9c13-13 13 4 0 5" />
                <path d="M24 65h12m17-2h13m16-1h13" strokeDasharray="2 4" />
              </svg>
              <span>little veggie beds</span>
            </div>
            <div className={styles.sketch}>
              <svg viewBox="0 0 120 90" fill="none">
                <circle cx="58" cy="37" r="14" />
                <path d="M57 13V5m19 18l8-8m-4 22h12M75 53l9 8M57 59v10M39 53l-8 8M35 36H24m15-15l-8-8 M18 78c22-8 57-8 85-3m-9-7l10 7-9 8" />
              </svg>
              <span>sun goes this way →</span>
            </div>
            <div className={styles.sketch}>
              <svg viewBox="0 0 120 90" fill="none">
                <path d="M58 80c3-21 1-34-2-46 M57 55C31 56 29 38 29 38c20-3 30 8 28 17 M58 66c24 0 31-19 31-19-23-4-29 10-31 19" />
                <circle cx="55" cy="24" r="8" />
                <path d="M49 16c-18-19 2-26 7-5 5-22 24-12 8 5 23-8 29 13 7 14 18 14 2 28-10 9-3 24-24 19-16-3-22 7-26-15-5-16" />
              </svg>
              <span>save a spot for these ♡</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
