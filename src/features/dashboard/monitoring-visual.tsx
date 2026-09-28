"use client";

import { useId } from "react";

function Block({
  x,
  y,
  w,
  d,
  h,
  hot = false,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  hot?: boolean;
}) {
  const a = `${x},${y - h}`;
  const b = `${x + w},${y - w * 0.48 - h}`;
  const c = `${x + w + d},${y + (d - w) * 0.48 - h}`;
  const e = `${x + d},${y + d * 0.48 - h}`;
  return (
    <g
      className={hot ? "lab-block hot" : "lab-block"}
      strokeWidth=".8"
      strokeLinejoin="round"
    >
      <polygon
        points={`${a} ${b} ${c} ${e}`}
        fill={hot ? "#dd693e" : "#647680"}
        stroke={hot ? "#ff9a66" : "#81909a"}
      />
      <polygon
        points={`${a} ${e} ${x + d},${y + d * 0.48} ${x},${y}`}
        fill={hot ? "#743629" : "#273540"}
        stroke={hot ? "#cd6245" : "#52616c"}
      />
      <polygon
        points={`${e} ${c} ${x + w + d},${y + (d - w) * 0.48} ${x + d},${y + d * 0.48}`}
        fill={hot ? "#ab4b30" : "#3b4d57"}
        stroke={hot ? "#fb8550" : "#677984"}
      />
    </g>
  );
}

