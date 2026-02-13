import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, Message, FiveElements, HangulComponent, NameComponentMapping } from './types';
import { decomposeAndMap, getYearGanjiParts, calculateGanji, checkSipsungGeuk, checkSipsungSaeng, checkSipsungJungcheop } from './utils/hangulUtils';
import { getAIAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [year, setYear] = useState<number>(1990);
  const [lastNameInput, setLastNameInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAnalyze = () => {
    if (!lastNameInput || !firstNameInput) {
      alert('성과 이름을 모두 입력해주세요.');
      return;
    }

    const { gan, ji } = getYearGanjiParts(year);
    const ganji = gan + ji;
    const lastName = decomposeAndMap(lastNameInput.charAt(0), gan);
    const firstName = Array.from(firstNameInput).map((char: string) => decomposeAndMap(char, gan));

    const result: AnalysisResult = {
      year,
      yearGan: gan,
      yearJi: ji,
      ganji,
      lastName,
      firstName
    };

    setAnalysis(result);
    const initialPrompt = `저의 이름 '${lastNameInput}${firstNameInput}'(${year}년 ${ganji}년생)에 대해 성명학적으로 정밀 분석을 시작해 주세요. 명주성과 이름 전체의 십성 인접 관계 및 제화(制化) 로직을 중심으로 길흉화복을 통변해 주십시오.`;
    setMessages([{ role: 'user', text: initialPrompt }]);
    fetchAIResponse(result, [{ role: 'user', text: initialPrompt }]);
  };

  const fetchAIResponse = async (currentAnalysis: AnalysisResult, currentHistory: Message[]) => {
    setIsLoading(true);
    const responseText = await getAIAnalysis(currentAnalysis, currentHistory);
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const messageValue = formData.get('message');
    const text = typeof messageValue === 'string' ? messageValue : '';
    if (!text || !analysis) return;
    const newMessages: Message[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    e.currentTarget.reset();
    fetchAIResponse(analysis, newMessages);
  };

  // 명주성 및 전체 십성 제화 로직 기반 상태 계산
  const getMyungjusungAnalysis = () => {
    if (!analysis) return null;
    
    const flattened: NameComponentMapping[] = [];
    const addChar = (char: any) => {
      if (char.cho) flattened.push(char.cho);
      if (char.jung) flattened.push(char.jung);
      if (char.jong) flattened.push(char.jong);
    };

    addChar(analysis.lastName);
    analysis.firstName.forEach(addChar);

    const myung = analysis.firstName[0].cho;
    const myIdx = flattened.findIndex(item => item === myung);
    const myCode = myung.sipsung?.code ?? -1;
    
    const prev = myIdx > 0 ? flattened[myIdx - 1] : null;
    const next = myIdx < flattened.length - 1 ? flattened[myIdx + 1] : null;

    const prevCode = prev?.sipsung?.code ?? -1;
    const nextCode = next?.sipsung?.code ?? -1;

    // 1. 중첩 여부 (인접)
    const isJungcheopPrev = prevCode !== -1 && checkSipsungJungcheop(prevCode, myCode);
    const isJungcheopNext = nextCode !== -1 && checkSipsungJungcheop(nextCode, myCode);
    const hasJungcheop = isJungcheopPrev || isJungcheopNext;

    // 2. 극(Geuk) 여부 (나를 제어하는가?)
    const isGeukedByPrev = prevCode !== -1 && checkSipsungGeuk(prevCode, myCode);
    const isGeukedByNext = nextCode !== -1 && checkSipsungGeuk(nextCode, myCode);
    const hasGeukControl = isGeukedByPrev || isGeukedByNext;

    // 3. 상생 여부
    const isSaengAdj = (prevCode !== -1 && (checkSipsungSaeng(prevCode, myCode) || checkSipsungSaeng(myCode, prevCode))) ||
                       (nextCode !== -1 && (checkSipsungSaeng(myCode, nextCode) || checkSipsungSaeng(nextCode, myCode)));

    // 최종 판정: 중첩이 있어도 극에 의한 제어가 있다면 '길'
    let isGood = true;
    let reason = "인접 요소와 평이한 관계입니다.";

    if (hasJungcheop) {
      if (hasGeukControl) {
        isGood = true;
        reason = "십성이 중첩되었으나 인접 글자의 극(제어)을 받아 복록(吉)으로 변했습니다. (제화)";
      } else {
        isGood = false;
        reason = "십성이 중첩되어 기운이 한곳으로 치우쳤습니다. (흉)";
      }
    } else if (hasGeukControl) {
      isGood = false;
      reason = "인접한 글자로부터 직접적인 극을 받아 기운이 약화되었습니다. (흉)";
    } else if (isSaengAdj) {
      isGood = true;
      reason = "인접한 글자들과 상생의 흐름을 이루어 운세가 길합니다. (길)";
    }

    return { 
      isGood,
      reason,
      prevSym: prev?.symbol || '없음', 
      nextSym: next?.symbol || '없음' 
    };
  };

  const myungStatus = getMyungjusungAnalysis();

  const renderMappingRow = (label: string, mapping: NameComponentMapping | null, isMyungjusung: boolean = false) => {
    if (!mapping) return null;
    return (
      <tr className="border-b border-[#dcd3c1]">
        <td className="py-2 text-[11px] font-bold text-[#8c7a6b]">
          {label}
          {isMyungjusung && (
            <span className="block text-[9px] text-red-600 font-black mt-0.5">명주성(名主星)</span>
          )}
        </td>
        <td className="py-2 text-center font-bold">{mapping.symbol}</td>
        <td className="py-2 text-center text-[#5a4b41] serif">{mapping.cheongan}{mapping.jiji}</td>
        <td className="py-2 text-center">
          <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${getElementBg(mapping.element)}`}>
            {mapping.element}
          </span>
        </td>
        <td className="py-2 text-center">
          {mapping.sipsung ? (
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-[#b45309]">{mapping.sipsung.name}</span>
              <span className="text-[10px] text-[#8c7a6b]">({mapping.sipsung.code})</span>
            </div>
          ) : '-'}
        </td>
      </tr>
    );
  };

  const renderCharacterCard = (char: HangulComponent, title: string, isFirstGivenName: boolean = false) => (
    <div className="bg-white border border-[#dcd3c1] rounded-sm p-4 shadow-sm relative overflow-hidden">
      {isFirstGivenName && (
        <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest">Core</div>
      )}
      <div className="flex justify-between items-center border-b-2 border-[#5a4b41] pb-2 mb-3">
        <span className="text-xs font-bold text-[#8c7a6b] tracking-widest">{title}</span>
        <span className="serif text-3xl font-black text-[#5a4b41]">{char.char}</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-[10px] text-[#8c7a6b] border-b border-[#dcd3c1]">
            <th className="text-left py-1">분류</th>
            <th className="py-1">기호</th>
            <th className="py-1">간지</th>
            <th className="py-1">오행</th>
            <th className="py-1">십성</th>
          </tr>
        </thead>
        <tbody>
          {renderMappingRow('초성', char.cho, isFirstGivenName)}
          {renderMappingRow('중성', char.jung)}
          {renderMappingRow('종성', char.jong)}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#fcfbf7]">
      <header className="w-full max-w-5xl text-center mb-10">
        <h1 className="serif text-4xl md:text-5xl font-black text-[#5a4b41] mb-2">AI 韓字 姓名學 硏究所</h1>
        <p className="text-[#8c7a6b] font-medium tracking-widest uppercase text-sm">Korean Name Analysis Research Institute</p>
        <div className="w-32 h-1 bg-[#5a4b41] mx-auto mt-6"></div>
      </header>

      <section className="w-full max-w-5xl bg-white p-6 md:p-8 shadow-2xl rounded-sm border border-[#dcd3c1] mb-8 relative">
        <div className="absolute top-0 left-0 w-2 h-full bg-[#5a4b41]"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-xs font-black text-[#5a4b41] mb-2 uppercase tracking-tighter">출생년도 (Birth Year)</label>
            <input 
              type="number" 
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border-b-2 border-[#dcd3c1] p-3 focus:outline-none focus:border-[#5a4b41] text-xl font-bold bg-[#fcfbf7]"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-[#5a4b41] mb-2 uppercase tracking-tighter">성씨 (Surname)</label>
            <input 
              type="text" 
              placeholder="예: 김"
              maxLength={1}
              value={lastNameInput}
              onChange={(e) => setLastNameInput(e.target.value)}
              className="w-full border-b-2 border-[#dcd3c1] p-3 focus:outline-none focus:border-[#5a4b41] text-xl font-bold bg-[#fcfbf7]"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-[#5a4b41] mb-2 uppercase tracking-tighter">이름 (Given Name)</label>
            <input 
              type="text" 
              placeholder="예: 지민"
              value={firstNameInput}
              onChange={(e) => setFirstNameInput(e.target.value)}
              className="w-full border-b-2 border-[#dcd3c1] p-3 focus:outline-none focus:border-[#5a4b41] text-xl font-bold bg-[#fcfbf7]"
            />
          </div>
        </div>
        <button 
          onClick={handleAnalyze}
          className="w-full mt-10 bg-[#5a4b41] text-[#fcfbf7] py-5 rounded-sm font-bold text-xl hover:bg-[#4a3b31] transition-all serif tracking-[0.3em] shadow-lg active:transform active:scale-[0.99]"
        >
          運命 분석 시작
        </button>
      </section>

      {analysis && (
        <div className="w-full max-w-5xl flex flex-col gap-10 animate-fadeIn">
          {/* 명주성 인접 분석 카드 (제화 로직 반영) */}
          <div className={`p-5 rounded-sm border-2 ${myungStatus?.isGood ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} shadow-sm flex flex-col md:flex-row items-center justify-between gap-4`}>
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-black serif text-2xl shadow-md ${myungStatus?.isGood ? 'bg-blue-600' : 'bg-red-600'}`}>
                {analysis.firstName[0].cho.symbol}
              </div>
              <div>
                <h3 className={`font-black text-lg ${myungStatus?.isGood ? 'text-blue-900' : 'text-red-900'}`}>
                  명주성 정밀 판정: {myungStatus?.isGood ? '길(吉) - 조화와 제화' : '흉(凶) - 충돌과 태과'}
                </h3>
                <p className="text-sm text-[#5a4b41] mt-1 font-medium italic">
                  "{myungStatus?.reason}"
                </p>
                <p className="text-[11px] text-[#8c7a6b] mt-1 uppercase tracking-tight">
                  Adjacent Context: Prev({myungStatus?.prevSym}) | Next({myungStatus?.nextSym})
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end">
              <span className="text-[10px] font-black opacity-50 tracking-widest uppercase">Myungjusung Advanced Status</span>
              <span className={`text-4xl font-black serif leading-none ${myungStatus?.isGood ? 'text-blue-600' : 'text-red-600'}`}>
                {myungStatus?.isGood ? '吉' : '凶'}
              </span>
            </div>
          </div>

          {/* Detailed Mapping Grid */}
          <div className="bg-[#f2eee3] p-8 rounded-sm border border-[#dcd3c1] shadow-inner">
            <h2 className="serif text-2xl font-black text-[#5a4b41] mb-8 border-b-4 border-[#5a4b41] inline-block pb-1">姓名學 精密 構成表</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderCharacterCard(analysis.lastName, "姓 (Surname)")}
              {analysis.firstName.map((char, i) => renderCharacterCard(char, `名 (Name ${i+1})`, i === 0))}
            </div>
          </div>

          {/* AI Chat Section */}
          <div className="flex flex-col h-[700px] bg-white border-4 border-[#5a4b41] rounded-sm relative overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]">
            <div className="bg-[#5a4b41] text-white p-5 font-bold serif tracking-wider flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-lg">AI 運命 鑑定室</span>
              </div>
              <span className="text-xs opacity-60 font-sans tracking-widest">GEMINI 3.0 PRO</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fcfbf7] scrollbar-thin scrollbar-thumb-[#5a4b41]">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-md shadow-md leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-[#5a4b41] text-[#fcfbf7] rounded-br-none border border-[#4a3b31]' 
                      : 'bg-white text-[#333] border-l-8 border-[#5a4b41] rounded-bl-none prose prose-slate max-w-none'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm md:text-base font-medium">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#f2eee3] p-5 rounded-md border-l-8 border-[#dcd3c1] flex items-center gap-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-[#5a4b41] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-[#5a4b41] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-[#5a4b41] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <span className="text-[#8c7a6b] font-bold serif">천지의 기운을 살피는 중입니다...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-6 bg-[#f2eee3] border-t-2 border-[#dcd3c1] flex gap-3">
              <input 
                name="message"
                type="text" 
                autoComplete="off"
                placeholder="인접 관계에서의 제화(制化) 작용이나 전체적인 운세 흐름을 물어보세요..."
                className="flex-1 p-4 rounded-sm border-2 border-[#dcd3c1] focus:outline-none focus:border-[#5a4b41] focus:ring-0 text-base bg-white shadow-inner font-medium"
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="bg-[#5a4b41] text-white px-10 py-4 rounded-sm font-bold hover:bg-[#4a3b31] transition-all shadow-md active:shadow-inner disabled:opacity-50 serif tracking-widest"
              >
                질의 (問)
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="w-full max-w-5xl mt-16 mb-12 text-center text-[#8c7a6b] border-t border-[#dcd3c1] pt-8">
        <p className="serif text-lg font-bold text-[#5a4b41] mb-2">AI 한글 성명학 연구소 (AI KOREAN NAME RESEARCH)</p>
        <p className="text-xs opacity-70">본 분석 시스템은 전통 성명학 이론과 현대 AI 기술을 융합하여 제공되는 감명 서비스입니다. 모든 풀이는 인생의 참고 자료로 활용하시기 바랍니다.</p>
      </footer>
    </div>
  );
};

const getElementBg = (element: FiveElements): string => {
  switch (element) {
    case FiveElements.WOOD: return 'bg-emerald-700';
    case FiveElements.FIRE: return 'bg-rose-700';
    case FiveElements.EARTH: return 'bg-amber-600';
    case FiveElements.METAL: return 'bg-slate-500';
    case FiveElements.WATER: return 'bg-sky-800';
    default: return 'bg-zinc-700';
  }
};

export default App;