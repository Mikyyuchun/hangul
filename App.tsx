
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAnalyze = async () => {
    if (!lastNameInput || !firstNameInput) {
      alert('성명 정보를 모두 입력해 주세요.');
      return;
    }
    const { gan, ji } = getYearGanjiParts(year);
    const ganji = gan + ji;
    const lastName = decomposeAndMap(lastNameInput.charAt(0), gan);
    const firstName = Array.from(firstNameInput).map((char: string) => decomposeAndMap(char, gan));
    
    const result: AnalysisResult = { year, yearGan: gan, yearJi: ji, ganji, lastName, firstName };
    setAnalysis(result);
    
    const initialPrompt = `저의 이름 '${lastNameInput}${firstNameInput}'(${year}년생)에 대해 명주성 중심의 정밀 분석을 시작해 주십시오.`;
    const initialMessages: Message[] = [{ role: 'user', text: initialPrompt }];
    setMessages(initialMessages);
    
    setIsLoading(true);
    const responseText = await getAIAnalysis(result, initialMessages);
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
        desc = "중첩된 기운이 인접 요소의 극(제어)을 만나 '제화(制화)'를 이룬 길한 구성입니다.";
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

  // Fixed the non-existent function call getMyAnalysis to getMyungAnalysis
  const myStatus = getMyungAnalysis();

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#fcfbf7]">
      <header className="w-full max-w-5xl text-center mb-10">
        <h1 className="serif text-4xl md:text-5xl font-black text-[#5a4b41] mb-2 tracking-tighter">AI 韓字 姓名學 硏究所</h1>
        <p className="text-[#8c7a6b] font-medium tracking-[0.2em] uppercase text-xs">Antigravity Premium Analysis System</p>
        <div className="w-24 h-1 bg-[#5a4b41] mx-auto mt-6"></div>
      </header>

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
        <button onClick={handleAnalyze} disabled={isLoading} className="w-full mt-12 bg-[#5a4b41] text-white py-5 rounded-sm font-bold text-xl hover:bg-[#4a3b31] transition-all serif tracking-[0.5em] disabled:opacity-50">運命 分析 開始</button>
      </section>

      {analysis && (
        <div className="w-full max-w-5xl flex flex-col gap-12 animate-fadeIn">
          {myStatus && (
            <div className={`p-6 rounded-sm border-l-8 shadow-sm ${myStatus.isGood ? 'bg-blue-50 border-blue-600' : 'bg-red-50 border-red-600'}`}>
              <h3 className="font-black text-lg mb-1 serif">명주성(命主星) 정밀 분석 결과</h3>
              <p className="text-sm text-[#5a4b41] leading-relaxed">"{myStatus.desc}"</p>
            </div>
          )}

          <div className="bg-[#f2eee3] p-8 rounded-sm border border-[#dcd3c1]">
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
              <span>AI 運命 鑑定室</span>
              <span className="text-xs opacity-60">Powered by Gemini 3 Pro</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fcfbf7]">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-5 rounded-lg text-sm md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-[#5a4b41] text-white' : 'bg-white border border-[#dcd3c1] text-[#333] shadow-sm'}`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-center italic opacity-40 text-sm">기운을 분석하는 중...</div>}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-[#f2eee3] border-t border-[#dcd3c1] flex gap-3">
              <input name="message" type="text" placeholder="분석 결과에 대해 질문해 보세요..." className="flex-1 p-3 rounded-sm border border-[#dcd3c1] focus:outline-none focus:border-[#5a4b41] bg-white text-sm" autoComplete="off"/>
              <button type="submit" disabled={isLoading} className="bg-[#5a4b41] text-white px-8 py-3 rounded-sm font-bold text-sm hover:bg-[#4a3b31] transition-all serif">質疑 (Ask)</button>
            </form>
          </div>
        </div>
      )}

      <footer className="w-full max-w-5xl mt-20 mb-10 text-center text-[#8c7a6b] opacity-60 text-[10px] tracking-widest uppercase">
        &copy; 2025 AI Korean Name Research Institute. All rights reserved.
      </footer>
    </div>
  );
};

const CharacterCard: React.FC<{ char: HangulComponent, title: string, isCore?: boolean }> = ({ char, title, isCore }) => (
  <div className={`bg-white border rounded-sm p-4 shadow-sm relative ${isCore ? 'ring-2 ring-red-100 border-red-200' : 'border-[#dcd3c1]'}`}>
    {isCore && <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] px-1.5 py-0.5 font-bold rounded-full">CORE</div>}
    <div className="flex justify-between items-center border-b border-[#5a4b41] pb-2 mb-4">
      <span className="text-[10px] font-black text-[#8c7a6b] uppercase">{title}</span>
      <span className="serif text-3xl font-black text-[#5a4b41]">{char.char}</span>
    </div>
    <div className="space-y-3">
      <ComponentRow label="초성" sym={char.cho.symbol} info={char.cho.sipsung} />
      <ComponentRow label="중성" sym={char.jung.symbol} info={char.jung.sipsung} />
      {char.jong && <ComponentRow label="종성" sym={char.jong.symbol} info={char.jong.sipsung} />}
    </div>
  </div>
);

const ComponentRow: React.FC<{ label: string, sym: string, info: any }> = ({ label, sym, info }) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-[#8c7a6b]">{label} <b className="text-[#5a4b41]">{sym}</b></span>
    <span className="font-bold">{info?.name} ({info?.code})</span>
  </div>
);

export default App;
