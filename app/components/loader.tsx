"use client";

import styles from "./loader.module.css";

type LoaderProps = {
  ready: boolean;
  onComplete: () => void;
};

export default function Loader({ ready, onComplete }: LoaderProps) {
  return (
    <div
      className={`${styles.overlay} ${ready ? styles.blinking : ""}`}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        // Eyelid animations bubble too; only the focus animation ends the intro.
        if (event.target === event.currentTarget) onComplete();
      }}
    >
      <div className={`${styles.eyelid} ${styles.upper}`} />
      <div className={`${styles.eyelid} ${styles.lower}`} />
    </div>
  );
}
