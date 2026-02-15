
import React, { useState } from 'react';
import { AnalysisResult, NameComponentMapping } from './types';
import { decomposeAndMap, getYearGanjiParts } from './utils/hangulUtils';
import { getAIAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [year, setYear] = useState<number>(1974);
  const [lastNameInput, setLastNameInput] = useState('강');
  const [firstNameInput, setFirstNameInput] = useState('유정');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [reportText, setReportText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleOpenKeySelector = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setErrorCode(null);
    }
  };

  const handleAnalyze = async () => {
    if (!lastNameInput || !firstNameInput) {
      alert('성명 정보를 모두 입력해 주세요.');
      return;
    }

    setErrorCode(null);
    const { gan, ji } = getYearGanjiParts(year);
    const ganji = gan + ji;
    const lastName = decomposeAndMap(lastNameInput.charAt(0), gan);
    const firstName = Array.from(firstNameInput).map((char: string) => decomposeAndMap(char, gan));
    
    const result: AnalysisResult = { year, yearGan: gan, yearJi: ji, ganji, lastName, firstName };
    setAnalysis(result);
    setReportText(''); // 초기화
    
    setIsLoading(true);
    // 빈 배열 전달 (단일 리포트 모드)
    const responseText = await getAIAnalysis(result, []);
    
    if (["QUOTA_EXCEEDED", "API_KEY_MISSING", "API_KEY_INVALID"].includes(responseText)) {
      setErrorCode(responseText);
      setIsLoading(false);
      return;
    }
    
    setReportText(responseText);
    setIsLoading(false);
  };

  // 분석 결과 데이터를 테이블 행으로 평탄화 (Flatten)
  const getTableRows = (result: AnalysisResult) => {
    interface RowData {
      symbol: string;
      cheongan: string;
      sipsungName: string;
      isMyungjuseong: boolean;
    }
    
    const rows: RowData[] = [];
    
    const addComponent = (comp: NameComponentMapping | null, isMyungjuseong: boolean = false) => {
      if (!comp) return;
      rows.push({
        symbol: comp.symbol,
        cheongan: comp.cheongan,
        sipsungName: comp.sipsung?.name || '',
        isMyungjuseong
      });
    };

    // 성
    addComponent(result.lastName.cho);
    addComponent(result.lastName.jung);
    addComponent(result.lastName.jong);

    // 이름
    result.firstName.forEach((fn, idx) => {
      // 이름 첫 글자의 초성이 '명주성'임 (idx === 0 일 때 cho)
      addComponent(fn.cho, idx === 0);
      addComponent(fn.jung);
      addComponent(fn.jong);
    });

    return rows;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-black font-serif py-10 print:p-0 print:bg-white">
      
      {/* 입력 폼 (출력 시 숨김) */}
      <div className="max-w-3xl mx-auto mb-10 bg-white p-6 rounded-lg border border-gray-200 shadow-sm not-print">
        <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">신규 감명 신청</h2>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-500 mb-1">출생년도 (양력)</label>
            <input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))} 
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-bold text-gray-500 mb-1">성(姓)</label>
            <input 
              type="text" 
              value={lastNameInput} 
              maxLength={1}
              onChange={(e) => setLastNameInput(e.target.value)} 
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none text-center"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-500 mb-1">이름(名)</label>
            <input 
              type="text" 
              value={firstNameInput} 
              onChange={(e) => setFirstNameInput(e.target.value)} 
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={handleAnalyze} 
            disabled={isLoading}
            className="w-full md:w-auto bg-[#5a4b41] text-[#dcd3c1] px-6 py-2 rounded font-bold hover:bg-[#4a3b31] transition-colors disabled:opacity-50 h-[42px]"
          >
            {isLoading ? '분석 중...' : '감명 시작'}
          </button>
        </div>
        {errorCode && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded flex justify-between items-center">
             <span>⚠️ API 키 오류 또는 할당량 초과입니다.</span>
             <button onClick={handleOpenKeySelector} className="underline font-bold">키 설정하기</button>
          </div>
        )}
      </div>

      {/* A4 감명지 영역 */}
      {analysis && (
        <div className="a4-page bg-white mx-auto shadow-2xl print:shadow-none print:mx-0 relative flex flex-col">
          <div className="flex-1 border-[6px] border-double border-[#5a4b41] p-8 flex flex-col relative">
             
             {/* 워터마크 (배경 장식) */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
                <div className="text-[300px] font-bold text-black border-4 border-black rounded-full w-[400px] h-[400px] flex items-center justify-center">
                    印
                </div>
             </div>

             {/* 1. 헤더: 제목 및 기본 정보 */}
             <header className="mb-8 text-center border-b-2 border-[#5a4b41] pb-6">
                <h1 className="text-4xl font-extrabold text-[#3a2b21] mb-2 tracking-widest" style={{ fontFamily: '"Noto Serif KR", serif' }}>
                  姓名學 鑑定書
                </h1>
                <p className="text-sm text-gray-500 uppercase tracking-[0.3em] mb-6">Statement of Name Analysis</p>
                
                <div className="flex justify-center gap-8 text-lg">
                   <div className="flex items-center">
                      <span className="w-16 font-bold text-gray-500 text-sm">성명</span>
                      <span className="text-2xl font-bold border-b border-gray-400 px-4 min-w-[100px]">
                        {lastNameInput}{firstNameInput}
                      </span>
                   </div>
                   <div className="flex items-center">
                      <span className="w-16 font-bold text-gray-500 text-sm">생년</span>
                      <span className="text-xl border-b border-gray-400 px-4 min-w-[120px]">
                        {analysis.year}년 ({analysis.ganji}생)
                      </span>
                   </div>
                </div>
             </header>

             {/* 2. 본문: 좌측 도표 / 우측 상세설명 */}
             <div className="flex-1 flex flex-col md:flex-row gap-6">
                
                {/* 좌측: 오행 분석표 */}
                <div className="w-full md:w-[28%] flex-shrink-0">
                  <div className="border-2 border-[#5a4b41]">
                    <div className="bg-[#5a4b41] text-[#dcd3c1] text-center py-2 font-bold text-lg">
                      오행 구조 (五行構造)
                    </div>
                    <div className="flex text-sm font-bold bg-gray-100 border-b border-gray-300 text-center py-2">
                      <div className="flex-1 border-r border-gray-300">구분</div>
                      <div className="flex-1 border-r border-gray-300">오행</div>
                      <div className="flex-1">육친</div>
                    </div>
                    
                    <div className="flex flex-col">
                      {getTableRows(analysis).map((row, idx, arr) => (
                        <div 
                          key={idx} 
                          className={`
                            flex text-center items-center h-12 
                            ${idx !== arr.length - 1 ? 'border-b border-gray-300' : ''}
                            ${row.isMyungjuseong ? 'bg-red-50' : 'bg-white'}
                          `}
                        >
                          <div className={`flex-1 text-xl border-r border-gray-300 flex items-center justify-center relative ${row.isMyungjuseong ? 'font-black text-red-900' : 'font-serif'}`}>
                            {row.symbol}
                            {row.isMyungjuseong && (
                              <span className="absolute -top-1 -left-1 text-[8px] bg-red-600 text-white px-1 rounded-br">명주성</span>
                            )}
                          </div>
                          <div className={`flex-1 text-base border-r border-gray-300 ${row.isMyungjuseong ? 'font-bold text-red-800' : 'text-gray-600'}`}>
                            {row.cheongan}
                          </div>
                          <div className={`flex-1 text-base ${row.isMyungjuseong ? 'font-bold text-red-800' : 'text-gray-600'}`}>
                            {row.sipsungName}
                          </div>
                        </div>
                      ))}
                      {/* 빈 행 채우기 (모양 유지) */}
                      {Array.from({ length: Math.max(0, 12 - getTableRows(analysis).length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="flex h-12 border-b border-gray-200 last:border-0">
                          <div className="flex-1 border-r border-gray-200"></div>
                          <div className="flex-1 border-r border-gray-200"></div>
                          <div className="flex-1"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-[#fcfbf7] text-xs text-gray-500 border border-[#e5e0d8] leading-relaxed text-justify">
                    * <strong>명주성(命主星)</strong>은 이름의 중심 기운으로, 성격과 운세의 70% 이상을 좌우하는 핵심 요소입니다. 
                    붉은색으로 표시된 부분이 귀하의 명주성입니다.
                  </div>
                </div>

                {/* 우측: 상세 통변 내용 */}
                <div className="flex-1 flex flex-col">
                   <div className="border-b-2 border-[#5a4b41] mb-4 pb-2 flex justify-between items-end">
                      <h3 className="text-xl font-bold text-[#3a2b21]">정밀 통변 (精密 通變)</h3>
                      <span className="text-xs text-gray-400">AI Name Analysis Lab</span>
                   </div>
                   
                   <div className="flex-1 text-[16px] leading-[1.8] text-justify whitespace-pre-wrap font-serif text-gray-800">
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                          <div className="animate-spin text-4xl text-[#5a4b41]">☯</div>
                          <span>성명학 대가 AI가 명조를 분석하고 있습니다...</span>
                        </div>
                      ) : (
                        reportText || <div className="text-center text-gray-300 py-20">좌측 상단에서 생년과 이름을 입력하여<br/>분석을 시작하십시오.</div>
                      )}
                   </div>
                </div>
             </div>

             {/* 3. 푸터: 저작권 및 날짜 */}
             <footer className="mt-8 pt-4 border-t border-[#5a4b41] text-center text-sm text-gray-500 flex justify-between items-center">
                <span>감명일: {new Date().toLocaleDateString()}</span>
                <span className="font-bold text-[#3a2b21]">AI 한글 성명학 연구소 謹呈</span>
             </footer>
          </div>
        </div>
      )}

      <style>{`
        /* 화면에서의 A4 느낌 */
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* 인쇄 시 설정 */
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background-color: white;
            padding: 0;
            margin: 0;
          }
          .not-print {
            display: none !important;
          }
          .a4-page {
            width: 100%;
            height: auto;
            min-height: 100%;
            margin: 0;
            box-shadow: none;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
