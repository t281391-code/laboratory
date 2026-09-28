"use client";
import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import "./GlobalFocus.css";

/**
 * One shared, pointer-driven focus frame (TrueFocus-style corner brackets).
 *
 * - Event delegation: a single `pointerover` listener finds the nearest focus
 *   target with `closest()`. No per-component listeners, no React state.
 * - The frame is one `motion.div`; x/y/width/height are spring motion values,
 *   so moving between targets glides and resizes instead of remounting.
 * - While a target is hovered a tiny rAF loop re-reads that ONE element's rect,
 *   so scrolling, resizing, layout changes and moving elements stay tracked.
 * - The frame lives in the top layer (Popover API) so it also shows above open
 *   `<dialog>` modals. Where unsupported it falls back to a fixed element.
 *
 * Mark meaningful containers with `data-focus-target`. The extra selectors
 * below already cover the app's existing buttons, links, cards and rows.
 * Opt out with `data-focus-ignore`.
 */
export const FOCUS_SELECTOR = [
  "[data-focus-target]",
  "a[href]",
  "button",
  "select",
  "summary",
  '[role="button"]',
  '[role="tab"]',
  ".form-card",
  ".equipment-card",
  ".metric-card",
  ".data-table:not(.product-module-table) tbody tr",
  ".checklist > label",
  ".guided-confirm",
].join(",");
const IGNORE_SELECTOR =
  '[data-focus-ignore], :disabled, [aria-disabled="true"], .table-primary, .sidebar-scrim, .skip-link';

const SPRING = { stiffness: 350, damping: 30, mass: 0.6 };
const PADDING = 6;
const LEAVE_DELAY = 90;

type Box = { x: number; y: number; w: number; h: number };

function resolveTarget(node: EventTarget | null): Element | null {
  let el = node instanceof Element ? node.closest(FOCUS_SELECTOR) : null;
  // A disabled / ignored control hands the frame to the nearest parent target.
  while (el && el.matches(IGNORE_SELECTOR)) {
    el = el.parentElement ? el.parentElement.closest(FOCUS_SELECTOR) : null;
  }
  return el;
}

function measure(el: Element): Box | null {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.width * r.height > window.innerWidth * window.innerHeight * 0.85)
    return null;
  return {
    x: r.left - PADDING,
    y: r.top - PADDING,
    w: r.width + PADDING * 2,
    h: r.height + PADDING * 2,
  };
}

const sameBox = (a: Box, b: Box) =>
  Math.abs(a.x - b.x) < 0.4 &&
  Math.abs(a.y - b.y) < 0.4 &&
  Math.abs(a.w - b.w) < 0.4 &&
  Math.abs(a.h - b.h) < 0.4;

export default function GlobalFocus() {
  const frameRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const reduceRef = useRef(false);
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);
  const width = useSpring(0, SPRING);
  const height = useSpring(0, SPRING);
  const opacity = useMotionValue(0);

  useEffect(() => {
    reduceRef.current = !!reduceMotion;
  }, [reduceMotion]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let current: Element | null = null;
    let last: Box = { x: 0, y: 0, w: 0, h: 0 };
    let raf = 0;
    let leaveTimer = 0;
    let layerOwner: Element | null = null;
    let fade: { stop: () => void } | null = null;

    const showLayer = () => {
      if (typeof frame.showPopover !== "function") return;
      try {
        if (frame.matches(":popover-open")) frame.hidePopover();
        frame.showPopover();
      } catch {
        // The frame simply stays a fixed element.
      }
    };
    showLayer();

    const settled = () =>
      Math.abs(x.get() - last.x) < 0.75 &&
      Math.abs(y.get() - last.y) < 0.75 &&
      Math.abs(width.get() - last.w) < 0.75 &&
      Math.abs(height.get() - last.h) < 0.75;

    const write = (box: Box, glide: boolean) => {
      if (glide && !reduceRef.current) {
        x.set(box.x);
        y.set(box.y);
        width.set(box.w);
        height.set(box.h);
      } else {
        x.jump(box.x);
        y.jump(box.y);
        width.jump(box.w);
        height.jump(box.h);
      }
      last = box;
    };

    const fadeTo = (value: number) => {
      fade?.stop();
      fade = animate(opacity, value, {
        duration: reduceRef.current ? 0 : value ? 0.16 : 0.24,
        ease: "easeOut",
      });
    };

    const loop = () => {
      if (!current) {
        raf = 0;
        return;
      }
      const box = current.isConnected ? measure(current) : null;
      if (!box) {
        release();
        return;
      }
      // Still travelling -> keep gliding to the (moved) target; already
      // settled -> stay glued to it instantly (scroll, resize, layout shifts).
      if (!sameBox(box, last)) write(box, !settled());
      raf = requestAnimationFrame(loop);
    };

    function release() {
      window.clearTimeout(leaveTimer);
      current = null;
      cancelAnimationFrame(raf);
      raf = 0;
      fadeTo(0);
    }

    const focus = (target: Element | null) => {
      window.clearTimeout(leaveTimer);
      if (!target) {
        if (current) release();
        return;
      }
      if (target === current) return;
      const box = measure(target);
      if (!box) {
        if (current) release();
        return;
      }
      // Reappear in place when fully hidden; glide when coming from another
      // target (or from a fade-out that has not finished yet).
      const hidden = !current && opacity.get() < 0.05;
      current = target;
      const owner = target.closest("dialog");
      if (owner !== layerOwner) {
        layerOwner = owner;
        showLayer();
      }
      write(box, !hidden);
      fadeTo(1);
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const scheduleLeave = () => {
      window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => focus(null), LEAVE_DELAY);
    };
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = resolveTarget(event.target);
      if (target) focus(target);
      else if (current) scheduleLeave();
    };
    const onLeaveWindow = () => focus(null);

    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    window.addEventListener("blur", onLeaveWindow);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener(
        "pointerleave",
        onLeaveWindow,
      );
      window.removeEventListener("blur", onLeaveWindow);
      window.clearTimeout(leaveTimer);
      cancelAnimationFrame(raf);
      fade?.stop();
      try {
        if (typeof frame.hidePopover === "function") frame.hidePopover();
      } catch {
        // Not shown, nothing to hide.
      }
    };
  }, [x, y, width, height, opacity]);

  return (
    <motion.div
      ref={frameRef}
      className="global-focus"
      popover="manual"
      aria-hidden="true"
      style={{ x, y, width, height, opacity }}
    >
      <span className="global-focus__corner global-focus__corner--tl" />
      <span className="global-focus__corner global-focus__corner--tr" />
      <span className="global-focus__corner global-focus__corner--bl" />
      <span className="global-focus__corner global-focus__corner--br" />
    </motion.div>
  );
}
