"use client";
import { BadgeCheck, Banknote, CreditCard, FileCheck2, PackageCheck, ShoppingBag, Split, Store, Truck, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COMPLIANCE } from "@/config/compliance";
import { formatInr } from "@/lib/format";

type Icon = typeof Truck;
type Lane = { name: string; color: string; soft: string; steps: { label: string[]; icon: Icon }[] };

const TRUNK: { label: string[]; icon: Icon }[] = [
  { label: ["Place your order"], icon: ShoppingBag },
  { label: ["Choose Courier", "or Store Pickup"], icon: Split },
];

const LANES: Lane[] = [
  {
    name: "Doorstep delivery",
    color: "#0F766E",
    soft: "#E6F4F1",
    steps: [
      { label: ["Online KYC"], icon: FileCheck2 },
      { label: ["Online payment", "after KYC approval"], icon: CreditCard },
      { label: ["Doorstep delivery", "(show original passport)"], icon: Truck },
    ],
  },
  {
    name: "Store pickup - express",
    color: "#4338CA",
    soft: "#EEF2FF",
    steps: [
      { label: ["Online KYC", "(optional, saves time)"], icon: FileCheck2 },
      { label: ["Online payment", "after KYC approval"], icon: CreditCard },
      { label: ["Pick up from store"], icon: PackageCheck },
    ],
  },
  {
    name: "Store pickup - walk in",
    color: "#B45309",
    soft: "#FEF3C7",
    steps: [
      { label: ["KYC at the store"], icon: BadgeCheck },
      { label: ["Pay at the store"], icon: Wallet },
      { label: ["Pick up from store"], icon: Store },
    ],
  },
];

const LANE_Y = [96, 262, 428];
const TRUNK_X = [96, 300];
const TRUNK_Y = 262;
const STEP_X = [640, 840, 1040];
const R = 30;

