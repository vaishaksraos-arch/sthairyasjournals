import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, Crop as CropIcon } from "lucide-react";

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedDataUrl(src: string, area: Area, size = 640): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function ImageCropperModal({
  src,
  aspect = 1,
  circular = false,
  onCancel,
  onCropped,
}: {
  src: string;
  aspect?: number;
  circular?: boolean;
  onCancel: () => void;
  onCropped: (dataUrl: string) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  async function save() {
    if (!area) return;
    setBusy(true);
    try {
      const url = await getCroppedDataUrl(src, area);
      onCropped(url);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200" onClick={onCancel}>
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 font-medium">
            <CropIcon className="w-4 h-4 text-primary" /> Adjust framing
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="relative w-full h-[360px] bg-black">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={circular ? "round" : "rect"}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>
        <div className="px-5 py-3 flex items-center gap-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
        </div>
        <div className="px-5 py-3 flex justify-end gap-2 border-t border-border bg-muted/30">
          <button type="button" onClick={onCancel} className="h-10 px-4 rounded-lg border border-border hover:bg-muted text-sm">Cancel</button>
          <button type="button" onClick={save} disabled={busy || !area} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 shadow-sm">
            {busy ? "Cropping…" : "Crop & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
