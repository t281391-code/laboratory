"use client";
import { useEffect, useRef, useState } from "react";
import { User, Lock } from "lucide-react";
import { api } from "@/lib/api";
import styles from "./lamp-login.module.css";

type Firefly = { id: number; vars: React.CSSProperties };
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
function makeFireflies(count: number): Firefly[] {
  return Array.from({ length: count }, (_, id) => {
    const vars: Record<string, string> = { "--size": `${rand(3, 7)}px`, "--duration": `${rand(25, 65)}s`, "--delay": `${rand(0, 3)}s` };
    for (let n = 1; n <= 4; n++) {
      vars[`--x${n}`] = `${rand(0, 100)}vw`;
      vars[`--y${n}`] = `${rand(0, 100)}vh`;
    }
    return { id, vars: vars as React.CSSProperties };
  });
}

const MAX_PULL = 46;
const PULL_THRESHOLD = 16;

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [swinging, setSwinging] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [fireflies, setFireflies] = useState<Firefly[]>([]);
  const swingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragged = useRef(false);
  const dragTriggered = useRef(false);
  const wasOnAtStart = useRef(false);
  const startY = useRef(0);

  useEffect(() => {
    // Generated client-side only: Math.random() would mismatch the SSR-rendered markup during hydration.
    setFireflies(makeFireflies(25));
  }, []);

  const toggleLamp = () => {
    setSwinging(true);
    setFlicker(true);
    setOn((v) => !v);
    clearTimeout(swingTimer.current);
    swingTimer.current = setTimeout(() => setSwinging(false), 900);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragged.current = false;
    dragTriggered.current = false;
    wasOnAtStart.current = on;
    startY.current = event.clientY;
    setPulling(true);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.buttons === 0 && event.pointerType === "mouse") return;
    const delta = event.clientY - startY.current;
    if (Math.abs(delta) > 4) dragged.current = true;
    setPullOffset(Math.max(0, Math.min(MAX_PULL, delta)));
    // Pulling down while off commits to turning on right away; the slow CSS
    // transition on the card/cone/glow then does the actual reveal over several
    // seconds, independent of how fast the cord itself was pulled.
    if (!wasOnAtStart.current && !dragTriggered.current && delta > PULL_THRESHOLD) {
      dragTriggered.current = true;
      setFlicker(true);
      setOn(true);
    }
  };
  const endPull = () => {
    setPulling(false);
    if (wasOnAtStart.current && dragged.current && pullOffset > PULL_THRESHOLD) {
      setSwinging(true);
      setFlicker(true);
      setOn(false);
      clearTimeout(swingTimer.current);
      swingTimer.current = setTimeout(() => setSwinging(false), 900);
    }
    setPullOffset(0);
  };
  const onClickCord = () => {
    if (dragged.current) { dragged.current = false; return; }
    toggleLamp();
  };

  const reveal = on ? 1 : 0;

  return (
    <main
      id="main-content"
      className={`${styles.scene} ${on ? styles.on : ""} ${flicker ? styles.flicker : ""}`}
      style={{ "--reveal": reveal } as React.CSSProperties}
      onAnimationEnd={() => setFlicker(false)}
    >
      <div className={styles.ambientGlow} aria-hidden="true" />

      <div className={styles.fireflies} aria-hidden="true">
        {fireflies.map((f) => (
          <span key={f.id} className={styles.firefly} style={f.vars} />
        ))}
      </div>

      <div className={styles.lamp} aria-hidden="true">
        <div className={styles.cone} />
        <div className={styles.shade}>
          <div className={styles.shadeInner} />
        </div>
        <div className={styles.shadeRim} />
        <div className={styles.bulb} />
        <button
          type="button"
          className={`${styles.cordButton} ${swinging ? styles.swing : ""} ${pulling ? styles.pulling : ""}`}
          style={{ "--pull": `${pullOffset}px` } as React.CSSProperties}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPull}
          onPointerCancel={endPull}
          onClick={onClickCord}
          aria-label={on ? "Гэрлийг унтраах" : "Гэрлийг асаах"}
        >
          <div className={styles.cordString} />
          <div className={styles.cordBead} />
        </button>
        <div className={styles.pole} />
        <div className={styles.base} />
        <div className={styles.floorGlow} />
      </div>

      <div className={styles.cardWrap}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Улаан баатар БҮК · Лаборатори</p>
          <h1 className={styles.title}>Тавтай морилно уу</h1>
          <p className={styles.subtitle}>Өөрийн акаунтад нэвтрэхийн тулд мэдээллээ оруулна уу.</p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setBusy(true);
              setError("");
              try {
                await api("/api/auth/login/", {
                  method: "POST",
                  body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
                });
                location.assign("/");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Нэвтэрч чадсангүй.");
                setBusy(false);
              }
            }}
          >
            <label className={styles.field}>
              <User size={16} />
              <input name="username" required autoComplete="username" maxLength={64} placeholder="Нэвтрэх нэр" aria-label="Нэвтрэх нэр" autoFocus />
            </label>
            <label className={styles.field}>
              <Lock size={16} />
              <input name="password" type="password" required autoComplete="current-password" maxLength={128} placeholder="Нууц үг" aria-label="Нууц үг" />
            </label>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <button className={styles.submit} disabled={busy}>{busy ? "Нэвтэрч байна…" : "Нэвтрэх"}</button>
          </form>
          <p className={styles.hint}>Шинэ хэрэглэгчийг зөвхөн администратор бүртгэнэ.</p>
        </section>
      </div>
    </main>
  );
}
