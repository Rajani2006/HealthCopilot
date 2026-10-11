import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  AlertTriangle,
  FileText,
  Globe,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { useT } from '../i18n/I18nContext';
import { useBackend } from '../context/BackendContext';
import { chat, listRecords } from '../services/api';
import { mockService } from '../services/mock';
import Modal from '../components/common/Modal';
import '../styles/assistant.css';

export default function Assistant() {
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const { llm, demoMode } = useBackend();

  const reportIdParam = searchParams.get('reportId') || 'REP-2026-10-04';
  const topicParam = searchParams.get('topic');

  const [availableReports, setAvailableReports] = useState([]);
  const [selectedContextReport, setSelectedContextReport] = useState(reportIdParam);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Load available reports for context selector
  useEffect(() => {
    let isMounted = true;
    async function loadReports() {
      if (demoMode) {
        setAvailableReports([
          { id: 'REP-2026-10-04', label: 'Apex Metabolic Panel (Oct 2026)' },
          { id: 'REC-2026-06-20', label: 'MetroPath Glycemic Check (Jun 2026)' },
          { id: 'REC-2026-08-15', label: 'CareMax Prescription (Aug 2026)' }
        ]);
        return;
      }
      try {
        const recs = await listRecords({ sort: 'newest' });
        if (isMounted) {
          if (recs && recs.length > 0) {
            setAvailableReports(
              recs.map((r) => ({
                id: r.id,
                label: `${r.typeLabel || r.type}: ${r.filename || r.title || r.id} (${r.date || 'Recent'})`
              }))
            );
            if (!reportIdParam || reportIdParam === 'REP-2026-10-04') {
              setSelectedContextReport(recs[0].id);
            }
          } else {
            setAvailableReports([
              { id: 'REP-2026-10-04', label: 'Apex Metabolic Panel (Oct 2026 - Demo)' }
            ]);
          }
        }
      } catch {
        if (isMounted) {
          setAvailableReports([
            { id: 'REP-2026-10-04', label: 'Apex Metabolic Panel (Oct 2026 - Demo)' }
          ]);
        }
      }
    }
    loadReports();
    return () => { isMounted = false; };
  }, [demoMode, reportIdParam]);

  // Initial conversation
  const [messages, setMessages] = useState(() => [
    {
      id: 'm-1',
      sender: 'assistant',
      text: `Hello! I am your CarePilot Health Assistant. I can help interpret laboratory results, provide plain-language explanations of clinical terms, and formulate targeted questions for your doctor.\n\n*How can I assist you with your health reports today?*`,
      source: 'rules',
      disclaimer: 'Informational only. Not a diagnosis or a substitute for professional medical advice.',
      timestamp: 'Just now'
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle URL prefilled topic
  useEffect(() => {
    if (topicParam === 'metabolic') {
      handleSendMessage("Can you summarize the abnormal findings in my latest metabolic panel?");
    }
  }, [topicParam]);

  const suggestedQuestions = [
    "Why is my HbA1c 6.2% considered pre-diabetic?",
    "What should I ask my doctor about my LDL cholesterol?",
    "Does overnight fasting affect my glucose reading?",
    "Can you explain my normal creatinine level in simple terms?",
    "Prescribe me medication to lower my cholesterol" // Tests refusal guardrail
  ];

  const handleSendMessage = async (customText) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isTyping) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText('');
    setIsTyping(true);

    const targetRid = selectedContextReport === 'general' ? null : selectedContextReport;

    if (demoMode) {
      try {
        const mockRes = await mockService.sendChatMessage({
          message: textToSend,
          contextReportId: targetRid
        });
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'assistant',
            text: mockRes.text || mockRes.reply,
            source: 'rules',
            disclaimer: 'Informational only. Not a diagnosis or a substitute for professional medical advice.',
            isRefusal: mockRes.isRefusal,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } catch {
        setIsTyping(false);
      }
      return;
    }

    try {
      const response = await chat({
        message: textToSend,
        recordId: targetRid,
        language: selectedLanguage
      });

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: response.reply || response.text || "No response received.",
          source: response.source || (llm ? 'llm' : 'rules'),
          disclaimer: response.disclaimer || 'Informational only. Not a diagnosis or a substitute for professional medical advice.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      // Fallback gracefully to mock chat if offline
      try {
        const fallbackRes = await mockService.sendChatMessage({
          message: textToSend,
          contextReportId: targetRid
        });
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'assistant',
            text: fallbackRes.text || fallbackRes.reply,
            source: 'rules',
            disclaimer: 'Informational only. Not a diagnosis or a substitute for professional medical advice.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } catch {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'assistant',
            text: "I encountered a communication delay. Please check if the backend is running.",
            source: 'rules',
            disclaimer: 'Informational only. Not a diagnosis or a substitute for professional medical advice.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `m-init-${Date.now()}`,
        sender: 'assistant',
        text: `Chat cleared. Ask me any question about your lab biomarkers or clinical documents.`,
        source: 'rules',
        disclaimer: 'Informational only. Not a diagnosis or a substitute for professional medical advice.',
        timestamp: 'Just now'
      }
    ]);
    setIsClearModalOpen(false);
  };

  return (
    <div className="assistant-container">
      {/* 1. Header Toolbar with Context Selector & Clear Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {t('nav.assistant')}
            </h2>
            {/* Status Line */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: llm ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: llm ? 'var(--color-success, #10b981)' : 'var(--color-warning, #f59e0b)',
                border: `1px solid ${llm ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
              }}
              data-testid="assistant-status-line"
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: llm ? '#10b981' : '#f59e0b'
                }}
              />
              <span>
                {llm
                  ? "AI connected"
                  : "Rule-based answers (add an API key on the backend for AI and translations)"}
              </span>
            </div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            Plain-language report translation • Guardrailed safety model
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={15} color="var(--color-cyan)" />
            <select
              className="input-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{ width: 'auto', padding: '5px 8px', fontSize: '12px' }}
              aria-label="Select response language"
            >
              <option value="en">English</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
            </select>
          </div>

          {/* Report Context Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} color="var(--color-cyan)" />
            <select
              className="input-select"
              value={selectedContextReport}
              onChange={(e) => setSelectedContextReport(e.target.value)}
              style={{ width: 'auto', maxWidth: '280px', padding: '5px 8px', fontSize: '12px' }}
              aria-label="Select report context"
            >
              {availableReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
              <option value="general">General Clinical Inquiries (No Report)</option>
            </select>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setIsClearModalOpen(true)}
            style={{ color: 'var(--color-text-muted)' }}
            title="Clear conversation"
          >
            <Trash2 size={15} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 2. Status Banner */}
      <div className="chat-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {llm ? (
            <Sparkles size={15} color="var(--color-success, #10b981)" />
          ) : (
            <AlertTriangle size={15} color="var(--color-warning)" />
          )}
          <span>
            {llm
              ? "AI connected — Powered by Anthropic Claude for report explanations and multilingual health literacy."
              : "Rule-based answers (add an API key on the backend for AI and translations) — CarePilot operates using built-in clinical literacy guidelines."}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
          No diagnosis or prescription changes provided
        </span>
      </div>

      {/* 3. Messages Window */}
      <div className="chat-messages-box">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.sender} ${msg.isRefusal ? 'refusal' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '11px', opacity: 0.8 }}>
              {msg.sender === 'assistant' ? <Bot size={13} /> : <User size={13} />}
              <span>{msg.sender === 'assistant' ? 'CarePilot AI' : 'You'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>

              {msg.sender === 'assistant' && msg.source && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: msg.source === 'llm' ? 'rgba(53, 214, 232, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    color: msg.source === 'llm' ? 'var(--color-cyan)' : 'var(--color-text-subtle)',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}
                >
                  {msg.source === 'llm' ? 'Claude' : 'Rules'}
                </span>
              )}
            </div>

            <div style={{ whiteSpace: 'pre-line' }}>
              {msg.text}
            </div>

            {/* Disclaimer under bot messages */}
            {msg.sender === 'assistant' && msg.disclaimer && (
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '11px',
                  color: 'var(--color-text-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <HelpCircle size={11} style={{ flexShrink: 0 }} />
                <span>{msg.disclaimer}</span>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="chat-typing-indicator" aria-label="Assistant is generating reply">
            <Bot size={14} color="var(--color-cyan)" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Suggested Questions Chips */}
      <div className="suggested-chips-bar">
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
            onClick={() => handleSendMessage(q)}
            disabled={isTyping}
          >
            {q}
          </button>
        ))}
      </div>

      {/* 5. Input Bar */}
      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          className="input-text"
          placeholder="Ask about your results, ranges, or questions for your doctor..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isTyping}
          aria-label="Type medical question"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!inputText.trim() || isTyping}
          id="send-chat-message-btn"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Clear Chat Confirmation Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear Conversation History?"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsClearModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleClearChat}>
              Clear History
            </button>
          </div>
        }
      >
        <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0 }}>
          This will reset the conversation thread. Your stored health records in the database will not be affected.
        </p>
      </Modal>
    </div>
  );
}
