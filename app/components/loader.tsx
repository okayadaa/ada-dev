"use client";

/* eslint-disable @next/next/no-img-element */
import styles from "./loader.module.css";

type LoaderProps = {
  hidden: boolean;
};

export default function Loader({ hidden }: LoaderProps) {
  return (
    <div
      className={`${styles.overlay} ${hidden ? styles.overlayHidden : ""}`}
      aria-hidden={hidden}
      role="presentation"
    >
      <img className={styles.seedling} src="/seedling.svg" alt="" aria-hidden="true" />
    </div>
  );
}
