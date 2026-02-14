
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, Message, HangulComponent, NameComponentMapping } from './types';
import { decomposeAndMap, getYearGanjiParts, checkSipsungGeuk, checkSipsungJungcheop } from './utils/hangulUtils';
import { getAIAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [year, setYear] = useState<number>(1995);
  const [lastNameInput, setLastNameInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleOpenKeySelector = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setErrorCode(null);
      // 키 선택 후 다시 시도
      handleAnalyze();
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
    
    const initialPrompt = `저의 이름 '${lastNameInput}${firstNameInput}'(${year}년생)에 대해 명주성 중심의 정밀 분석을 시작해 주십시오.`;
    setMessages([{ role: 'user', text: initialPrompt }]);
    
    setIsLoading(true);
    const responseText = await getAIAnalysis(result, [{ role: 'user', text: initialPrompt }]);
    
    if (["QUOTA_EXCEEDED", "API_KEY_MISSING", "API_KEY_INVALID"].includes(responseText)) {
      setErrorCode(responseText);
      setIsLoading(false);
      return;
    }
    
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const text = formData.get('message') as string;
    if (!text || !analysis || isLoading) return;
    
    const newMessages: Message[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    e.currentTarget.reset();
    
    setIsLoading(true);
    const responseText = await getAIAnalysis(analysis, newMessages);

    if (["QUOTA_EXCEEDED", "API_KEY_MISSING", "API_KEY_INVALID"].includes(responseText)) {
      setErrorCode(responseText);
      setIsLoading(false);
      return;
    }

    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  const getMyungAnalysis = () => {
    if (!analysis) return null;
    const flattened: NameComponentMapping[] = [];
    const add = (c: any) => {
      if (c.cho) flattened.push(c.cho);
      if (c.jung) flattened.push(c.jung);
      if (c.jong) flattened.push(c.jong);
    };
    add(analysis.lastName);
    analysis.firstName.forEach(add);

    const myung = analysis.firstName[0].cho;
    const myIdx = flattened.indexOf(myung);
    const myCode = myung.sipsung?.code ?? -1;
    const prev = myIdx > 0 ? flattened[myIdx - 1] : null;
    const next = myIdx < flattened.length - 1 ? flattened[myIdx + 1] : null;
    const pCode = prev?.sipsung?.code ?? -1;
    const nCode = next?.sipsung?.code ?? -1;

    const hasJung = (pCode !== -1 && checkSipsungJungcheop(pCode, myCode)) || 
                    (nCode !== -1 && checkSipsungJungcheop(nCode, myCode));
    const hasGeuk = (pCode !== -1 && checkSipsungGeuk(pCode, myCode)) || 
                    (nCode !== -1 && checkSipsungGeuk(nCode, myCode));

    let isGood = true;
    let desc = "안정적인 조화를 이루고 있습니다.";
    if (hasJung) {
      if (hasGeuk) {
        isGood = true;
        desc = "중첩된 기운이 인접 요소의 극(제어)을 만나 '제화(制化)'를 이룬 길한 구성입니다.";
      } else {
        isGood = false;
        desc = "유사 기운이 중첩되어 기세가 과하며, 이를 다스릴 제화 장치가 부족합니다.";
      }
    } else if (hasGeuk) {
      isGood = false;
      desc = "인접한 기운에 의해 본연의 힘이 억제되고 있습니다.";
    }

    return { isGood, desc };
  };

  const myStatus = getMyungAnalysis();

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#fcfbf7]">
      <header className="w-full max-w-5xl text-center mb-10 mt-8">
        <h1 className="serif text-4xl md:text-5xl font-black text-[#5a4b41] mb-2 tracking-tighter">AI 韓字 姓名學 硏究所</h1>
        <p className="text-[#8c7a6b] font-medium tracking-[0.2em] uppercase text-xs">Premium Destiny Analysis System</p>
        <div className="w-24 h-1 bg-[#5a4b41] mx-auto mt-6"></div>
      </header>

      {errorCode && (
        <div className="w-full max-w-5xl mb-8 p-6 bg-red-50 border border-red-200 rounded-sm flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-4 text-left">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="text-red-800 font-black text-lg serif">현재 서비스 이용량이 많아 할당량이 초과되었습니다.</p>
              <p className="text-red-700 text-sm">잠시 후 다시 시도하시거나, 개인 API 키를 사용하여 즉시 분석을 재개할 수 있습니다.</p>
            </div>
          </div>
          <button 
            onClick={handleOpenKeySelector}
            className="bg-red-600 text-white px-8 py-3 rounded-sm font-bold text-sm hover:bg-red-700 transition-all shadow-lg shrink-0 serif tracking-widest"
          >
            개인 API 키 사용하기
          </button>
        </div>
      )}

      <section className="w-full max-w-5xl bg-white p-6 md:p-10 shadow-xl rounded-sm border border-[#dcd3c1] mb-10 relative">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#5a4b41]"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#5a4b41] uppercase tracking-widest opacity-60">Birth Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full border-b-2 border-[#dcd3c1] pb-2 focus:outline-none focus:border-[#5a4b41] text-2xl font-bold bg-transparent transition-all"/>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#5a4b41] uppercase tracking-widest opacity-60">Surname</label>
            <input type="text" placeholder="성" maxLength={1} value={lastNameInput} onChange={(e) => setLastNameInput(e.target.value)} className="w-full border-b-2 border-[#dcd3c1] pb-2 focus:outline-none focus:border-[#5a4b41] text-2xl font-bold bg-transparent transition-all"/>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#5a4b41] uppercase tracking-widest opacity-60">Given Name</label>
            <input type="text" placeholder="이름" value={firstNameInput} onChange={(e) => setFirstNameInput(e.target.value)} className="w-full border-b-2 border-[#dcd3c1] pb-2 focus:outline-none focus:border-[#5a4b41] text-2xl font-bold bg-transparent transition-all"/>
          </div>
        </div>
        <button onClick={handleAnalyze} disabled={isLoading} className="w-full mt-12 bg-[#5a4b41] text-white py-5 rounded-sm font-bold text-xl hover:bg-[#4a3b31] transition-all serif tracking-[0.5em] disabled:opacity-50 shadow-lg">運命 分析 開始</button>
      </section>

      {analysis && (
        <div className="w-full max-w-5xl flex flex-col gap-12 animate-fadeIn mb-20">
          {myStatus && (
            <div className={`p-6 rounded-sm border-l-8 shadow-md ${myStatus.isGood ? 'bg-blue-50 border-blue-600' : 'bg-red-50 border-red-600'}`}>
              <h3 className="font-black text-lg mb-1 serif flex items-center gap-2">
                {myStatus.isGood ? '✅' : '⚠️'} 명주성(命主星) 정밀 분석 결과
              </h3>
              <p className="text-sm text-[#5a4b41] leading-relaxed">"{myStatus.desc}"</p>
            </div>
          )}

          <div className="bg-[#f2eee3] p-8 rounded-sm border border-[#dcd3c1] shadow-inner">
            <h2 className="serif text-2xl font-black text-[#5a4b41] mb-8 border-b-2 border-[#5a4b41] inline-block pb-1">姓名學 精密 構成表</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <CharacterCard char={analysis.lastName} title="姓 (Surname)" />
              {analysis.firstName.map((char, i) => (
                <CharacterCard key={i} char={char} title={`名 (Name ${i+1})`} isCore={i === 0} />
              ))}
            </div>
          </div>

          <div className="flex flex-col h-[700px] bg-white border-2 border-[#5a4b41] rounded-sm shadow-2xl overflow-hidden">
            <div className="bg-[#5a4b41] text-white p-4 font-bold serif flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>AI 運命 鑑定室</span>
              </div>
              <span className="text-[10px] opacity-60 tracking-widest">GEMINI 3 FLASH ENGINE</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fcfbf7]">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-lg text-sm md:text-base leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#5a4b41] text-white rounded-br-none' : 'bg-white border border-[#dcd3c1] text-[#333] rounded-bl-none'}`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#dcd3c1] p-5 rounded-lg shadow-sm flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-[#5a4b41] rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-[#5a4b41] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-[#5a4b41] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    </div>
                    <span className="text-xs italic text-[#8c7a6b]">우주의 기운을 읽어내는 중입니다...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-[#f2eee3] border-t border-[#dcd3c1] flex gap-3">
              <input 
                name="message" 
                type="text" 
                placeholder={errorCode ? "위의 에러를 먼저 확인해 주세요." : "분석 결과에 대해 질문해 보세요..."}
                disabled={isLoading || !!errorCode}
                className="flex-1 p-3 rounded-sm border border-[#dcd3c1] focus:outline-none focus:border-[#5a4b41] bg-white text-sm" 
                autoComplete="off"
              />
              <button 
                type="submit" 
                disabled={isLoading || !!errorCode}
                className="bg-[#5a4b41] text-white px-8 py-3 rounded-sm font-bold text-sm hover:bg-[#4a3b31] transition-all serif disabled:opacity-50"
              >
                質疑 (Ask)
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="w-full max-w-5xl mt-auto py-10 text-center text-[#8c7a6b] opacity-60 text-[10px] tracking-widest uppercase">
        &copy; 2025 AI Korean Name Research Institute. All rights reserved.
      </footer>
    </div>
  );
};

const CharacterCard: React.FC<{ char: HangulComponent, title: string, isCore?: boolean }> = ({ char, title, isCore }) => (
  <div className={`bg-white border rounded-sm p-5 shadow-sm relative transition-all hover:shadow-md ${isCore ? 'ring-2 ring-red-100 border-red-300' : 'border-[#dcd3c1]'}`}>
    {isCore && <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] px-2 py-0.5 font-bold rounded-full shadow-sm z-10">CORE</div>}
    <div className="flex justify-between items-center border-b border-[#5a4b41] pb-3 mb-4">
      <span className="text-[10px] font-black text-[#8c7a6b] uppercase tracking-tighter opacity-70">{title}</span>
      <span className="serif text-4xl font-black text-[#5a4b41] leading-none">{char.char}</span>
    </div>
    <div className="space-y-4">
      <ComponentRow label="초성" sym={char.cho.symbol} info={char.cho.sipsung} />
      <ComponentRow label="중성" sym={char.jung.symbol} info={char.jung.sipsung} />
      {char.jong && <ComponentRow label="종성" sym={char.jong.symbol} info={char.jong.sipsung} />}
    </div>
  </div>
);

const ComponentRow: React.FC<{ label: string, sym: string, info: any }> = ({ label, sym, info }) => (
  <div className="flex justify-between items-center text-xs">
    <div className="flex flex-col">
      <span className="text-[9px] text-[#8c7a6b] font-bold uppercase mb-0.5">{label}</span>
      <span className="text-lg font-black text-[#5a4b41] leading-none">{sym}</span>
    </div>
    <div className="text-right">
      <div className="text-[9px] text-[#8c7a6b] font-bold mb-0.5">SIPSUNG</div>
      <span className={`font-bold px-2 py-0.5 rounded-sm ${info?.code >= 7 ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-900'}`}>
        {info?.name} ({info?.code})
      </span>
    </div>
  </div>
);

export default App;
