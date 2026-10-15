"use client";

import { useCallback, useState } from "react";

import Loader from "./loader";
import ThreeScene from "./threeScene";

export default function SceneWithLoader() {
  const [sceneReady, setSceneReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setDismissed(true);
  }, []);

  return (
    <>
      <div
        ref={(node) => { node?.toggleAttribute("inert", !dismissed); }}
        aria-hidden={!dismissed}
      >
        <ThreeScene onReady={handleSceneReady} bloom={dismissed} />
      </div>
      {!dismissed ? <Loader ready={sceneReady} onComplete={handleIntroComplete} /> : null}
    </>
  );
}
