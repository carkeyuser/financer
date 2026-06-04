"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef, useSyncExternalStore } from "react"

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
  mq.addEventListener("change", onStoreChange)
  return () => mq.removeEventListener("change", onStoreChange)
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

const subscribeClient = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

const STAR_COUNT = 100
const METEOR_CYAN = { mid: "rgba(80, 220, 255, 0.35)", head: "rgba(180, 255, 255, 0.95)" }
const METEOR_MAGENTA = { mid: "rgba(255, 100, 220, 0.35)", head: "rgba(255, 200, 255, 0.95)" }

type Star = { x: number; y: number; r: number; opacity: number; twinklePhase: number }

type Meteor = {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  life: number
  maxLife: number
  hue: "magenta" | "cyan"
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function createStars(width: number, height: number): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: randomBetween(0.4, 1.4),
    opacity: randomBetween(0.25, 0.95),
    twinklePhase: Math.random() * Math.PI * 2,
  }))
}

function spawnMeteor(width: number, height: number): Meteor {
  const hue = Math.random() > 0.45 ? "cyan" : "magenta"
  const x = randomBetween(width * 0.1, width * 0.95)
  const y = randomBetween(-40, height * 0.35)
  const speed = randomBetween(10, 18)
  const angle = randomBetween(Math.PI * 0.55, Math.PI * 0.72)
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: randomBetween(48, 110),
    life: 0,
    maxLife: randomBetween(28, 48),
    hue,
  }
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  time: number,
  reducedMotion: boolean
) {
  for (const star of stars) {
    const twinkle = reducedMotion
      ? 1
      : 0.65 + 0.35 * Math.sin(time * 0.002 + star.twinklePhase)
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`
    ctx.fill()
  }
}

function drawMeteor(ctx: CanvasRenderingContext2D, meteor: Meteor) {
  const progress = meteor.life / meteor.maxLife
  const fade = progress < 0.15 ? progress / 0.15 : progress > 0.7 ? (1 - progress) / 0.3 : 1
  const tailX = meteor.x - (meteor.vx / Math.hypot(meteor.vx, meteor.vy)) * meteor.length
  const tailY = meteor.y - (meteor.vy / Math.hypot(meteor.vx, meteor.vy)) * meteor.length

  const colors = meteor.hue === "cyan" ? METEOR_CYAN : METEOR_MAGENTA
  const gradient = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y)
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)")
  gradient.addColorStop(0.45, colors.mid)
  gradient.addColorStop(1, colors.head)

  ctx.save()
  ctx.globalAlpha = fade * 0.85
  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(meteor.x, meteor.y)
  ctx.stroke()

  ctx.fillStyle = colors.head
  ctx.beginPath()
  ctx.arc(meteor.x, meteor.y, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function RetrowaveAmbience() {
  const { resolvedTheme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const meteorsRef = useRef<Meteor[]>([])
  const nextMeteorAtRef = useRef(0)
  const rafRef = useRef<number>(0)
  const mounted = useSyncExternalStore(subscribeClient, getClientSnapshot, getServerSnapshot)
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false
  )

  const active = mounted && resolvedTheme === "retrowave"

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      starsRef.current = createStars(width, height)
      nextMeteorAtRef.current = performance.now() + randomBetween(2000, 5000)
    }

    resize()
    window.addEventListener("resize", resize)

    const tick = (time: number) => {
      if (document.visibilityState === "hidden") {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      ctx.clearRect(0, 0, width, height)
      drawStars(ctx, starsRef.current, time, reducedMotion)

      if (!reducedMotion) {
        if (time >= nextMeteorAtRef.current && meteorsRef.current.length < 2) {
          meteorsRef.current.push(spawnMeteor(width, height))
          nextMeteorAtRef.current = time + randomBetween(2000, 5000)
        }

        meteorsRef.current = meteorsRef.current.filter((meteor) => {
          meteor.life += 1
          meteor.x += meteor.vx
          meteor.y += meteor.vy
          if (meteor.life <= meteor.maxLife) {
            drawMeteor(ctx, meteor)
            return true
          }
          return false
        })
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(rafRef.current)
      meteorsRef.current = []
    }
  }, [active, reducedMotion])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}
