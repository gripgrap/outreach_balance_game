/**
 * File: components/AdminGuide.tsx
 * 관리자 화면 안에서 당일 운영 순서와 문제 해결 FAQ를 제공한다.
 */

const steps = [
  "발표용 컴퓨터에서 ‘결과화면 열기’를 눌러 전체 화면으로 둡니다.",
  "참가자가 QR로 접속한 것을 확인한 뒤 해당 질문의 ‘투표 시작’을 한 번 누릅니다.",
  "총 투표 수가 늘어나는지 보고, 시간이 끝나면 ‘지금 종료’를 누릅니다.",
  "결과를 함께 본 뒤 다음 질문에서 같은 순서를 반복합니다.",
  "마지막 질문 종료 후 ‘엔딩화면 열기’에서 결과를 넘깁니다.",
];

const faq = [
  ["참가자에게 질문이 안 보여요", "질문이 ‘진행중’인지 확인하고 6초 기다린 뒤 참가자 화면을 새로고침합니다."],
  ["잘못된 질문을 시작했어요", "‘지금 종료’를 누른 다음 올바른 질문의 ‘투표 시작’을 누릅니다."],
  ["한 질문만 다시 시험할래요", "그 질문의 ‘초기화’를 누르면 해당 질문의 투표만 지워집니다."],
  ["리허설 투표를 전부 지울래요", "행사 시작 직전에만 ‘전체 투표 초기화’를 한 번 누릅니다."],
  ["최종 결과를 보관하고 싶어요", "관리자 화면의 ‘결과 보관’에서 결과를 복사하거나 Excel용 CSV를 저장합니다."],
  ["휴대전화로 운영해도 되나요", "가능합니다. 다만 관리자 조작은 한 사람만 하고, 결과 화면은 발표용 컴퓨터에 띄우세요."],
];

function GuideContents() {
  return (
    <div className="space-y-5 text-sm">
      <section>
        <p className="font-bold text-gold mb-2">질문마다 반복할 순서</p>
        <ol className="space-y-2 text-ivory/90">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="text-gold font-bold">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-red-400/30 bg-red-950/20 p-3">
        <p className="font-bold text-red-200 mb-1">행사 중 누르지 않기</p>
        <p className="text-red-100/80 leading-relaxed">
          `새 세션`, `전체 투표 초기화`, `삭제`는 되돌리기 어렵습니다. 리허설이 끝난 직후나
          담당자 확인을 받은 경우에만 사용하세요.
        </p>
      </section>

      <section>
        <p className="font-bold text-gold mb-2">문제가 생겼을 때</p>
        <div className="space-y-2">
          {faq.map(([question, answer]) => (
            <details key={question} className="rounded-xl border border-sage/25 bg-bg/50 px-3 py-2">
              <summary className="cursor-pointer font-semibold text-ivory min-h-8 flex items-center">
                {question}
              </summary>
              <p className="pt-2 pb-1 text-sage leading-relaxed">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <a href="/" target="_blank" className="min-h-11 rounded-xl border border-sage/30 flex items-center justify-center text-sage">
          참가자
        </a>
        <a href="/results" target="_blank" className="min-h-11 rounded-xl border border-sage/30 flex items-center justify-center text-sage">
          결과
        </a>
        <a href="/final" target="_blank" className="min-h-11 rounded-xl border border-sage/30 flex items-center justify-center text-sage">
          엔딩
        </a>
      </div>
    </div>
  );
}

export function AdminGuide({ collapsible = false }: { collapsible?: boolean }) {
  if (collapsible) {
    return (
      <details className="forest-panel rounded-2xl p-4 mb-6">
        <summary className="cursor-pointer min-h-11 flex items-center justify-between font-bold text-gold">
          <span>운영 도움말 · 막히면 여기부터</span>
          <span aria-hidden="true">＋</span>
        </summary>
        <div className="pt-4 border-t border-sage/20 mt-2">
          <GuideContents />
        </div>
      </details>
    );
  }

  return (
    <aside className="forest-panel rounded-2xl p-5" aria-label="행사 운영 도움말">
      <p className="text-xs tracking-[0.22em] text-sage mb-2">QUICK GUIDE</p>
      <h2 className="font-bold text-xl text-ivory mb-5">운영 도움말</h2>
      <GuideContents />
    </aside>
  );
}
