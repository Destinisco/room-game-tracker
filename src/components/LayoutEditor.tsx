import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import layoutConfigImport from "@/config/layout.json";

interface LayoutEditorProps {
  onClose: () => void;
  backgroundFrontUrl: string | null;
  backgroundBackUrl: string | null;
  initialLayoutConfig?: any;
  onSave?: (layoutConfig: any) => void;
}

type LayoutConfig = typeof layoutConfigImport;

interface DraggableBox {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: 1 | 2;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const LayoutEditor = ({ onClose, backgroundFrontUrl, backgroundBackUrl, initialLayoutConfig, onSave }: LayoutEditorProps) => {
  const { toast } = useToast();
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    initialLayoutConfig ? JSON.parse(JSON.stringify(initialLayoutConfig)) : JSON.parse(JSON.stringify(layoutConfigImport))
  );
  const [boxes, setBoxes] = useState<DraggableBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert layout config to draggable boxes
  useEffect(() => {
    const extractedBoxes: DraggableBox[] = [];

    // Page 1 elements
    if (layoutConfig.page1.color.box) {
      extractedBoxes.push({
        id: "page1.color",
        label: "Color",
        x: layoutConfig.page1.color.box.x,
        y: layoutConfig.page1.color.box.y,
        w: layoutConfig.page1.color.box.w,
        h: layoutConfig.page1.color.box.h,
        page: 1,
      });
    }

    if (layoutConfig.page1.role.box) {
      extractedBoxes.push({
        id: "page1.role",
        label: "Role",
        x: layoutConfig.page1.role.box.x,
        y: layoutConfig.page1.role.box.y,
        w: layoutConfig.page1.role.box.w,
        h: layoutConfig.page1.role.box.h,
        page: 1,
      });
    }

    if (layoutConfig.page1.gameCode.box) {
      extractedBoxes.push({
        id: "page1.gameCode",
        label: "Game Code",
        x: layoutConfig.page1.gameCode.box.x,
        y: layoutConfig.page1.gameCode.box.y,
        w: layoutConfig.page1.gameCode.box.w,
        h: layoutConfig.page1.gameCode.box.h,
        page: 1,
      });
    }

    // Strengths (title + body for each)
    layoutConfig.page1.strengths.forEach((strength, idx) => {
      extractedBoxes.push({
        id: `page1.strengths[${idx}].title`,
        label: `Strength ${idx + 1} Title`,
        x: strength.title.x,
        y: strength.title.y,
        w: strength.title.w,
        h: 12, // estimate
        page: 1,
      });
      extractedBoxes.push({
        id: `page1.strengths[${idx}].body`,
        label: `Strength ${idx + 1} Body`,
        x: strength.body.x,
        y: strength.body.y,
        w: strength.body.w,
        h: 60, // estimate for multi-line
        page: 1,
      });
    });

    // Weaknesses
    layoutConfig.page1.weaknesses.forEach((weakness, idx) => {
      extractedBoxes.push({
        id: `page1.weaknesses[${idx}].title`,
        label: `Weakness ${idx + 1} Title`,
        x: weakness.title.x,
        y: weakness.title.y,
        w: weakness.title.w,
        h: 12,
        page: 1,
      });
      extractedBoxes.push({
        id: `page1.weaknesses[${idx}].body`,
        label: `Weakness ${idx + 1} Body`,
        x: weakness.body.x,
        y: weakness.body.y,
        w: weakness.body.w,
        h: 60,
        page: 1,
      });
    });

    // Long analysis
    extractedBoxes.push({
      id: "page1.longAnalysis",
      label: "Long Analysis",
      x: layoutConfig.page1.longAnalysis.x,
      y: layoutConfig.page1.longAnalysis.y,
      w: layoutConfig.page1.longAnalysis.w,
      h: layoutConfig.page1.longAnalysis.h,
      page: 1,
    });

    // Page 2 elements - Traits
    layoutConfig.page2.traits.forEach((trait, idx) => {
      extractedBoxes.push({
        id: `page2.traits[${idx}].title`,
        label: `Trait ${idx + 1} Title`,
        x: trait.title.x,
        y: trait.title.y,
        w: trait.title.w,
        h: 14,
        page: 2,
      });
      extractedBoxes.push({
        id: `page2.traits[${idx}].body`,
        label: `Trait ${idx + 1} Body`,
        x: trait.body.x,
        y: trait.body.y,
        w: trait.body.w,
        h: 50,
        page: 2,
      });
    });

    // Collaboration
    extractedBoxes.push({
      id: "page2.collaboration",
      label: "Collaboration",
      x: layoutConfig.page2.collaboration.x,
      y: layoutConfig.page2.collaboration.y,
      w: layoutConfig.page2.collaboration.w,
      h: layoutConfig.page2.collaboration.h,
      page: 2,
    });

    setBoxes(extractedBoxes);
  }, [layoutConfig]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedBox) return;

