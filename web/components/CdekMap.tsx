"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Тип ПВЗ СДЭК (совпадает с CdekPoint на бэкенде).
export interface CdekPoint {
  code: string;
  name: string;
  address: string;
  fullAddress: string;
  city: string;
  postalCode: string | null;
  lat: number;
  lon: number;
  workTime: string;
}

declare global {
  interface Window {
    ymaps?: any;
  }
}

const YANDEX_MAPS_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY || "";

let ymapsPromise: Promise<void> | null = null;

/** Ленивая загрузка API Яндекс.Карт (один раз на страницу). */
function loadYmaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.ymaps?.ready) return new Promise((r) => window.ymaps.ready(r));
  if (ymapsPromise) return ymapsPromise;

  ymapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const keyParam = YANDEX_MAPS_KEY ? `apikey=${YANDEX_MAPS_KEY}&` : "";
    script.src = `https://api-maps.yandex.ru/2.1/?${keyParam}lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps.ready(() => resolve());
    script.onerror = () => reject(new Error("Yandex Maps failed to load"));
    document.head.appendChild(script);
  });
  return ymapsPromise;
}

interface CdekMapProps {
  city: string;
  postalCode: string;
  selectedCode: string | null;
  onSelect: (point: CdekPoint) => void;
}

export default function CdekMap({ city, postalCode, selectedCode, onSelect }: CdekMapProps) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const [points, setPoints] = useState<CdekPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [ready, setReady] = useState(false);

  // Инициализация карты.
  useEffect(() => {
    let cancelled = false;
    loadYmaps()
      .then(() => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        mapRef.current = new window.ymaps.Map(mapEl.current, {
          center: [55.751244, 37.618423], // Москва по умолчанию
          zoom: 10,
          controls: ["zoomControl", "geolocationControl"],
        });
        clustererRef.current = new window.ymaps.Clusterer({
          preset: "islands#redClusterIcons",
          groupByCoordinates: false,
        });
        mapRef.current.geoObjects.add(clustererRef.current);
        setReady(true);
      })
      .catch(() => setError("Не удалось загрузить карту"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Загрузка ПВЗ при изменении города/индекса.
  useEffect(() => {
    if (!city.trim() && !postalCode.trim()) {
      setPoints([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (city.trim()) params.set("city", city.trim());
        if (postalCode.trim()) params.set("postal_code", postalCode.trim());
        const res = await fetch(`/api/delivery/cdek/points?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        const list: CdekPoint[] = Array.isArray(data.points) ? data.points : [];
        setPoints(list);
        if (!list.length) setError("Пункты выдачи не найдены — проверьте город/индекс");
      } catch {
        if (!cancelled) setError("Ошибка загрузки пунктов выдачи");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [city, postalCode]);

  // Отрисовка меток ПВЗ на карте.
  useEffect(() => {
    if (!ready || !clustererRef.current || !mapRef.current) return;
    const clusterer = clustererRef.current;
    clusterer.removeAll();
    if (!points.length) return;

    const placemarks = points.map((p) => {
      const pm = new window.ymaps.Placemark(
        [p.lat, p.lon],
        {
          balloonContentHeader: p.name,
          balloonContentBody: `${p.fullAddress || p.address}<br/>${p.workTime || ""}`,
          balloonContentFooter: "Нажмите на метку, чтобы выбрать",
          hintContent: p.address,
        },
        {
          preset:
            selectedCode === p.code
              ? "islands#greenDotIconWithCaption"
              : "islands#redDotIcon",
        }
      );
      pm.events.add("click", () => onSelect(p));
      return pm;
    });

    clusterer.add(placemarks);
    // Подгоняем границы карты под найденные пункты.
    try {
      const bounds = clusterer.getBounds();
      if (bounds) mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
    } catch {
      /* ignore */
    }
  }, [points, ready, selectedCode, onSelect]);

  return (
    <div className="space-y-2">
      <div
        ref={mapEl}
        className="w-full h-72 rounded-lg overflow-hidden border border-white/10 bg-surface"
      />
      {loading && <p className="text-[11px] text-muted">Загружаем пункты выдачи…</p>}
      {error && !loading && <p className="text-[11px] text-accent-red">{error}</p>}
      {!error && !loading && points.length > 0 && (
        <p className="text-[11px] text-muted">
          Найдено пунктов: {points.length}. Нажмите на метку на карте.
        </p>
      )}
    </div>
  );
}
