const KIOSK_ATTR = "data-ambient-kiosk"

/** Apply Retrowave visuals for ambient kiosk without persisting theme preference. */
export function enableAmbientKioskTheme() {
  const el = document.documentElement
  const hadRetrowave = el.classList.contains("retrowave")
  el.setAttribute(KIOSK_ATTR, "true")
  if (!hadRetrowave) {
    el.classList.add("retrowave")
  }
  return hadRetrowave
}

export function disableAmbientKioskTheme(hadRetrowave: boolean) {
  const el = document.documentElement
  el.removeAttribute(KIOSK_ATTR)
  if (!hadRetrowave) {
    el.classList.remove("retrowave")
  }
}

export function isAmbientKioskActive() {
  return document.documentElement.getAttribute(KIOSK_ATTR) === "true"
}
