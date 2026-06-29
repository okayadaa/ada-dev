"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Loader from "./loader";
import ThreeScene from "./threeScene";

const MIN_DISPLAY_MS = 700;
const FADE_OUT_MS = 400;

export default function SceneWithLoader() {
  const [sceneReady, setSceneReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(true);
  const mountTimeRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  useEffect(() => {
    if (!sceneReady) return;

    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    const dismissTimer = window.setTimeout(() => {
      setDismissed(true);
    }, remaining);

    return () => window.clearTimeout(dismissTimer);
  }, [sceneReady]);

  useEffect(() => {
    if (!dismissed) return;

    const unmountTimer = window.setTimeout(() => {
      setMounted(false);
    }, FADE_OUT_MS);

    return () => window.clearTimeout(unmountTimer);
  }, [dismissed]);

  return (
    <>
      <ThreeScene onReady={handleSceneReady} />
      {mounted ? <Loader hidden={dismissed} /> : null}
    </>
  );
}
