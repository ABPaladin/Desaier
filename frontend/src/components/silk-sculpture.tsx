// A single continuous satin surface. Each pose shares the same cubic topology,
// so the browser can interpolate the actual silhouette and aperture smoothly.
const contours = [
  'M 466 126 C 348 84 174 188 153 331 C 130 478 243 582 386 560 C 528 538 586 397 548 272 C 529 206 504 149 466 126 Z',
  'M 458 174 C 339 81 150 184 146 331 C 141 487 271 562 416 535 C 561 508 587 357 535 261 C 510 215 493 193 458 174 Z',
  'M 485 151 C 369 85 202 170 167 308 C 129 450 269 580 412 548 C 558 515 567 373 550 271 C 539 208 522 173 485 151 Z',
];
const apertures = [
  'M 408 226 C 452 224 474 292 449 365 C 423 442 355 491 302 465 C 251 440 273 363 308 308 C 340 258 375 228 408 226 Z',
  'M 436 248 C 480 270 465 340 410 391 C 355 440 309 466 281 434 C 248 398 292 354 341 305 C 379 267 409 234 436 248 Z',
  'M 416 231 C 461 242 469 296 452 355 C 431 425 375 485 320 463 C 264 441 275 370 310 316 C 343 265 382 223 416 231 Z',
];
const surfaces = contours.map((contour, i) => `${contour} ${apertures[i]}`);

function Morph({ poses }: { poses: string[] }) {
  return <animate attributeName="d" values={[...poses, poses[0]].join(';')} dur="21s" begin="indefinite" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.33;0.67;1" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/>;
}

export function SilkSculpture() {
  return <svg className="silk-sculpture" viewBox="0 0 700 700" fill="none" focusable="false" data-sculpture="silk">
    <defs>
      <linearGradient id="silk-base" x1="190" y1="180" x2="530" y2="550" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ead8ff"/><stop offset=".22" stopColor="#c29bf2"/><stop offset=".45" stopColor="#8951cb"/><stop offset=".67" stopColor="#412174"/><stop offset=".84" stopColor="#9e4c99"/><stop offset="1" stopColor="#e5b0df"/>
      </linearGradient>
      <radialGradient id="silk-light" cx="0" cy="0" r="1" gradientTransform="translate(265 183) rotate(58) scale(342 194)" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff2ff" stopOpacity=".94"/><stop offset=".3" stopColor="#ead5ff" stopOpacity=".55"/><stop offset=".72" stopColor="#c89bff" stopOpacity=".08"/><stop offset="1" stopColor="#8250d2" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id="silk-depth" cx="0" cy="0" r="1" gradientTransform="translate(398 324) rotate(128) scale(256 137)" gradientUnits="userSpaceOnUse">
        <stop offset=".34" stopColor="#200e43" stopOpacity=".95"/><stop offset=".65" stopColor="#3e166d" stopOpacity=".6"/><stop offset="1" stopColor="#542981" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id="silk-orchid" cx="0" cy="0" r="1" gradientTransform="translate(383 551) rotate(-22) scale(239 126)" gradientUnits="userSpaceOnUse">
        <stop stopColor="#efb6df" stopOpacity=".86"/><stop offset=".5" stopColor="#c577ce" stopOpacity=".5"/><stop offset="1" stopColor="#9640b2" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id="silk-rim" x1="280" y1="210" x2="438" y2="484" gradientUnits="userSpaceOnUse">
        <stop stopColor="#efddff" stopOpacity=".75"/><stop offset=".42" stopColor="#b58ce0" stopOpacity=".08"/><stop offset=".75" stopColor="#e9baff" stopOpacity=".5"/><stop offset="1" stopColor="#f4d4ed" stopOpacity=".8"/>
      </linearGradient>
    </defs>
    <g fillRule="evenodd">
      {['silk-base', 'silk-light', 'silk-depth', 'silk-orchid'].map((fill, i) => <path key={fill} data-sculpture-surface={i === 0 ? '' : undefined} d={surfaces[0]} fill={`url(#${fill})`}><Morph poses={surfaces}/></path>)}
    </g>
    <path d={contours[0]} stroke="url(#silk-rim)" strokeWidth="1" opacity=".4"><Morph poses={contours}/></path>
    <path d={apertures[0]} stroke="url(#silk-rim)" strokeWidth="1.5" opacity=".65"><Morph poses={apertures}/></path>
  </svg>;
}
