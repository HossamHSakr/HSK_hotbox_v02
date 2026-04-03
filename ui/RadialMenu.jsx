// RadialMenu UI component (React)
// SVG pie-wheel with hoverable sectors, readable labels, centered at window center

import React, { useState, useEffect, useCallback, useRef } from 'react';
import uiStyleConfig from '../config/ui-style.json';

// Helpers
const deg2rad = (d) => (d * Math.PI) / 180;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = deg2rad(angleDeg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArc, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

const DEFAULT_UI_STYLE = {
  BgColor: '#01070A',
  TreeViewBg: '#01070A',
  TreeViewText: '#ffffff',
  Level0: '#04D9D9',
  Level1: '#037373',
  Level2: '#05F2DB',
  Level3: '#0CB1F2',
  Highlight: '#D90B1C',
  // Transparency controls
  RadialOpacity: 0.25, 
  RadialHoverOpacity: 0.45,
  CenterGrayOpacity: 0.05,
  TopRightMenuOpacity: 0.05,
  // Radius sizing controls
  InitialRadius: 180,
  RadiusMin: 80,
  RadiusMax: 400,
  RadiusScaleStep: 20,
  // Hover navigation controls
  HoverNavigateEnabled: true,
  HoverNavigateDelayMs: 440,
  HoverNavigateMaxMovePx: 18,
};

const RadialMenu = ({ config, onSelect, menuLevel = 0, uiStyle = null, editorOpen = false }) => {
  const UI_STYLE = {
    ...DEFAULT_UI_STYLE,
    ...(uiStyleConfig || {}),
    ...(uiStyle || {}),
  };
  const LEVEL_COLORS = [UI_STYLE.Level0, UI_STYLE.Level1, UI_STYLE.Level2, UI_STYLE.Level3];
  const [hovered, setHovered] = useState(null); 
  const [radius, setRadius] = useState(UI_STYLE.InitialRadius);
  const hoverTimerRef = useRef(null);
  const hoverStartPosRef = useRef({ x: 0, y: 0 });
  const hoverMovedTooMuchRef = useRef(false);
  const innerR = 40;
  const slices = (config && config.slices) ? config.slices : [];
  const count = slices.length;
  const size = (radius + 60) * 2;
  const cx = size / 2;
  const cy = size / 2;

  // +/- resize
  const handleKeyDown = useCallback((e) => {
    if (e.key === '+' || e.key === '=') {
      setRadius(r => Math.min(r + UI_STYLE.RadiusScaleStep, UI_STYLE.RadiusMax));
    }
    if (e.key === '-' || e.key === '_') {
      setRadius(r => Math.max(r - UI_STYLE.RadiusScaleStep, UI_STYLE.RadiusMin));
    }
  }, []);

  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setRadius(r => Math.min(r + UI_STYLE.RadiusScaleStep, UI_STYLE.RadiusMax));
      return;
    }
    if (e.deltaY > 0) {
      setRadius(r => Math.max(r - UI_STYLE.RadiusScaleStep, UI_STYLE.RadiusMin));
    }
  }, []);
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, []);

  if (!config || !slices.length) return null;

  const angleStep = 360 / count;
  const levelIndex = Math.max(0, Math.min(LEVEL_COLORS.length - 1, menuLevel));
  const baseLevelColor = LEVEL_COLORS[levelIndex];
   
  return (
    <div
      className="radial-menu-overlay"
      style={{
        position: 'fixed',
        left: editorOpen ? 'calc(50% + 140px)' : '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        zIndex: 9999,
        transition: 'left 0.2s ease',
      }}
      onWheel={handleWheel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        {/* Pie slices */}
        {slices.map((slice, i) => {
          const startA = i * angleStep - 90;
          const endA = startA + angleStep;
          const path = describeArc(cx, cy, radius, startA, endA);
          const isHover = hovered === i;
          const midA = startA + angleStep / 2;
          // Label sits inside the wheel near the outer edge
          const labelR = radius - 26;
          const labelPos = polarToCartesian(cx, cy, labelR, midA);
          const isSubmenu = slice.action === 'submenu';

          return (
            <g
              key={i}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                setHovered(i);
                hoverStartPosRef.current = { x: e.clientX, y: e.clientY };
                hoverMovedTooMuchRef.current = false;
                if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                if (
                  UI_STYLE.HoverNavigateEnabled &&
                  (slice.action === 'open_folder' || slice.action === 'submenu')
                ) {
                  hoverTimerRef.current = setTimeout(() => {
                    if (hoverMovedTooMuchRef.current) return;
                    if (onSelect) onSelect(slice, i, { trigger: 'hover' });
                  }, UI_STYLE.HoverNavigateDelayMs);
                }
              }}
              onMouseMove={(e) => {
                const dx = e.clientX - hoverStartPosRef.current.x;
                const dy = e.clientY - hoverStartPosRef.current.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > UI_STYLE.HoverNavigateMaxMovePx) {
                  hoverMovedTooMuchRef.current = true;
                  if (hoverTimerRef.current) {
                    clearTimeout(hoverTimerRef.current);
                    hoverTimerRef.current = null;
                  }
                }
              }}
              onMouseLeave={() => {
                setHovered(null);
                if (hoverTimerRef.current) {
                  clearTimeout(hoverTimerRef.current);
                  hoverTimerRef.current = null;
                }
                hoverMovedTooMuchRef.current = false;
                
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (hoverTimerRef.current) {
                  clearTimeout(hoverTimerRef.current);
                  hoverTimerRef.current = null;
                }
                if (onSelect) onSelect(slice, i, { trigger: 'click' });
              }}
            >
              {/* Sector */}
              <path
                d={path}
                fill={isHover ? UI_STYLE.Highlight : baseLevelColor}
                stroke={UI_STYLE.BgColor}
                strokeWidth={2}
                opacity={isHover ? UI_STYLE.RadialHoverOpacity : UI_STYLE.RadialOpacity}
                style={{ transition: 'fill 0.12s, opacity 0.12s' }}
              />
              {/* Label — inside the circle */}
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHover ? '#FFFFFF' : UI_STYLE.TreeViewText}
                fontSize={12}
                fontFamily="Segoe UI, Arial, sans-serif"
                fontWeight={isHover ? 'bold' : 'normal'}
                style={{ pointerEvents: 'none', textShadow: `0 1px 6px ${UI_STYLE.BgColor}, 0 0 3px ${UI_STYLE.BgColor}` }}
              >
                {slice.icon ? slice.icon + ' ' : ''}{slice.label}{isSubmenu ? ' ▶' : ''}
              </text>
            </g>
          );
        })}

        {/* Transparent gray center area */}
        <circle
          cx={cx}
          cy={cy}
          r={radius * 0.48}
          fill={`rgba(128, 128, 128, ${UI_STYLE.CenterGrayOpacity})`}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
          style={{ pointerEvents: 'none' }}
        />

        {/* Inner circle (cancel/home) */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill={UI_STYLE.TreeViewBg}
          stroke={UI_STYLE.Level1}
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect({ action: 'cancel' }, -1);
          }}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize={22}
          style={{ pointerEvents: 'none' }}
        >
          ✕
        </text>

        {/* Menu title */}
        {config.name && config.name !== 'Main' && (
          <text
            x={cx}
            y={cy + innerR + 16}
            textAnchor="middle"
            dominantBaseline="central"
            fill={UI_STYLE.Level2}
            fontSize={11}
            style={{ pointerEvents: 'none' }}
          >
            {config.name}
          </text>
        )}
      </svg>

      {/* Small menu controls */}
      <div style={{ position: 'absolute', right: 6, top: 6, display: 'flex', gap: 6 }}>
        <button
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            border: '1px solid #1f2e33',
            background: `rgba(1,7,10,${UI_STYLE.TopRightMenuOpacity})`,
            color: '#fff',
            cursor: 'pointer',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setRadius(r => Math.max(UI_STYLE.RadiusMin, r - UI_STYLE.RadiusScaleStep));
          }}
          title="Smaller"
        >
          -
        </button>
        <button
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            border: '1px solid #1f2e33',
            background: `rgba(1,7,10,${UI_STYLE.TopRightMenuOpacity})`,
            color: '#fff',
            cursor: 'pointer',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setRadius(r => Math.min(UI_STYLE.RadiusMax, r + UI_STYLE.RadiusScaleStep));
          }}
          title="Larger"
        >
          +
        </button>
        <button
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            border: '1px solid #1f2e33',
            background: `rgba(1,7,10,${UI_STYLE.TopRightMenuOpacity})`,
            color: '#fff',
            cursor: 'pointer',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect({ action: 'open_settings' }, -1);
          }}
          title="Menu Editor"
        >
          ⚙
        </button>
      </div>
    </div>
  );
};

export default RadialMenu;
