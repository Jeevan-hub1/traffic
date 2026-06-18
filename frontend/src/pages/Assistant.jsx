import React, { useState, useRef, useEffect } from 'react';
import { PageHeader, GlassCard } from '../components/shared/index.jsx';
import { MessageSquare, Send, User, Shield, AlertTriangle, MapPin, FileText, Loader } from 'lucide-react';
import { queryAssistant } from '../api/client';

const QuickQuery = ({ text, onClick }) => (
  <button onClick={() => onClick(text)}
    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '8px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontWeight: 500 }}
    onMouseOver={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#eef2ff'; }}
    onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#f8fafc'; }}>
    {text}
  </button>
);

export default function Assistant() {
  const [messages, setMessages] = useState([{ id: 1, sender: 'ai', type: 'info', content: 'Hello Officer. SafeVision AI Assistant is online. How can I help you analyze the traffic intelligence today?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (text) => {
    const q = text || input;
    if (!q.trim()) return;
    setInput('');
    const newMsgs = [...messages, { id: Date.now(), sender: 'user', content: q }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await queryAssistant(q);
      setTimeout(() => {
        setMessages([...newMsgs, { id: Date.now() + 1, sender: 'ai', ...res }]);
        setLoading(false);
      }, 600 + Math.random() * 800);
    } catch (e) {
      setTimeout(() => {
        setMessages([...newMsgs, { id: Date.now() + 1, sender: 'ai', type: 'info', message: 'I cannot connect to the intelligence backend right now. Is the server running?' }]);
        setLoading(false);
      }, 500);
    }
  };

  const renderAiMessage = (m) => {
    switch (m.type) {
      case 'table':
        return (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,74,0.05)' }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              <AlertTriangle size={14} color="#ea580c" /> {m.title}
            </div>
            <div>
              {m.data.map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < m.data.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span className="font-plate" style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>{row.plate}</span>
                  <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>{row.violations} violations</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'card':
        return (
          <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: 12, padding: 16, borderLeft: '4px solid #dc2626', boxShadow: '0 4px 12px rgba(15,23,74,0.05)' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{m.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MapPin size={18} color="#dc2626" />
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{m.name}</span>
            </div>
            <div style={{ fontSize: 13, color: '#475569' }}>Current Threat Score: <strong style={{ color: '#dc2626' }}>{m.threat_score}/100</strong></div>
          </div>
        );
      case 'report':
        return (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, borderLeft: '4px solid #4f46e5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FileText size={16} color="#4f46e5" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{m.title}</span>
            </div>
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{m.summary}</div>
          </div>
        );
      case 'info':
      default:
        return <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>{m.message}</div>;
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="AI Traffic Officer Assistant" subtitle="Natural language query interface for the SafeVision intelligence backend" />

      <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0 }}>
        {/* Chat Area */}
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 16, flexDirection: m.sender === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.sender === 'ai' ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: m.sender === 'ai' ? '0 4px 12px rgba(79,70,229,0.3)' : 'none' }}>
                  {m.sender === 'ai' ? <Shield size={18} color="white" /> : <User size={18} color="#64748b" />}
                </div>
                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.sender === 'user' ? (
                    <div style={{ background: '#4f46e5', color: 'white', padding: '12px 18px', borderRadius: '18px 18px 4px 18px', fontSize: 14, lineHeight: 1.5, boxShadow: '0 4px 12px rgba(79,70,229,0.2)' }}>
                      {m.content}
                    </div>
                  ) : renderAiMessage(m)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}>
                  <Shield size={18} color="white" />
                </div>
                <div style={{ background: '#f8fafc', padding: '14px 20px', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 6, alignItems: 'center', border: '1px solid #e2e8f0' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a5b4fc', animation: 'pulse 1s infinite' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: 'pulse 1s infinite 0.2s' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1s infinite 0.4s' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: 20, borderTop: '1px solid #e8edf5', background: '#f8fafc' }}>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
              <QuickQuery text="Show top repeat offenders" onClick={handleSend} />
              <QuickQuery text="Which junction is most dangerous?" onClick={handleSend} />
              <QuickQuery text="Generate weekly report" onClick={handleSend} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about violations, offenders, or system status..."
                style={{ flex: 1, padding: '14px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, color: '#0f172a', fontSize: 14, outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(15,23,74,0.02)' }}
                onFocus={e => { e.target.style.borderColor = '#a5b4fc'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(15,23,74,0.02)'; }}
              />
              <button className="btn-primary" onClick={() => handleSend()} disabled={!input.trim() || loading} style={{ width: 52, height: 52, borderRadius: 14, justifyContent: 'center', padding: 0 }}>
                {loading ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Assistant Capabilities</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Offender Profiling', desc: 'Identify repeat offenders across all cameras' },
                { label: 'Threat Assessment', desc: 'Query risk scores for any junction' },
                { label: 'Reporting', desc: 'Generate daily, weekly, or custom reports' },
                { label: 'System Diagnostics', desc: 'Check health of ML models and API' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5', marginTop: 6 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 20, border: '1px solid #a7f3d0', background: '#ecfdf5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', animation: 'pulse 2s infinite' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>System Active</div>
            </div>
            <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.5 }}>
              The Assistant is connected to the live intelligence database and can execute queries in real-time.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