function Node({ x, y, color, soft, icon: I, n, label, shown, delay }: { x: number; y: number; color: string; soft: string; icon: Icon; n: number; label: string[]; shown: boolean; delay: number }) {
  return (
    <g style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(6px)", transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms` }}>
      <circle cx={x} cy={y} r={R} fill={soft} stroke={color} strokeOpacity="0.25" />
      <I x={x - 12} y={y - 12} width={24} height={24} color={color} strokeWidth={1.75} aria-hidden="true" />
      <circle cx={x + 22} cy={y - 22} r={10} fill={color} />
      <text x={x + 22} y={y - 18.5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
        {n}
      </text>
      <text textAnchor="middle" fontSize="13.5" fill="#0E1726" fontWeight="500">
        {label.map((l, i) => (
          <tspan key={i} x={x} y={y + R + 22 + i * 17} fill={i === 0 ? "#0E1726" : "#5B6474"} fontWeight={i === 0 ? 500 : 400}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const draw = (delay: number) => ({
    strokeDasharray: 1,
    strokeDashoffset: shown ? 0 : 1,
    transition: `stroke-dashoffset 900ms cubic-bezier(.4,0,.2,1) ${delay}ms`,
  });

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-28">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Simple & compliant</p>
        <h2 id="how-title" className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <p className="mt-3 text-ink-muted">Two steps to start, then pick the lane that suits you.</p>
      </div>

      <div ref={ref} className="mt-10 rounded-[20px] border border-line bg-surface p-4 sm:p-8">
        {/* desktop / tablet illustration */}
        <svg viewBox="0 0 1160 540" className="hidden h-auto w-full md:block" role="img" aria-labelledby="how-svg-title how-svg-desc">
          <title id="how-svg-title">How it works</title>
          <desc id="how-svg-desc">
            Step 1 place your order, step 2 choose Courier or Store Pickup. Then three lanes: doorstep delivery with online KYC and online payment;
            store pickup express with optional online KYC and online payment; store pickup walk in with KYC and payment at the store.
          </desc>
          <g fontFamily="var(--font-inter), system-ui, sans-serif">
            {/* trunk connector */}
            <path d={`M${TRUNK_X[0] + R + 8} ${TRUNK_Y} H${TRUNK_X[1] - R - 8}`} pathLength={1} stroke="#0E1726" strokeOpacity="0.3" strokeWidth="2" fill="none" style={draw(150)} />
            {/* branches */}
            {LANES.map((lane, li) => (
              <path
                key={lane.name}
                d={`M${TRUNK_X[1] + R + 8} ${TRUNK_Y} C ${TRUNK_X[1] + 170} ${TRUNK_Y}, ${STEP_X[0] - 230} ${LANE_Y[li]}, ${STEP_X[0] - R - 8} ${LANE_Y[li]}`}
                pathLength={1}
                stroke={lane.color}
                strokeOpacity="0.55"
                strokeWidth="2"
                fill="none"
                style={draw(450 + li * 120)}
              />
            ))}
            {/* lane connectors */}
            {LANES.map((lane, li) =>
              [0, 1].map((si) => (
                <path
                  key={`${lane.name}-${si}`}
                  d={`M${STEP_X[si] + R + 8} ${LANE_Y[li]} H${STEP_X[si + 1] - R - 8}`}
                  pathLength={1}
                  stroke={lane.color}
                  strokeOpacity="0.55"
                  strokeWidth="2"
                  strokeDasharray="1"
                  fill="none"
                  style={draw(900 + li * 120 + si * 200)}
                />
              )),
            )}
            {/* lane labels */}
            {LANES.map((lane, li) => (
              <g key={`label-${lane.name}`} style={{ opacity: shown ? 1 : 0, transition: `opacity 500ms ease ${700 + li * 120}ms` }}>
                <rect x={STEP_X[0] - R - 2} y={LANE_Y[li] - 74} rx="12" width={lane.name.length * 7.6 + 24} height="24" fill={lane.soft} />
                <text x={STEP_X[0] - R + 10} y={LANE_Y[li] - 57.5} fontSize="12.5" fontWeight="600" fill={lane.color}>
                  {lane.name}
                </text>
              </g>
            ))}
            {TRUNK.map((s, i) => (
              <Node key={i} x={TRUNK_X[i]} y={TRUNK_Y} color="#0E1726" soft="#F3F2EE" icon={s.icon} n={i + 1} label={s.label} shown={shown} delay={i * 150} />
            ))}
            {LANES.map((lane, li) =>
              lane.steps.map((s, si) => (
                <Node
                  key={`${lane.name}-${si}`}
                  x={STEP_X[si]}
                  y={LANE_Y[li]}
                  color={lane.color}
                  soft={lane.soft}
                  icon={s.icon}
                  n={si + 3}
                  label={s.label}
                  shown={shown}
                  delay={700 + li * 120 + si * 200}
                />
              )),
            )}
          </g>
        </svg>

        {/* mobile: shared steps then three lane cards */}
        <div className="md:hidden">
          <ol className="grid gap-3">
            {TRUNK.map((s, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F3F2EE]">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span>
                </span>
                <span className="text-sm font-medium">{s.label.join(" ")}</span>
              </li>
            ))}
          </ol>
          <div className="my-3 ml-[27px] h-5 border-l-2 border-dashed border-line" aria-hidden="true" />
          <div className="grid gap-3">
            {LANES.map((lane) => (
              <div key={lane.name} className="rounded-2xl border p-4" style={{ borderColor: `${lane.color}33`, background: `${lane.soft}80` }}>
                <p className="text-sm font-semibold" style={{ color: lane.color }}>
                  {lane.name}
                </p>
                <ol className="mt-3 grid gap-2.5">
                  {lane.steps.map((s, si) => (
                    <li key={si} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface" style={{ color: lane.color }}>
                        <s.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-sm">
                        <span className="mr-1 font-semibold" style={{ color: lane.color }}>
                          {si + 3}.
                        </span>
                        {s.label.join(" ")}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        {/* PAY-1: highly visible cash-limit notice (amount from config, never hard-coded) */}
        <div
          role="note"
          data-testid="cash-limit-callout"
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-warn/30 bg-warn-soft p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-warn text-white">
            <Banknote className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-warn">RBI rule · cash payments</p>
            <p className="mt-1 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
              Cash accepted only up to{" "}
              <span className="num whitespace-nowrap text-warn">{formatInr(COMPLIANCE.pay.cashAcceptanceLimitInr, 0)}</span>
            </p>
            <p className="mt-1.5 text-sm leading-6 text-ink/75">
              Above this, pay by card, UPI, bank transfer or cheque / DD from your own account. Purchases for the same trip within{" "}
              {COMPLIANCE.pay.aggregationWindowDays} days are added together.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
