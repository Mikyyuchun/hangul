
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
    const rows: { symbol: string; cheongan: string; sipsungName: string; }[] = [];
    
    const addComponent = (comp: NameComponentMapping | null) => {
      if (!comp) return;
      rows.push({
        symbol: comp.symbol,
        cheongan: comp.cheongan,
        sipsungName: comp.sipsung?.name || ''
      });
    };

    // 성
    addComponent(result.lastName.cho);
    addComponent(result.lastName.jung);
    addComponent(result.lastName.jong);

    // 이름
    result.firstName.forEach(fn => {
      addComponent(fn.cho);
      addComponent(fn.jung);
      addComponent(fn.jong);
    });

    return rows;
  };

  return (
    <div className="min-h-screen bg-white text-black font-serif p-4 md:p-10">
      
      {/* 입력 폼 */}
      <div className="max-w-4xl mx-auto mb-10 bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm not-print">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-500 mb-1">출생년도</label>
            <input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))} 
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-bold text-gray-500 mb-1">성</label>
            <input 
              type="text" 
              value={lastNameInput} 
              maxLength={1}
              onChange={(e) => setLastNameInput(e.target.value)} 
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none text-center"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-500 mb-1">이름</label>
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
            className="w-full md:w-auto bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 h-[42px]"
          >
            {isLoading ? '분석 중...' : '분석하기'}
          </button>
        </div>
        {errorCode && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded flex justify-between items-center">
             <span>⚠️ API 키 오류 또는 할당량 초과입니다.</span>
             <button onClick={handleOpenKeySelector} className="underline font-bold">키 설정하기</button>
          </div>
        )}
      </div>

      {/* 결과 테이블 */}
      {analysis && (
        <div className="max-w-5xl mx-auto border-2 border-black">
          {/* 테이블 제목 */}
          <div className="text-center py-3 border-b border-black text-xl font-bold bg-gray-50">
            {lastNameInput}{firstNameInput} {analysis.year}년 {analysis.ganji}생
          </div>

          <div className="flex">
            {/* 좌측: 구성요소 테이블 */}
            <div className="w-[30%] md:w-[25%] border-r border-black flex flex-col">
              {/* 헤더 */}
              <div className="flex border-b border-black bg-gray-50 text-center font-bold text-sm h-8 items-center">
                <div className="flex-1 border-r border-gray-300">이름</div>
                <div className="flex-1 border-r border-gray-300">오행</div>
                <div className="flex-1">육친</div>
              </div>
              
              {/* 데이터 행들 */}
              <div className="flex-1 flex flex-col">
                 {getTableRows(analysis).map((row, idx, arr) => (
                   <div key={idx} className={`flex text-center items-center h-12 ${idx !== arr.length - 1 ? 'border-b border-gray-300' : ''}`}>
                     <div className="flex-1 font-bold text-lg border-r border-gray-300">{row.symbol}</div>
                     <div className="flex-1 text-sm border-r border-gray-300">{row.cheongan}</div>
                     <div className="flex-1 text-sm">{row.sipsungName}</div>
                   </div>
                 ))}
                 {/* 행 수가 적을 경우 빈 공간 채우기 (디자인 유지) */}
                 {Array.from({ length: Math.max(0, 10 - getTableRows(analysis).length) }).map((_, i) => (
                   <div key={`empty-${i}`} className="flex h-12 border-b border-gray-300 last:border-0">
                     <div className="flex-1 border-r border-gray-300"></div>
                     <div className="flex-1 border-r border-gray-300"></div>
                     <div className="flex-1"></div>
                   </div>
                 ))}
              </div>
            </div>

            {/* 우측: 이름풀이 (AI 결과) */}
            <div className="flex-1 flex flex-col">
              <div className="h-8 border-b border-black bg-gray-50 text-center font-bold text-sm flex items-center justify-center text-orange-600 underline decoration-orange-600 underline-offset-4 decoration-dotted">
                이름풀이
              </div>
              <div className="p-6 text-sm leading-relaxed whitespace-pre-wrap h-full min-h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                    <span className="animate-spin text-xl">⏳</span>
                    <span>정밀 분석 중입니다...</span>
                  </div>
                ) : (
                  reportText || <span className="text-gray-300 text-center block mt-20">분석 결과가 여기에 표시됩니다.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center mt-10 text-xs text-gray-400 not-print">
        AI 한글 성명학 연구소 | Powered by Google Gemini
      </div>

      <style>{`
        @media print {
          .not-print { display: none; }
          body { padding: 0; background: white; }
          .border-2 { border-width: 2px !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
