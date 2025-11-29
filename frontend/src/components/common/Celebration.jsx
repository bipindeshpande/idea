import { useEffect, useRef } from "react";

/**
 * Celebration component that shows confetti animation for high scores
 * Professional but delightful - adds personality without being immature
 */
export default function Celebration({ score, message, show = true, onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!show || !canvasRef.current) return;

    // Simple confetti effect using canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const confetti = [];
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]; // Professional brand colors

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create confetti particles
    for (let i = 0; i < 50; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * confetti.length,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncrement: Math.random() * 0.07 + 0.05,
        tiltAngle: 0,
      });
    }

    let animationId;
    let frameCount = 0;
    const maxFrames = 180; // 3 seconds at 60fps

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confetti.forEach((c) => {
        ctx.beginPath();
        ctx.lineWidth = c.r / 2;
        ctx.strokeStyle = c.color;
        ctx.moveTo(c.x + c.tilt + c.r, c.y);
        ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r);
        ctx.stroke();

        c.tiltAngle += c.tiltAngleIncrement;
        c.y += (Math.cos(c.d) + 3 + c.r / 2) / 2;
        c.tilt = Math.sin(c.tiltAngle - c.r) * 15;
      });

      frameCount++;
      if (frameCount < maxFrames) {
        animationId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (onComplete) onComplete();
      }
    }

    draw();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}

/**
 * Get celebration message based on score
 * Professional but encouraging
 */
export function getCelebrationMessage(score) {
  if (score >= 9) {
    return { emoji: "🔥", message: "Your idea is on fire! Outstanding score!", color: "text-emerald-600" };
  }
  if (score >= 8) {
    return { emoji: "🚀", message: "Your idea is looking solid! Great score!", color: "text-emerald-600" };
  }
  if (score >= 7) {
    return { emoji: "✅", message: "Good foundation! Your idea has potential.", color: "text-amber-600" };
  }
  if (score >= 6) {
    return { emoji: "💪", message: "Potential detected! Refine and improve.", color: "text-amber-600" };
  }
  return { emoji: "🔄", message: "Back to the drawing board. You've got this!", color: "text-coral-600" };
}

