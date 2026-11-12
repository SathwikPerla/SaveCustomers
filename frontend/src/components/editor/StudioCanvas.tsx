import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Group, Line, Circle } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { ImageItem, LogoItem, LogoPlacement, MaskRegion } from '../../types';

interface StudioCanvasProps {
  image: ImageItem;
  logo: LogoItem | null;
  placement: LogoPlacement;
  onChangePlacement: (newPlacement: LogoPlacement) => void;
  maskRegions?: MaskRegion[];
  onAddMaskRegion?: (region: MaskRegion) => void;
  editorMode?: 'placement' | 'mask' | 'view';
  showLogo?: boolean;
  activeMaskTool?: 'rect' | 'brush';
  brushSize?: number;
  autoHealOnRelease?: boolean;
  onAutoHeal?: (region: MaskRegion) => void;
  isHealing?: boolean;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  image,
  logo,
  placement,
  onChangePlacement,
  maskRegions = [],
  onAddMaskRegion,
  editorMode = 'placement',
  showLogo = true,
  activeMaskTool = 'brush',
  brushSize = 30,
  autoHealOnRelease = true,
  onAutoHeal,
  isHealing = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const logoNodeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [bgImg, bgStatus] = useImage(image.processed_url || image.url, 'anonymous');
  const [logoImg, logoStatus] = useImage(logo?.url || '', 'anonymous');

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Mask drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [newMask, setNewMask] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [brushPoints, setBrushPoints] = useState<number[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  // Observe container size responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || containerRef.current.offsetWidth;
        const h = containerRef.current.clientHeight || containerRef.current.offsetHeight;
        if (w > 0 && h > 0) {
          setContainerSize({ width: w, height: h });
        }
      }
    };
    updateSize();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: Math.floor(entry.contentRect.width),
            height: Math.floor(entry.contentRect.height),
          });
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute fitted base image display dimensions inside container
  // Use compact padding on mobile (<640px) so the photo is maximized and clear
  const padding = containerSize.width < 640 ? 12 : 28;
  const availW = Math.max(containerSize.width - padding * 2, 200);
  const availH = Math.max(containerSize.height - padding * 2, 200);

  const imgAspect = (image.width && image.height) ? (image.width / image.height) : 1;
  let fittedW = availW;
  let fittedH = availW / imgAspect;

  if (fittedH > availH) {
    fittedH = availH;
    fittedW = availH * imgAspect;
  }

  const baseImgX = (containerSize.width - fittedW) / 2;
  const baseImgY = (containerSize.height - fittedH) / 2;

  // Center & Fit view
  const fitToScreen = useCallback(() => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  }, []);

  // Keyboard space listener for quick pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Attach transformer to logo when in placement mode
  useEffect(() => {
    if (editorMode === 'placement' && showLogo && trRef.current && logoNodeRef.current && logo) {
      trRef.current.nodes([logoNodeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    } else if (trRef.current) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [editorMode, logo, logoStatus, showLogo]);

  // Handle Wheel Zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.3, Math.min(newScale, 5));

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // Drag & Transform calculations for Logo
  const handleLogoDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    // Node center position relative to base image top-left
    const localX = node.x() - baseImgX;
    const localY = node.y() - baseImgY;

    const normalizedX = Math.max(0, Math.min(1, localX / fittedW));
    const normalizedY = Math.max(0, Math.min(1, localY / fittedH));

    onChangePlacement({
      ...placement,
      x: Number(normalizedX.toFixed(4)),
      y: Number(normalizedY.toFixed(4)),
    });
  };

  const handleLogoTransformEnd = () => {
    const node = logoNodeRef.current;
    if (!node) return;

    const localX = node.x() - baseImgX;
    const localY = node.y() - baseImgY;

    const normalizedX = Math.max(0, Math.min(1, localX / fittedW));
    const normalizedY = Math.max(0, Math.min(1, localY / fittedH));

    const scaleX = node.scaleX();
    const currentW = node.width() * scaleX;
    const normalizedScale = Math.max(0.02, Math.min(1.0, currentW / fittedW));

    const rotation = Math.round(node.rotation());

    // Reset node scale to 1 so width remains clean
    node.scaleX(1);
    node.scaleY(1);

    onChangePlacement({
      ...placement,
      x: Number(normalizedX.toFixed(4)),
      y: Number(normalizedY.toFixed(4)),
      scale: Number(normalizedScale.toFixed(4)),
      rotation: rotation,
    });
  };

  // Logo display dimensions
  const logoAspect = (logo?.width && logo?.height) ? (logo.width / logo.height) : 1;
  const logoDisplayW = placement.scale * fittedW;
  const logoDisplayH = placement.lock_aspect_ratio 
    ? (logoDisplayW / logoAspect) 
    : (logoDisplayW / logoAspect);

  const logoDisplayX = baseImgX + placement.x * fittedW;
  const logoDisplayY = baseImgY + placement.y * fittedH;

  const updateCursorPos = (pos: { x: number; y: number } | null) => {
    if (!pos) {
      setCursorPos((prev) => ({ ...prev, visible: false }));
      return;
    }
    const imgX = (pos.x - stagePos.x) / stageScale - baseImgX;
    const imgY = (pos.y - stagePos.y) / stageScale - baseImgY;
    const isInside = imgX >= -40 && imgX <= fittedW + 40 && imgY >= -40 && imgY <= fittedH + 40;
    setCursorPos({ x: imgX, y: imgY, visible: isInside });
  };

  // Mask drawing handlers
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (editorMode !== 'mask' || isPanMode || isSpacePressed || isHealing) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert from stage space to fitted image relative coordinates (0..1)
    const imgX = (pos.x - stagePos.x) / stageScale - baseImgX;
    const imgY = (pos.y - stagePos.y) / stageScale - baseImgY;

    if (imgX < -20 || imgX > fittedW + 20 || imgY < -20 || imgY > fittedH + 20) return;

    setIsDrawing(true);
    setCursorPos({ x: imgX, y: imgY, visible: true });

    if (activeMaskTool === 'rect') {
      setNewMask({ x: imgX, y: imgY, width: 0, height: 0 });
    } else {
      setBrushPoints([imgX, imgY]);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (pos) {
      updateCursorPos(pos);
    }

    if (!isDrawing || editorMode !== 'mask' || isHealing) return;
    if (!pos) return;

    const imgX = (pos.x - stagePos.x) / stageScale - baseImgX;
    const imgY = (pos.y - stagePos.y) / stageScale - baseImgY;

    if (activeMaskTool === 'rect' && newMask) {
      setNewMask({
        ...newMask,
        width: imgX - newMask.x,
        height: imgY - newMask.y,
      });
    } else if (activeMaskTool === 'brush') {
      setBrushPoints((prev) => {
        if (prev.length >= 2) {
          const lastX = prev[prev.length - 2];
          const lastY = prev[prev.length - 1];
          const dist = Math.hypot(imgX - lastX, imgY - lastY);
          if (dist < 2) return prev;
        }
        return [...prev, imgX, imgY];
      });
    }
  };

  const handleStageMouseLeave = () => {
    setCursorPos((prev) => ({ ...prev, visible: false }));
    if (isDrawing) {
      handleStageMouseUp();
    }
  };

  const handleStageMouseUp = () => {
    if (!isDrawing || editorMode !== 'mask') return;
    setIsDrawing(false);

    if (activeMaskTool === 'rect' && newMask) {
      let rx = newMask.width < 0 ? newMask.x + newMask.width : newMask.x;
      let ry = newMask.height < 0 ? newMask.y + newMask.height : newMask.y;
      let rw = Math.abs(newMask.width);
      let rh = Math.abs(newMask.height);

      if (rw > 5 && rh > 5) {
        const region: MaskRegion = {
          id: Math.random().toString(36).substring(2, 9),
          type: 'rect',
          x: Number((rx / fittedW).toFixed(4)),
          y: Number((ry / fittedH).toFixed(4)),
          width: Number((rw / fittedW).toFixed(4)),
          height: Number((rh / fittedH).toFixed(4)),
        };
        if (autoHealOnRelease && onAutoHeal) {
          onAutoHeal(region);
        } else if (onAddMaskRegion) {
          onAddMaskRegion(region);
        }
      }
      setNewMask(null);
    } else if (activeMaskTool === 'brush' && brushPoints.length >= 2) {
      let pts = brushPoints;
      if (pts.length === 2) {
        // Single tap dot: add micro delta for round cap dot
        pts = [pts[0], pts[1], pts[0] + 0.1, pts[1] + 0.1];
      }
      const normPoints: number[] = [];
      for (let i = 0; i < pts.length; i += 2) {
        normPoints.push(Number((pts[i] / fittedW).toFixed(4)));
        normPoints.push(Number((pts[i + 1] / fittedH).toFixed(4)));
      }
      const region: MaskRegion = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'brush',
        points: normPoints,
        stroke_width: Number((brushSize / fittedW).toFixed(4)),
      };
      if (autoHealOnRelease && onAutoHeal) {
        onAutoHeal(region);
      } else if (onAddMaskRegion) {
        onAddMaskRegion(region);
      }
      setBrushPoints([]);
    }
  };

  const isDraggableCanvas = isPanMode || isSpacePressed;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-charcoal-500 overflow-hidden flex items-center justify-center select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Background Checkerboard pattern */}
      <div className="absolute inset-0 bg-checkerboard opacity-20 pointer-events-none" />

      {/* Konva Stage */}
      {containerSize.width > 0 && containerSize.height > 0 && (
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={isDraggableCanvas}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseLeave}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
        style={{
          cursor: isDraggableCanvas
            ? 'grab'
            : editorMode === 'mask'
            ? activeMaskTool === 'brush'
              ? 'crosshair'
              : 'crosshair'
            : 'default',
        }}
      >
        <Layer>
          {/* Base Background Image */}
          {bgImg && (
            <KonvaImage
              image={bgImg}
              x={baseImgX}
              y={baseImgY}
              width={fittedW}
              height={fittedH}
              shadowColor="black"
              shadowBlur={30}
              shadowOpacity={0.4}
              shadowOffset={{ x: 0, y: 15 }}
            />
          )}

          {/* Mask Regions Overlay (if any drawn) */}
          <Group x={baseImgX} y={baseImgY}>
            {maskRegions.map((m) => {
              if (m.type === 'rect' && m.x !== undefined && m.y !== undefined && m.width && m.height) {
                return (
                  <Rect
                    key={m.id}
                    x={m.x * fittedW}
                    y={m.y * fittedH}
                    width={m.width * fittedW}
                    height={m.height * fittedH}
                    fill="rgba(244, 63, 94, 0.35)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dash={[4, 4]}
                  />
                );
              } else if (m.type === 'brush' && m.points) {
                const scaledPoints = m.points.map((val, idx) =>
                  idx % 2 === 0 ? val * fittedW : val * fittedH
                );
                return (
                  <Line
                    key={m.id}
                    points={scaledPoints}
                    stroke="rgba(244, 63, 94, 0.55)"
                    strokeWidth={(m.stroke_width || 0.03) * fittedW}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }
              return null;
            })}

            {/* Currently drawing rect mask preview */}
            {newMask && (
              <Rect
                x={newMask.width < 0 ? newMask.x + newMask.width : newMask.x}
                y={newMask.height < 0 ? newMask.y + newMask.height : newMask.y}
                width={Math.abs(newMask.width)}
                height={Math.abs(newMask.height)}
                fill="rgba(244, 63, 94, 0.4)"
                stroke="#f43f5e"
                strokeWidth={2}
                dash={[4, 4]}
              />
            )}

            {/* Currently drawing brush mask preview (Snapseed Translucent Red) */}
            {brushPoints.length > 0 && (
              <Line
                points={brushPoints}
                stroke="rgba(244, 63, 94, 0.65)"
                strokeWidth={brushSize}
                lineCap="round"
                lineJoin="round"
                tension={0.3}
              />
            )}

            {/* Circular hover/touch cursor showing exact brush radius on canvas */}
            {editorMode === 'mask' && activeMaskTool === 'brush' && cursorPos.visible && !isHealing && (
              <>
                <Circle
                  x={cursorPos.x}
                  y={cursorPos.y}
                  radius={brushSize / 2}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="rgba(244, 63, 94, 0.22)"
                  dash={[4, 4]}
                  listening={false}
                />
                <Circle
                  x={cursorPos.x}
                  y={cursorPos.y}
                  radius={2.5}
                  fill="#f43f5e"
                  listening={false}
                />
              </>
            )}
          </Group>

          {/* Interactive Replacement Logo */}
          {showLogo && logo && logoImg && (
            <KonvaImage
              ref={logoNodeRef}
              image={logoImg}
              x={logoDisplayX}
              y={logoDisplayY}
              width={logoDisplayW}
              height={logoDisplayH}
              offsetX={logoDisplayW / 2}
              offsetY={logoDisplayH / 2}
              rotation={placement.rotation}
              opacity={placement.opacity}
              draggable={editorMode === 'placement' && !isDraggableCanvas}
              onDragEnd={handleLogoDragEnd}
              onTransformEnd={handleLogoTransformEnd}
              shadowEnabled={placement.shadow}
              shadowColor="black"
              shadowBlur={placement.shadow_blur}
              shadowOpacity={placement.shadow_opacity}
              shadowOffset={{
                x: placement.shadow_offset_x,
                y: placement.shadow_offset_y,
              }}
              globalCompositeOperation={
                placement.blend_mode === 'multiply'
                  ? 'multiply'
                  : placement.blend_mode === 'screen'
                  ? 'screen'
                  : placement.blend_mode === 'overlay'
                  ? 'overlay'
                  : 'source-over'
              }
            />
          )}

          {/* Konva Transformer for Logo - Senior-friendly large handles & high contrast */}
          {editorMode === 'placement' && showLogo && (
            <Transformer
              ref={trRef}
              keepRatio={placement.lock_aspect_ratio}
              enabledAnchors={[
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
              ]}
              rotateAnchorOffset={containerSize.width < 640 ? 40 : 28}
              borderStroke="#eab308"
              borderStrokeWidth={2}
              anchorFill="#ffffff"
              anchorStroke="#b45309"
              anchorStrokeWidth={2}
              anchorSize={containerSize.width < 640 ? 26 : 14}
              anchorCornerRadius={4}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 15 || newBox.height < 15) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
      )}

      {/* Snapseed Healing In-Progress Overlay */}
      {isHealing && (
        <div className="absolute inset-0 bg-charcoal-950/40 backdrop-blur-[2px] flex items-center justify-center z-40 pointer-events-none transition-all">
          <div className="bg-charcoal-900/95 border-2 border-rose-500/80 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3.5">
            <div className="w-6 h-6 border-3 border-rose-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                <span>✨ Healing Watermark...</span>
              </div>
              <div className="text-[11px] font-bold text-rose-300">
                Snapseed zero-blur AI • Preserving fabric weave
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

