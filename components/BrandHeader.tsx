/**
 * File: components/BrandHeader.tsx
 * 모든 주요 화면에서 사용하는 MAPPER 행사 브랜드 헤더다.
 */

export function BrandHeader({ large = false }: { large?: boolean }) {
  return (
    <div className="brand-lockup text-center">
      <p className="brand-eyebrow">2026 SUMMER OUTREACH</p>
      <div className={`brand-title ${large ? "brand-title-large" : ""}`}>
        <span aria-hidden="true">[</span>
        <strong>MAPPER</strong>
        <span aria-hidden="true">]</span>
      </div>
      <p className="brand-subtitle">우리의 선택이 오늘의 지도를 만듭니다</p>
    </div>
  );
}