      const shift = e.shiftKey;
      const delta = shift ? 5 : 1;

      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowLeft":
          dx = -delta;
          e.preventDefault();
          break;
        case "ArrowRight":
          dx = delta;
          e.preventDefault();
          break;
        case "ArrowUp":
          dy = delta; // PDF coords: higher Y = higher on page
          e.preventDefault();
          break;
        case "ArrowDown":
          dy = -delta;
          e.preventDefault();
          break;
        default:
          return;
      }

      updateBoxPosition(selectedBox, dx, dy);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBox]);

  const updateBoxPosition = (boxId: string, dx: number, dy: number) => {
    setBoxes((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? { ...box, x: box.x + dx, y: box.y + dy }
          : box
      )
    );

    // Update layout config
    setLayoutConfig((prev) => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      const parts = boxId.split(".");
      const page = parts[0] as "page1" | "page2";
      const field = parts[1];

      if (field === "color" || field === "role" || field === "gameCode") {
        newConfig[page][field].box.x += dx;
        newConfig[page][field].box.y += dy;
      } else if (field === "longAnalysis" || field === "collaboration") {
        newConfig[page][field].x += dx;
        newConfig[page][field].y += dy;
      } else if (field === "strengths" || field === "weaknesses" || field === "traits") {
        const match = parts[1].match(/(strengths|weaknesses|traits)\[(\d+)\]/);
        if (match) {
          const arrayField = match[1] as "strengths" | "weaknesses" | "traits";
          const index = parseInt(match[2]);
          const subField = parts[2] as "title" | "body";
          newConfig[page][arrayField][index][subField].x += dx;
          newConfig[page][arrayField][index][subField].y += dy;
        }
      }

      return newConfig;
    });
  };

  const updateBoxSize = (boxId: string, dw: number, dh: number) => {
    setBoxes((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? { ...box, w: Math.max(50, box.w + dw), h: Math.max(20, box.h + dh) }
          : box
      )
    );

    // Update layout config
    setLayoutConfig((prev) => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      const parts = boxId.split(".");
      const page = parts[0] as "page1" | "page2";
      const field = parts[1];

      if (field === "color" || field === "role" || field === "gameCode") {
        if (newConfig[page][field].box) {
          newConfig[page][field].box.w = Math.max(50, newConfig[page][field].box.w + dw);
          newConfig[page][field].box.h = Math.max(20, newConfig[page][field].box.h + dh);
        }
      } else if (field === "longAnalysis" || field === "collaboration") {
        newConfig[page][field].w = Math.max(50, newConfig[page][field].w + dw);
        newConfig[page][field].h = Math.max(20, newConfig[page][field].h + dh);
      } else if (field === "strengths" || field === "weaknesses" || field === "traits") {
        const match = parts[1].match(/(strengths|weaknesses|traits)\[(\d+)\]/);
        if (match) {
          const arrayField = match[1] as "strengths" | "weaknesses" | "traits";
          const index = parseInt(match[2]);
          const subField = parts[2] as "title" | "body";
          newConfig[page][arrayField][index][subField].w = Math.max(50, newConfig[page][arrayField][index][subField].w + dw);
        }
      }

      return newConfig;
    });
  };

  const handleMouseDown = (e: React.MouseEvent, boxId: string) => {
    e.preventDefault();
    setSelectedBox(boxId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeStart = (e: React.MouseEvent, boxId: string, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBox(boxId);
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedBox || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scale = rect.width / layoutConfig.pageSize.w;

    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = -(e.clientY - dragStart.y) / scale; // Invert Y for PDF coords

      updateBoxPosition(selectedBox, dx, dy);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isResizing && resizeHandle) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = -(e.clientY - dragStart.y) / scale; // Invert Y for PDF coords

      let dw = 0;
      let dh = 0;
      let posX = 0;
      let posY = 0;

      // Calculate size and position changes based on handle
      switch (resizeHandle) {
        case 'e':
          dw = dx;
          break;
        case 'w':
          dw = -dx;
          posX = dx;
          break;
        case 's':
          dh = -dy;
          break;
        case 'n':
          dh = dy;
          posY = dy;
          break;
        case 'se':
          dw = dx;
          dh = -dy;
          break;
        case 'sw':
          dw = -dx;
          dh = -dy;
          posX = dx;
          break;
        case 'ne':
          dw = dx;
          dh = dy;
          posY = dy;
          break;
        case 'nw':
          dw = -dx;
          dh = dy;
          posX = dx;
          posY = dy;
          break;
      }

      if (posX !== 0 || posY !== 0) {
        updateBoxPosition(selectedBox, posX, posY);
      }
      updateBoxSize(selectedBox, dw, dh);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleSave = () => {
    if (onSave) {
      // Save to database via callback
      onSave(layoutConfig);
    } else {
      // Fallback: download as JSON file
      const json = JSON.stringify(layoutConfig, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "layout.json";
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Layout uložen",
        description: "Stáhněte layout.json a nahraďte soubor v src/config/layout.json",
      });
    }
  };

  // Convert PDF coordinates to screen coordinates
  const pdfToScreen = (box: DraggableBox, containerWidth: number) => {
    const scale = containerWidth / layoutConfig.pageSize.w;
    return {
      left: box.x * scale,
      bottom: box.y * scale,
      width: box.w * scale,
      height: box.h * scale,
    };
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-auto p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-background p-4 rounded-t-lg flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold">Layout Editor</h2>
            <p className="text-sm text-muted-foreground">
              {onSave 
                ? "Přetáhněte boxy pro změnu pozice. Použijte šipky (±1px) nebo Shift+šipky (±5px) pro jemné doladění."
                : "Drag boxes to reposition. Use arrow keys (±1px) or Shift+arrows (±5px) for fine tuning."
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} variant="default">
              <Save className="w-4 h-4 mr-2" />
              {onSave ? "Uložit layout" : "Save Layout"}
            </Button>
            <Button onClick={onClose} variant="outline">
              <X className="w-4 h-4 mr-2" />
              {onSave ? "Zavřít" : "Close"}
            </Button>
          </div>
        </div>

        {/* Pages */}
        <div className="bg-muted p-8 space-y-8">
          {/* Page 1 */}
          <div className="relative bg-white" style={{ width: "100%", aspectRatio: "1/1.414" }}>
            <div
              ref={containerRef}
              className="relative w-full h-full"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {backgroundFrontUrl && (
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  {backgroundFrontUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={`${backgroundFrontUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full border-0"
                      title="Page 1 Background PDF"
                    />
                  ) : (
                    <img
                      src={backgroundFrontUrl}
                      alt="Page 1 Background"
                      className="w-full h-full object-fill"
                    />
                  )}
                </div>
              )}

              {boxes
                .filter((box) => box.page === 1)
                .map((box) => {
                  const style = pdfToScreen(box, containerRef.current?.offsetWidth || layoutConfig.pageSize.w);
                  const isSelected = selectedBox === box.id;
                  return (
                    <div
                      key={box.id}
                      className={`absolute border-2 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-blue-400 bg-blue-400/10"
                      }`}
                      style={{
                        left: style.left,
                        bottom: style.bottom,
                        width: style.width,
                        height: style.height,
                      }}
                    >
                      <div
                        className="absolute inset-0 cursor-move"
                        onMouseDown={(e) => handleMouseDown(e, box.id)}
                      />
                      <span className="absolute -top-6 left-0 text-xs bg-primary text-primary-foreground px-1 rounded whitespace-nowrap pointer-events-none">
                        {box.label}
                      </span>
                      {isSelected && (
                        <>
                          {/* Corner handles */}
                          <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary border border-background cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'nw')} />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary border border-background cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'ne')} />
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary border border-background cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'sw')} />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-background cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'se')} />
                          {/* Edge handles */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary border border-background cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'n')} />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary border border-background cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 's')} />
                          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-primary border border-background cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'w')} />
                          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-primary border border-background cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'e')} />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Page 2 */}
          <div className="relative bg-white" style={{ width: "100%", aspectRatio: "1/1.414" }}>
            <div className="relative w-full h-full" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
              {backgroundBackUrl && (
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  {backgroundBackUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={`${backgroundBackUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full border-0"
                      title="Page 2 Background PDF"
                    />
                  ) : (
                    <img
                      src={backgroundBackUrl}
                      alt="Page 2 Background"
                      className="w-full h-full object-fill"
                    />
                  )}
                </div>
              )}

              {boxes
                .filter((box) => box.page === 2)
                .map((box) => {
                  const style = pdfToScreen(box, containerRef.current?.offsetWidth || layoutConfig.pageSize.w);
                  const isSelected = selectedBox === box.id;
                  return (
                    <div
                      key={box.id}
                      className={`absolute border-2 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-blue-400 bg-blue-400/10"
                      }`}
                      style={{
                        left: style.left,
                        bottom: style.bottom,
                        width: style.width,
                        height: style.height,
                      }}
                    >
                      <div
                        className="absolute inset-0 cursor-move"
                        onMouseDown={(e) => handleMouseDown(e, box.id)}
                      />
                      <span className="absolute -top-6 left-0 text-xs bg-primary text-primary-foreground px-1 rounded whitespace-nowrap pointer-events-none">
                        {box.label}
                      </span>
                      {isSelected && (
                        <>
                          {/* Corner handles */}
                          <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary border border-background cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'nw')} />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary border border-background cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'ne')} />
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary border border-background cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'sw')} />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-background cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'se')} />
                          {/* Edge handles */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary border border-background cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'n')} />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary border border-background cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 's')} />
                          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-primary border border-background cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'w')} />
                          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-primary border border-background cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, box.id, 'e')} />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
