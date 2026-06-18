import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Camera, Zap, BarChart3, Lock, ArrowRight, CheckCircle, Cpu, Eye, FileText, AlertTriangle } from 'lucide-react';

const FEATURES = [
  {
    icon: Camera,
    title: 'AI-Powered Detection',
    description: 'YOLOv11-based real-time vehicle and traffic signal detection with 99.2% accuracy',
    color: '#4f46e5',
  },
  {
    icon: Zap,
    title: 'Instant Violation Verification',
    description: 'Hierarchical violation detection for red-light, helmet, seatbelt, and more',
    color: '#7c3aed',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Comprehensive dashboards with trends, heatmaps, and predictive insights',
    color: '#059669',
  },
  {
    icon: Lock,
    title: 'Evidence Generation',
    description: 'SHA-256 sealed evidence packages with legal documentation for court proceedings',
    color: '#dc2626',
  },
];

const MODULES = [
  { id: 1, name: 'Quality Enhancement', icon: Cpu, desc: 'Adaptive image enhancement using CLAHE, gamma correction' },
  { id: 2, name: 'Object Detection', icon: Eye, desc: 'YOLOv11 + ByteTrack tracking with scene graphs' },
  { id: 3, name: 'Violation Verification', icon: AlertTriangle, desc: 'Hierarchical rule-based violation confirmation' },
  { id: 4, name: 'License Plate Recognition', icon: FileText, desc: 'Multi-frame OCR fusion with trust scoring' },
  { id: 5, name: 'Evidence Generation', icon: Lock, desc: 'Annotated evidence with integrity verification' },
  { id: 6, name: 'Analytics Dashboard', icon: BarChart3, desc: 'Trends, patterns, and enforcement insights' },
  { id: 7, name: 'Performance Evaluation', icon: Zap, desc: 'System metrics and scalability analysis' },
  { id: 8, name: 'Predictive Intelligence', icon: Camera, desc: '7-day violation forecasting and risk zones' },
];

const STATS = [
  { label: 'Cameras Connected', value: '48+' },
  { label: 'Violations Detected', value: '12,450+' },
  { label: 'Accuracy Rate', value: '99.2%' },
  { label: 'Processing Speed', value: '<200ms' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Hero Section */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
        padding: '80px 24px 120px',
        overflow: 'hidden',
      }}>
        <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.1 }} />
        
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(100px)' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, background: 'rgba(255,255,255,0.2)', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={24} color="white" />
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>SafeVision AI</span>
            </div>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '10px 24px', background: 'rgba(255,255,255,0.15)', color: 'white',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', backdropFilter: 'blur(10px)',
              }}
            >
              Sign In
            </button>
          </div>

          <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
            <div style={{
              display: 'inline-block', padding: '8px 20px', background: 'rgba(255,255,255,0.15)',
              borderRadius: 20, fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 24,
              backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)',
            }}>
              🚀 Next-Gen Traffic Enforcement Platform
            </div>
            <h1 style={{
              fontFamily: "'Space Grotesk',sans-serif", fontSize: 56, fontWeight: 800,
              color: 'white', marginBottom: 24, lineHeight: 1.1,
            }}>
              Context-Aware Traffic<br />
              Violation Intelligence
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', marginBottom: 40, lineHeight: 1.6 }}>
              AI-powered detection, verification, and evidence generation for smart city traffic enforcement.
              Real-time processing with 99.2% accuracy.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '14px 32px', background: 'white', color: '#4f46e5',
                  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}
              >
                Get Started <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/pipeline')}
                style={{
                  padding: '14px 32px', background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', backdropFilter: 'blur(10px)',
                }}
              >
                Try Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{ maxWidth: 1200, margin: '-60px auto 80px', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          background: 'white', borderRadius: 16, padding: 32,
          boxShadow: '0 16px 48px rgba(15,23,74,0.1)',
        }}>
          {STATS.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#4f46e5', marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div style={{ maxWidth: 1200, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
            Powerful Features
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 600, margin: '0 auto' }}>
            End-to-end traffic violation detection and enforcement with cutting-edge AI technology
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} style={{
                background: 'white', borderRadius: 16, padding: 32,
                boxShadow: '0 8px 32px rgba(15,23,74,0.08)', border: '1px solid #e2e8f0',
                transition: 'transform 0.3s, box-shadow 0.3s',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12, background: feature.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <Icon size={28} color={feature.color} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{feature.title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modules Section */}
      <div style={{ maxWidth: 1200, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
            8-Module Processing Pipeline
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 600, margin: '0 auto' }}>
            Comprehensive traffic intelligence pipeline from image capture to predictive analytics
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {MODULES.map((module, i) => {
            const Icon = module.icon;
            return (
              <div key={i} style={{
                background: 'white', borderRadius: 12, padding: 24,
                boxShadow: '0 4px 16px rgba(15,23,74,0.06)', border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: '#4f46e5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16',
                }}>
                  <Icon size={20} color="white" />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 4 }}>Module {module.id}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>{module.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{module.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 36, fontWeight: 800,
            color: 'white', marginBottom: 16,
          }}>
            Ready to Transform Traffic Enforcement?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 32 }}>
            Join smart cities worldwide using SafeVision AI for intelligent traffic management
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '16px 40px', background: 'white', color: '#4f46e5',
              border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            Start Free Trial <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0f172a', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={20} color="#4f46e5" />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>SafeVision AI</span>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
          Context-Aware Traffic Violation Intelligence Platform
        </p>
        <p style={{ fontSize: 12, color: '#475569' }}>
          © 2024 SafeVision AI. Educational / demonstration project for smart city traffic enforcement.
        </p>
      </div>
    </div>
  );
}
