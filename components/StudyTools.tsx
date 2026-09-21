import React, { useState, useEffect, useMemo } from 'react';
import { generateImage } from '../services/geminiService';
import { LatexMath, renderLatexInText } from './LatexMath';

// --- Types ---

export interface QuizData {
  title: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number; // index
    explanation: string;
  }[];
}

export interface VisualData {
  prompt: string;
  title: string;
  caption: string;
}

export interface CalcStep {
  step: number;
  label?: string;
  math: string;
  explanation?: string;
}

export interface CalcData {
  title: string;
  expression?: string;
  result?: string;
  formula?: string;
  steps?: CalcStep[];
  variables?: Record<string, number>;
  graph?: {
    type?: string;
    fn?: string;
    domain?: [number, number];
  };
  notes?: string;
}

// --- Visual Card Component ---

export const VisualCard: React.FC<{ data: VisualData }> = ({ data }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchImage = async () => {
      try {
        const base64 = await generateImage(data.prompt);
        if (mounted) setImageUrl(`data:image/jpeg;base64,${base64}`);
      } catch (e) {
        console.error(e);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchImage();
    return () => { mounted = false; };
  }, [data.prompt]);

  if (error) return null; // Hide if generation fails

  return (
    <div className="my-4 relative w-full rounded-xl overflow-hidden shadow-2xl group border border-neutral-800">
      <div className={`aspect-video bg-gray-900 flex items-center justify-center relative ${loading ? 'animate-pulse' : ''}`}>
        {loading && (
          <div className="flex flex-col items-center space-y-2 text-cyan-400">
            <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-mono uppercase tracking-widest">Generating Visual...</span>
          </div>
        )}
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt={data.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        
        {/* Title Card Overlay */}
        {!loading && imageUrl && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-12">
            <h3 className="text-xl font-bold text-white font-serif tracking-wide mb-1 border-l-4 border-cyan-500 pl-3">
              {data.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 pl-4 font-sans">
              {data.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Interactive Math & Calculation Solver Component ---

export const MathCalcWidget: React.FC<{ data: CalcData }> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'solution' | 'steps' | 'graph' | 'interactive'>('solution');
  const [customExpr, setCustomExpr] = useState(data.expression || '');
  const [calcResult, setCalcResult] = useState<string | null>(data.result || null);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [variables, setVariables] = useState<Record<string, number>>(data.variables || {});

  // Function plotting calculation for 2D graphs
  const graphPoints = useMemo(() => {
    const fnStr = data.graph?.fn || data.expression;
    if (!fnStr) return null;

    try {
      const domain: [number, number] = data.graph?.domain || [-6, 6];
      const points: { x: number; y: number }[] = [];
      const step = (domain[1] - domain[0]) / 50;

      // Safe evaluation of simple math expression
      const cleanFn = fnStr
        .replace(/\^/g, '**')
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/log/g, 'Math.log')
        .replace(/pi/gi, 'Math.PI')
        .replace(/e\b/gi, 'Math.E');

      for (let x = domain[0]; x <= domain[1]; x += step) {
        try {
          const evalFn = new Function('x', `return ${cleanFn};`);
          const y = evalFn(x);
          if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
            points.push({ x, y: Math.max(-20, Math.min(20, y)) });
          }
        } catch {
          // skip invalid points
        }
      }
      return points.length > 3 ? points : null;
    } catch {
      return null;
    }
  }, [data.graph, data.expression]);

  const handleEvaluateCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customExpr.trim()) return;

    try {
      // Evaluate safe mathematical expression
      const sanitized = customExpr
        .replace(/\^/g, '**')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/pi/gi, 'Math.PI')
        .replace(/e\b/gi, 'Math.E');

      // Add variables to context
      const varKeys = Object.keys(variables);
      const varVals = Object.values(variables);
      const evaluator = new Function(...varKeys, `return (${sanitized});`);
      const res = evaluator(...varVals);
      
      setCalcResult(String(res));
    } catch (err: any) {
      setCalcResult(`Error: ${err.message || 'Invalid Math Expression'}`);
    }
  };

  const handleCopyLatex = () => {
    const latex = data.formula || data.expression || data.result || '';
    if (latex) {
      navigator.clipboard.writeText(latex);
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2000);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-cyan-500/30 bg-[#0d131d] shadow-xl font-sans text-neutral-200">
      
      {/* Header Bar */}
      <div className="bg-[#121b29] px-4 py-2.5 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
            ∑
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-cyan-200 font-mono tracking-wide">
              {data.title || 'Mathematical Calculation & Solver'}
            </h4>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 bg-black/40 p-0.5 rounded-lg border border-cyan-900/40 text-xs">
          <button
            onClick={() => setActiveTab('solution')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              activeTab === 'solution' ? 'bg-cyan-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Solution
          </button>

          {data.steps && data.steps.length > 0 && (
            <button
              onClick={() => setActiveTab('steps')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center space-x-1 ${
                activeTab === 'steps' ? 'bg-cyan-600 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Steps</span>
              <span className="px-1 rounded bg-black/30 text-[10px]">{data.steps.length}</span>
            </button>
          )}

          {graphPoints && (
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                activeTab === 'graph' ? 'bg-cyan-600 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Graph / Plot
            </button>
          )}

          <button
            onClick={() => setActiveTab('interactive')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              activeTab === 'interactive' ? 'bg-cyan-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Calculator
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 space-y-4">
        
        {/* Solution Tab */}
        {activeTab === 'solution' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Primary LaTeX Formula Display */}
            {data.formula && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-500/20 text-center">
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
                  Governing Formula
                </div>
                <LatexMath math={data.formula} block={true} className="text-base sm:text-lg text-cyan-200" />
              </div>
            )}

            {/* Expression & Result Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.expression && (
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Input Expression</span>
                  <div className="mt-1 font-mono text-sm text-cyan-300 font-semibold overflow-x-auto custom-scrollbar">
                    {data.expression.includes('\\') || data.expression.includes('^') ? (
                      <LatexMath math={data.expression} block={false} />
                    ) : (
                      data.expression
                    )}
                  </div>
                </div>
              )}

              {(data.result || calcResult) && (
                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Computed Result</span>
                  <div className="mt-1 font-mono text-sm sm:text-base text-emerald-300 font-bold overflow-x-auto custom-scrollbar">
                    {(data.result || calcResult)?.includes('\\') ? (
                      <LatexMath math={data.result || calcResult || ''} block={false} />
                    ) : (
                      data.result || calcResult
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Variables / Parameters Pill List */}
            {Object.keys(variables).length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Variables & Values</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(variables).map(([k, v]) => (
                    <div key={k} className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center space-x-1.5 text-xs font-mono">
                      <span className="text-cyan-300 font-bold">{k}</span>
                      <span className="text-neutral-500">=</span>
                      <span className="text-emerald-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {data.notes && (
              <div className="p-3 rounded-lg bg-neutral-900/40 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                {renderLatexInText(data.notes)}
              </div>
            )}
          </div>
        )}

        {/* Step-by-Step Breakdown Tab */}
        {activeTab === 'steps' && data.steps && (
          <div className="space-y-3 animate-fadeIn">
            {data.steps.map((st, i) => (
              <div key={st.step || i} className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono text-[11px] font-bold border border-cyan-500/30">
                      {st.step || i + 1}
                    </span>
                    <span className="text-xs font-semibold text-neutral-200">
                      {st.label || `Step ${st.step || i + 1}`}
                    </span>
                  </div>
                </div>

                {st.math && (
                  <div className="p-2 rounded-lg bg-black/60 border border-cyan-900/30 overflow-x-auto custom-scrollbar">
                    <LatexMath math={st.math} block={true} className="text-cyan-200 text-sm" />
                  </div>
                )}

                {st.explanation && (
                  <p className="text-xs text-neutral-300 leading-relaxed pl-1">
                    {renderLatexInText(st.explanation)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Graph / Function Plotter Tab */}
        {activeTab === 'graph' && graphPoints && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>Function: <strong className="text-cyan-300">{data.graph?.fn || data.expression}</strong></span>
              <span>2D Cartensian Plot</span>
            </div>

            <div className="h-60 w-full bg-neutral-950 rounded-xl p-3 border border-neutral-800 flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full" viewBox="-10 -15 20 30" preserveAspectRatio="none">
                {/* Axes */}
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#334155" strokeWidth="0.3" />
                <line x1="0" y1="-15" x2="0" y2="15" stroke="#334155" strokeWidth="0.3" />

                {/* Grid ticks */}
                {[-8, -6, -4, -2, 2, 4, 6, 8].map(tick => (
                  <line key={tick} x1={tick} y1="-0.4" x2={tick} y2="0.4" stroke="#475569" strokeWidth="0.2" />
                ))}
                {[-10, -5, 5, 10].map(tick => (
                  <line key={tick} x1="-0.4" y1={tick} x2="0.4" y2={tick} stroke="#475569" strokeWidth="0.2" />
                ))}

                {/* Curve Line */}
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="0.6"
                  points={graphPoints.map(p => `${p.x},${-p.y}`).join(' ')}
                />
              </svg>
            </div>
          </div>
        )}

        {/* Interactive Calculator Pad Tab */}
        {activeTab === 'interactive' && (
          <div className="space-y-3 animate-fadeIn">
            <form onSubmit={handleEvaluateCustom} className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Custom Math Expression (e.g. 2*sin(pi/4) + sqrt(16))
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customExpr}
                    onChange={(e) => setCustomExpr(e.target.value)}
                    placeholder="Enter mathematical formula..."
                    className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                  >
                    Calculate
                  </button>
                </div>
              </div>

              {/* Quick Math Operators Bar */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['+', '-', '*', '/', '^2', 'sqrt(', 'sin(', 'cos(', 'tan(', 'pi', 'e', 'log('].map(sym => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setCustomExpr(prev => prev + sym)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-md text-xs font-mono border border-neutral-700 transition-colors"
                  >
                    {sym}
                  </button>
                ))}
              </div>

              {calcResult && (
                <div className="p-3 rounded-lg bg-black/60 border border-cyan-500/30 flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-400">Result:</span>
                  <span className="text-base font-mono font-bold text-emerald-400">{calcResult}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Bottom Utility Bar */}
        <div className="pt-2 border-t border-cyan-900/30 flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono text-[11px]">LaTeX KaTeX Support Active</span>
          <button
            onClick={handleCopyLatex}
            className="flex items-center space-x-1 hover:text-cyan-300 font-medium transition-colors"
          >
            <span>{copiedLatex ? '✓ Copied LaTeX' : 'Copy LaTeX Formula'}</span>
          </button>
        </div>

      </div>

    </div>
  );
};

// --- Quiz Widget Component ---

export const QuizWidget: React.FC<{ data: QuizData }> = ({ data }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const question = data.questions[currentQuestion];
  const isCorrect = selectedOption === question.correctAnswer;

  const handleOptionClick = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    if (index === question.correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < data.questions.length - 1) {
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setCompleted(true);
    }
  };

  if (completed) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 my-4 text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Quiz Completed!</h3>
        <p className="text-gray-400 mb-6">You scored <span className="text-cyan-400 font-bold">{score}</span> out of <span className="text-white">{data.questions.length}</span></p>
        <button 
          onClick={() => {
            setCompleted(false);
            setCurrentQuestion(0);
            setScore(0);
            setSelectedOption(null);
            setShowResult(false);
          }}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Restart Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden my-4 shadow-lg">
      <div className="bg-gray-800 px-6 py-3 border-b border-gray-700 flex justify-between items-center">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">INTERACTIVE QUIZ</span>
        <span className="text-xs text-gray-500">Question {currentQuestion + 1} / {data.questions.length}</span>
      </div>
      
      <div className="p-6">
        <h4 className="text-base sm:text-lg font-medium text-white mb-6">
          {renderLatexInText(question.question)}
        </h4>
        
        <div className="space-y-3">
          {question.options.map((opt, idx) => {
            let btnClass = "w-full text-left p-3 rounded-lg border transition-all text-sm ";
            if (showResult) {
              if (idx === question.correctAnswer) btnClass += "bg-green-900/30 border-green-500 text-green-200";
              else if (idx === selectedOption) btnClass += "bg-red-900/30 border-red-500 text-red-200";
              else btnClass += "bg-gray-800 border-gray-700 text-gray-500 opacity-50";
            } else {
              btnClass += "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-500 text-gray-200";
            }

            return (
              <button 
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={showResult}
                className={btnClass}
              >
                <span className="inline-block w-6 font-bold opacity-50">{String.fromCharCode(65 + idx)}.</span>
                <span>{renderLatexInText(opt)}</span>
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className={`mt-6 p-4 rounded-lg border ${isCorrect ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
            <p className={`text-sm font-bold mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </p>
            <div className="text-sm text-gray-300">
              {renderLatexInText(question.explanation)}
            </div>
            <button 
              onClick={handleNext}
              className="mt-4 float-right text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors font-medium"
            >
              {currentQuestion < data.questions.length - 1 ? 'Next Question' : 'Finish'} →
            </button>
            <div className="clear-both"></div>
          </div>
        )}
      </div>
    </div>
  );
};
