import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simulate login - in production, this would call an API
    setTimeout(() => {
      if (email && password) {
        localStorage.setItem('authenticated', 'true');
        localStorage.setItem('user', JSON.stringify({ email, name: 'Traffic Officer' }));
        navigate('/command-center');
      } else {
        setError('Please enter email and password');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #faf5ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      
      <div style={{
        position: 'absolute', top: '15%', left: '20%', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '15%', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', pointerEvents: 'none'
      }} />

      <div style={{
        width: 420, background: '#ffffff', borderRadius: 20,
        border: '1px solid #e2e8f0',
        boxShadow: '0 16px 48px rgba(15,23,74,0.1)',
        padding: '40px 32px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
            marginBottom: 16,
          }}>
            <Shield size={32} color="white" />
          </div>
          <div style={{
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 800,
            color: '#0f172a', marginBottom: 4,
          }}>
            SafeVision AI
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Traffic Intelligence Platform</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@traffic.gov"
                style={{
                  width: '100%', paddingLeft: 40, paddingRight: 12, paddingTop: 12, paddingBottom: 12,
                  background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', paddingLeft: 40, paddingRight: 40, paddingTop: 12, paddingBottom: 12,
                  background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: 12, background: '#fef2f2', borderRadius: 8, marginBottom: 20,
              border: '1px solid #fecaca', fontSize: 13, color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 14, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)', e.target.style.boxShadow = '0 8px 24px rgba(79,70,229,0.3)')}
            onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = 'none')}
          >
            {loading ? 'Signing in...' : (
              <>
                Sign In <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            Demo: Use any email and password
          </div>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            ← Back to Landing
          </button>
        </div>
      </div>
    </div>
  );
}
