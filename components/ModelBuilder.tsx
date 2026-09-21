import React, { useState } from 'react';
import { VirtualModel } from '../types';
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { generatePersona, ai } from '../services/geminiService';

interface ModelBuilderProps {
  onSave: (model: VirtualModel) => void;
  onCancel: () => void;
  existingModels: VirtualModel[];
}

export const ModelBuilder: React.FC<ModelBuilderProps> = ({ onSave, onCancel, existingModels }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [baseModel, setBaseModel] = useState('gemini-3.8-flash');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [safetyLevel, setSafetyLevel] = useState<'standard' | 'relaxed' | 'strict'>('standard');
  
  // Auto-generation state
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSynthesizingKnowledge, setIsSynthesizingKnowledge] = useState(false);

  const handleAutoGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const persona = await generatePersona(prompt);
      if (persona) {
        setName(persona.name || '');
        setDescription(persona.description || '');
        setSystemInstruction(persona.systemInstruction || '');
        setKnowledgeBase(persona.knowledgeBase || '');
      }
    } catch (error) {
      console.error("Failed to generate persona", error);
      alert("Failed to generate persona. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSynthesizeKnowledge = async () => {
    if (!name && !description && !systemInstruction) return;
    setIsSynthesizingKnowledge(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an expert AI architect. Generate a rich, structured, domain-specific knowledge base for this virtual model:
Name: ${name}
Role/Description: ${description}
Core Directives: ${systemInstruction}

Provide clean factual points, domain facts, specialized terminology, internal memory facts, and behavioral guidelines formatted as clean markdown bullet points.`
      });
      const generated = response.text;
      if (generated) {
        setKnowledgeBase(prev => prev ? `${prev}\n\n${generated}` : generated);
      }
    } catch (err) {
      console.error("Failed to synthesize knowledge", err);
    } finally {
      setIsSynthesizingKnowledge(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let safetySettings;
    if (safetyLevel === 'relaxed') {
      // Simulating "Uncensored" by blocking NOTHING
      safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ];
    } else if (safetyLevel === 'strict') {
      safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
      ];
    } else {
      // Standard
      safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ];
    }

    const newModel: VirtualModel = {
      id: `custom-${Date.now()}`,
      name,
      description,
      baseModel,
      systemInstruction,
      knowledgeBase,
      safetySettings
    };

    onSave(newModel);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-900 p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* AI Generator Card */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50 flex justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    AI Architect
                </h2>
                <p className="text-xs text-gray-400">Auto-generate a virtual model from a simple description.</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
          </div>
          <div className="p-6">
             <div className="flex space-x-4">
                 <input 
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAutoGenerate()}
                    placeholder="e.g., A sarcastic robot from the year 3000 who loves cooking..."
                    className="flex-1 bg-black/30 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-sm"
                 />
                 <button 
                    onClick={handleAutoGenerate}
                    disabled={isGenerating || !prompt}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                 >
                    {isGenerating ? (
                        <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Building...
                        </>
                    ) : 'Generate'}
                 </button>
             </div>
          </div>
        </div>

        <div className="bg-gray-850 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
          
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900">
            <h2 className="text-xl font-bold text-white">Manual Configuration</h2>
            <p className="text-gray-400 text-sm mt-1">Fine-tune the details of your agent.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Identity Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800 pb-2">Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Model Name</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. Chaos Theory v1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Base Architecture</label>
                  <select 
                    value={baseModel}
                    onChange={(e) => setBaseModel(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (Fast, Multimodal & Versatile)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Complex Reasoning & Depth)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <input 
                  type="text" 
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  placeholder="Short description of capability"
                />
              </div>
            </div>

            {/* Core Logic Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800 pb-2">Behavior</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  System Instructions
                  <span className="text-gray-500 ml-2 text-xs">(The "Brain")</span>
                </label>
                <textarea 
                  rows={6}
                  required
                  value={systemInstruction}
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none font-mono text-sm transition-all"
                  placeholder="You are an expert in..."
                />
              </div>
            </div>

            {/* Knowledge Base Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Knowledge Base</h3>
                <button
                  type="button"
                  onClick={handleSynthesizeKnowledge}
                  disabled={isSynthesizingKnowledge || (!name && !description && !systemInstruction)}
                  className="text-xs bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {isSynthesizingKnowledge ? 'Synthesizing Knowledge...' : 'AI Synthesize Knowledge'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Knowledge Injection & Memory
                  <span className="text-gray-500 ml-2 text-xs">(Context/Lore/Data learned by model)</span>
                </label>
                <textarea 
                  rows={5}
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none font-mono text-sm transition-all"
                  placeholder="Domain knowledge, internal memory, facts or custom training lore..."
                />
              </div>
            </div>

            {/* Safety Controls */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider border-b border-gray-800 pb-2">Safety Protocols</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Filter Level</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setSafetyLevel('strict')}
                    className={`px-4 py-3 rounded-lg border text-center transition-all ${safetyLevel === 'strict' ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
                  >
                    <div className="font-bold">Strict</div>
                    <div className="text-xs mt-1 opacity-75">Safe</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafetyLevel('standard')}
                    className={`px-4 py-3 rounded-lg border text-center transition-all ${safetyLevel === 'standard' ? 'border-blue-500 bg-blue-900/20 text-blue-400' : 'border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
                  >
                    <div className="font-bold">Standard</div>
                    <div className="text-xs mt-1 opacity-75">Balanced</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafetyLevel('relaxed')}
                    className={`px-4 py-3 rounded-lg border text-center transition-all ${safetyLevel === 'relaxed' ? 'border-red-500 bg-red-900/20 text-red-400' : 'border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
                  >
                    <div className="font-bold">Unfiltered</div>
                    <div className="text-xs mt-1 opacity-75">Uncensored</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 transition-all"
              >
                Deploy Model
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};