/** GST added to a plan's listed price. 18% is India's rate for this kind of service; override with GST_RATE_PERCENT. */
export function gstRatePercent(): number {
  const configured = Number(process.env.GST_RATE_PERCENT);
  return Number.isFinite(configured) && configured >= 0 && configured <= 50 ? configured : 18;
}
