import { SCENE } from "@/lib/scene";
import { Sprite } from "./Sprite";

const { src } = SCENE;

/** A small pixel-art cloud for Bubu to nap on. */
function CloudBed() {
  return (
    <svg className="bubu-cloud" viewBox="0 0 44 14" shapeRendering="crispEdges" aria-hidden="true">
      <g fill="#8f7ee0">
        <rect x="2" y="7" width="40" height="5" />
        <rect x="4" y="12" width="36" height="1" />
        <rect x="0" y="8" width="2" height="3" />
        <rect x="42" y="8" width="2" height="3" />
      </g>
      <g fill="#cfc3ff">
        <rect x="3" y="5" width="9" height="3" />
        <rect x="9" y="3" width="10" height="3" />
        <rect x="19" y="4" width="9" height="3" />
        <rect x="27" y="5" width="12" height="3" />
        <rect x="2" y="7" width="40" height="3" />
      </g>
      <g fill="#ece6ff">
        <rect x="11" y="3" width="6" height="1" />
        <rect x="5" y="5" width="4" height="1" />
        <rect x="30" y="5" width="6" height="1" />
      </g>
    </svg>
  );
}

/**
 * Bubu, the white panda: head sprite only, always calm. `sleeping` puts her on a small
 * cloud with floating z's; she breathes slowly either way. The parent sets the width.
 */
export function Bubu({ sleeping = false, className = "" }: { sleeping?: boolean; className?: string }) {
  return (
    <div className={`bubu ${sleeping ? "bubu-sleeping" : ""} ${className}`} aria-hidden="true">
      {sleeping && <CloudBed />}
      <div className="bubu-body anim-breathe-slow">
        <Sprite src={src.bubu} small={src.bubuSmall} widths={[160, 256]} className="h-full w-full" />
      </div>
      {sleeping && (
        <>
          <span className="bubu-z">z</span>
          <span className="bubu-z bubu-z2">z</span>
        </>
      )}
    </div>
  );
}