export function MonitoringVisual({
  paused,
  zoom,
  mode,
}: {
  paused: boolean;
  zoom: number;
  mode: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`lab-visual ${paused ? "paused" : ""}`}
      viewBox="0 0 680 510"
      role="img"
      aria-label="Лабораторийн шахалтын пресс, бетон сорьц, бэхжүүлэлтийн замын хөдөлгөөнт бүдүүвч"
    >
      <defs>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2a3942" />
          <stop offset="1" stopColor="#111c26" />
        </linearGradient>
        <linearGradient id={`${id}-scan`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ff6f36" stopOpacity=".03" />
          <stop offset="1" stopColor="#ff6f36" stopOpacity=".28" />
        </linearGradient>
        <pattern
          id={`${id}-grid`}
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M28 0H0V28"
            fill="none"
            stroke="#7296a2"
            strokeOpacity=".08"
          />
        </pattern>
        <filter
          id={`${id}-shadow`}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>
      <rect width="680" height="510" fill={`url(#${id}-grid)`} />
      <g fill="#6b7f8c" fontSize="8" fontFamily="monospace" opacity=".65">
        <text x="18" y="25">
          СХЕМАТИК ДҮРСЛЭЛ
        </text>
        <text x="18" y="40">
          ХЭМЖИЛТИЙН ЭХ ҮҮСВЭР БИШ
        </text>
        <text x="549" y="25">
          LAB / SECTOR 01
        </text>
        <text x="549" y="40">
          VIEW: ISOMETRIC
        </text>
      </g>
      <g
        style={{
          transform: `translate(340px, 270px) scale(${zoom}) translate(-340px, -270px)`,
          transition: "transform .25s ease",
        }}
      >
        <ellipse
          cx="344"
          cy="370"
          rx="242"
          ry="87"
          fill="#000"
          opacity=".4"
          filter={`url(#${id}-shadow)`}
        />
        <path
          d="M60 304 331 167 627 309 355 454Z"
          fill="#111b24"
          stroke="#3e505b"
        />
        <path
          d="M60 294 331 157 627 299 355 444Z"
          fill={`url(#${id}-floor)`}
          stroke="#62727a"
          strokeWidth="1.2"
        />
        <path
          d="M60 294V304L355 454V444M627 299V309M355 444 627 299"
          fill="none"
          stroke="#536671"
        />
        <g stroke="#76909d" strokeOpacity=".16" fill="none">
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={`M${83 + i * 22.4} ${282 - i * 11.3}l294 150 M${85 + i * 24.5} ${307 + i * 12.5}l270 -137`}
            />
          ))}
        </g>
        <path
          d="M82 294 332 169 604 299 355 432Z"
          fill="none"
          stroke="#ff854d"
          strokeOpacity=".45"
          strokeDasharray="6 9"
          className="lab-circuit"
        />
        <g opacity=".45" fill="none" stroke="#8fa6ad">
          <ellipse cx="340" cy="300" rx="189" ry="93" strokeDasharray="2 9" />
          <ellipse cx="340" cy="300" rx="199" ry="98" strokeOpacity=".3" />
        </g>
        {/* Curing beds and stored concrete specimens. */}
        {[0, 1, 2].map((row) => (
          <g key={row}>
            <Block x={94 + row * 28} y={291 + row * 14} w={107} d={19} h={10} />
            {[0, 1, 2, 3].map((col) => (
              <Block
                key={col}
                x={100 + col * 23 + row * 28}
                y={286 - col * 11 + row * 14}
                w={18}
                d={15}
                h={13}
                hot={mode === 0 && row === 1}
              />
            ))}
          </g>
        ))}
        <Block x={416} y={274} w={88} d={51} h={15} />
        <Block x={426} y={261} w={32} d={36} h={58} hot={mode === 3} />
        <Block x={466} y={242} w={32} d={36} h={58} />
        <path d="m466 219 21 10v27l-21-10z" fill="#0c171c" stroke="#5e727c" />
        <path
          d="m470 228 12 6m-12 0 12 6m-12 0 8 4"
          stroke="#9fdf8a"
          strokeWidth="2"
        />
        {/* Four-column compression test machine. */}
        <Block x={248} y={320} w={113} d={93} h={24} />
        <Block x={263} y={289} w={83} d={66} h={14} hot />
        <Block x={288} y={263} w={42} d={39} h={49} hot={mode === 2} />
        <g stroke="#354954" strokeWidth="11">
          <path d="M270 286V153M358 245V112M348 324V191M427 282V150" />
        </g>
        <g stroke="#9baeb5" strokeWidth="4">
          <path d="M268 286V153M356 245V112M346 324V191M425 282V150" />
        </g>
        <Block x={248} y={160} w={113} d={93} h={26} />
        <Block x={277} y={127} w={56} d={49} h={16} />
        <path d="M335 169V208" stroke="#1b2932" strokeWidth="27" />
        <path d="M330 170V205" stroke="#7f959e" strokeWidth="8" />
        <Block x={300} y={224} w={40} d={35} h={12} />
        <path
          d="M248 146 341 192 454 139"
          fill="none"
          stroke="#d5e0df"
          strokeWidth="1.4"
        />
        <path
          d="M258 151 269 156m5 2 11 6m5 2 11 6m5 2 11 6"
          stroke="#ff8a48"
          strokeWidth="3"
        />
        <g className="lab-scanner">
          <path
            d="M267 174 352 133 424 169 341 213Z"
            fill={`url(#${id}-scan)`}
            stroke="#ff8246"
            strokeWidth="1.2"
          />
          <path
            d="M267 174v78l74 39 83-41v-81"
            fill={`url(#${id}-scan)`}
            stroke="#ff8246"
            strokeOpacity=".2"
          />
          <path
            d="M267 252 341 291 424 250"
            stroke="#ff9c68"
            strokeWidth="2"
            fill="none"
          />
        </g>
        {/* Sample tray, controller and service conduits. */}
        {[0, 1, 2].map((i) => (
          <Block
            key={i}
            x={390 + i * 36}
            y={373 - i * 18}
            w={25}
            d={25}
            h={23}
            hot={mode === 1}
          />
        ))}
        <Block x={211} y={365} w={30} d={23} h={44} />
        <path d="m215 326 17 8v16l-17-8z" fill="#111e27" stroke="#748c95" />
        <path d="m218 332 11 5" stroke="#a4f07a" strokeWidth="3" />
        <path
          d="m245 367 41 20 52-27m112-69 59 28-26 14"
          fill="none"
          stroke="#70838a"
          strokeWidth="2"
        />
        <g fill="#a3f579">
          <circle className="lab-status-led" cx="269" cy="301" r="2.5" />
          <circle cx="281" cy="307" r="2.5" />
          <circle cx="294" cy="313" r="2.5" />
        </g>
        <g stroke="#ff8250" fill="none">
          <path d="M290 225v-9h10m61 22h10v9m-81 43v9h10m61 4h10v-9" />
          <path d="M323 265h18m-9-9v18" strokeOpacity=".75" />
        </g>
      </g>
      <g stroke="#7d929d" strokeWidth=".7" fill="none">
        <path d="M175 234H113L91 207H29" />
        <path d="M404 189h92l25-38h127" />
        <path d="M454 354h42l30 39h122" />
      </g>
      <g fontSize="9" fontFamily="monospace" fill="#acbbc3">
        <text x="29" y="198">
          01 / БЭХЖҮҮЛЭЛТ
        </text>
        <text x="523" y="143">
          02 / ШАХАЛТ
        </text>
        <text x="531" y="384">
          03 / СОРЬЦ
        </text>
      </g>
      <g fill="#ff8751">
        <circle cx="175" cy="234" r="3" />
        <circle className="lab-status-led" cx="404" cy="189" r="3" />
      </g>
      <circle cx="454" cy="354" r="3" fill="#a3f579" />
      <g stroke="#788f9b" strokeWidth="1" opacity=".5">
        <path d="M16 63V51h12m624 0h12v12M16 451v12h12m624 0h12v-12" />
      </g>
      <text
        x="340"
        y="482"
        textAnchor="middle"
        fill="#728993"
        fontSize="8"
        fontFamily="monospace"
        letterSpacing="2"
      >
        БҮК · ЛАБОРАТОРИЙН ХЯНАЛТЫН СИСТЕМ
      </text>
    </svg>
  );
}
