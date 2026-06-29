"use client";

import styles from "./loader.module.css";

type LoaderProps = {
  hidden: boolean;
};

const PETAL_COUNT = 10;

export default function Loader({ hidden }: LoaderProps) {
  return (
    <div
      className={`${styles.overlay} ${hidden ? styles.overlayHidden : ""}`}
      aria-hidden={hidden}
      role="presentation"
    >
      <div className={styles.sunflower} aria-hidden="true">
        {Array.from({ length: PETAL_COUNT }).map((_, i) => (
          <span
            key={i}
            className={styles.petal}
            style={
              {
                "--a": `${(360 / PETAL_COUNT) * i}deg`,
                "--delay": `${(i / PETAL_COUNT) * 1.8}s`,
              } as React.CSSProperties
            }
          />
        ))}
        <span className={styles.center} />
      </div>
    </div>
  );
}
