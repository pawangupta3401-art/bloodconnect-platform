import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Send, 
  Search, 
  Sliders, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';

export default function DesignSystemShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState('standard');
  const [inputText, setInputText] = useState('');
  const [inputError, setInputError] = useState('');

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    if (val.length > 0 && val.length < 3) {
      setInputError('Must be at least 3 characters');
    } else {
      setInputError('');
    }
  };

  const sampleTableData = [
    { id: 1, name: 'AI Matching Engine V2', category: 'Core Service', status: 'success', statusLabel: 'Operational', latency: '42ms' },
    { id: 2, name: 'Nagpur Central Blood Bank', category: 'Hub Center', status: 'info', statusLabel: 'Active', latency: '110ms' },
    { id: 3, name: 'Cold Chain Transit #NGP-88', category: 'Logistics', status: 'warning', statusLabel: 'Pending Inspection', latency: '240ms' },
    { id: 4, name: 'O- Negative Emergency Reserve', category: 'Critical Stock', status: 'error', statusLabel: 'Depleted (<5 units)', latency: '5ms' },
  ];

  const tableColumns = [
    { key: 'name', header: 'Resource / Unit Name', cellStyle: { fontWeight: 600, color: 'var(--ds-charcoal)' } },
    { key: 'category', header: 'Category' },
    { 
      key: 'status', 
      header: 'System Status', 
      render: (val, row) => (
        <Badge status={val}>
          {row.statusLabel}
        </Badge>
      )
    },
    { key: 'latency', header: 'Telemetry' },
    {
      key: 'actions',
      header: 'Action',
      render: () => (
        <Button variant="ghost" style={{ height: '32px', padding: '4px 10px', fontSize: '13px' }}>
          Details <ChevronRight size={14} />
        </Button>
      )
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--ds-light-gray)', color: 'var(--ds-dark-gray)', fontFamily: 'var(--ds-font-primary)' }}>
      {/* 6.4 Top Navbar (Height 64px, Primary Blue #1A3A5C) */}
      <header
        style={{
          height: 'var(--ds-navbar-height)',
          backgroundColor: 'var(--ds-primary)',
          color: 'var(--ds-white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: 'var(--ds-shadow-1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
            <Layers size={22} color="var(--ds-accent-teal)" />
            <span>Design System Specification</span>
          </div>
          <span style={{ fontSize: '0.8rem', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px' }}>
            WCAG AA • 8px Grid
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="#colors" style={{ color: 'var(--ds-white)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Colors</a>
          <a href="#typography" style={{ color: 'var(--ds-white)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Typography</a>
          <a href="#components" style={{ color: 'var(--ds-white)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Components</a>
          <a href="#spacing" style={{ color: 'var(--ds-white)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Spacing & Elevation</a>
          <Link to="/" style={{ color: 'var(--ds-accent-teal)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Back to App <ExternalLink size={14} />
          </Link>
        </nav>
      </header>

      {/* Main Container (max-width 1280px) */}
      <main style={{ maxWidth: 'var(--ds-container-max)', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Hero Section */}
        <section style={{ backgroundColor: 'var(--ds-white)', padding: '36px', borderRadius: '8px', border: '1px solid var(--ds-border-gray)', boxShadow: 'var(--ds-shadow-1)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(14, 124, 123, 0.1)', color: 'var(--ds-accent-teal)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px' }}>
            <Sparkles size={16} /> Official UI Architecture & Tokens
          </div>
          <h1 style={{ font: 'var(--ds-text-h1)', color: 'var(--ds-charcoal)', marginBottom: '12px' }}>
            BloodConnect Corporate Design System
          </h1>
          <p style={{ font: 'var(--ds-text-body)', color: 'var(--ds-slate-gray)', maxWidth: '800px', lineHeight: 1.6 }}>
            Yeh design system web application ke sabhi visual components, color palettes, 8px spatial grid, aur WCAG AA accessibility metrics ko standardise karta hai taaki corporate feel aur predictable consistency bani rahe.
          </p>
        </section>

        {/* 2. Color Palette Section */}
        <section id="colors" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h2 style={{ font: 'var(--ds-text-h2)', color: 'var(--ds-charcoal)' }}>2. Color Palette</h2>
            <p style={{ font: 'var(--ds-text-body-sm)', color: 'var(--ds-slate-gray)' }}>
              Primary brand blues, secondary accents, neutral background/text tones, aur semantic states.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { name: 'Primary Blue', hex: '#1A3A5C', bg: '#1A3A5C', text: '#fff', role: 'Headers, primary buttons, brand' },
              { name: 'Primary Blue (Light)', hex: '#2C5B8C', bg: '#2C5B8C', text: '#fff', role: 'Hover states, links' },
              { name: 'Primary Blue (Dark)', hex: '#0F2540', bg: '#0F2540', text: '#fff', role: 'Active states, footer' },
              { name: 'Accent Teal', hex: '#0E7C7B', bg: '#0E7C7B', text: '#fff', role: 'CTAs, highlights, success' },
              { name: 'Slate Gray', hex: '#4A5568', bg: '#4A5568', text: '#fff', role: 'Secondary text, icons' },
              { name: 'Dark Gray', hex: '#2D3748', bg: '#2D3748', text: '#fff', role: 'Standard body copy' },
              { name: 'Charcoal', hex: '#1A202C', bg: '#1A202C', text: '#fff', role: 'High-contrast headings' },
              { name: 'Border Gray', hex: '#E2E8F0', bg: '#E2E8F0', text: '#1A202C', role: 'Dividers, input borders' },
              { name: 'Success', hex: '#2F855A', bg: '#2F855A', text: '#fff', role: 'Success messages & verified' },
              { name: 'Warning', hex: '#C05621', bg: '#C05621', text: '#fff', role: 'Warning notices & alerts' },
              { name: 'Error', hex: '#C53030', bg: '#C53030', text: '#fff', role: 'Error states & critical alerts' },
              { name: 'Info', hex: '#2B6CB0', bg: '#2B6CB0', text: '#fff', role: 'Informational callouts' },
            ].map((col) => (
              <div
                key={col.name}
                style={{
                  backgroundColor: 'var(--ds-white)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--ds-border-gray)',
                  boxShadow: 'var(--ds-shadow-1)',
                }}
              >
                <div style={{ height: '70px', backgroundColor: col.bg, display: 'flex', alignItems: 'flex-end', padding: '8px 12px', color: col.text }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>{col.hex}</span>
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ds-charcoal)' }}>{col.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ds-slate-gray)', marginTop: '4px' }}>{col.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Typography Section */}
        <section id="typography" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h2 style={{ font: 'var(--ds-text-h2)', color: 'var(--ds-charcoal)' }}>3. Typography Scale</h2>
            <p style={{ font: 'var(--ds-text-body-sm)', color: 'var(--ds-slate-gray)' }}>
              Primary sans-serif font stack (Inter / Roboto / Segoe UI) with standard type hierarchy.
            </p>
          </div>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--ds-border-gray)', paddingBottom: '12px' }}>
                <h1 style={{ font: 'var(--ds-text-h1)', color: 'var(--ds-charcoal)', margin: 0 }}>Heading 1 (H1) — 32px / 2.0rem (Bold 700)</h1>
                <span style={{ fontSize: '0.8rem', color: 'var(--ds-slate-gray)' }}>Line-height: 1.2</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--ds-border-gray)', paddingBottom: '12px' }}>
                <h2 style={{ font: 'var(--ds-text-h2)', color: 'var(--ds-charcoal)', margin: 0 }}>Heading 2 (H2) — 24px / 1.5rem (Bold 700)</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--ds-slate-gray)' }}>Line-height: 1.3</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--ds-border-gray)', paddingBottom: '12px' }}>
                <h3 style={{ font: 'var(--ds-text-h3)', color: 'var(--ds-charcoal)', margin: 0 }}>Heading 3 (H3) — 20px / 1.25rem (Semibold 600)</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--ds-slate-gray)' }}>Line-height: 1.4</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--ds-border-gray)', paddingBottom: '12px' }}>
                <h4 style={{ font: 'var(--ds-text-h4)', color: 'var(--ds-charcoal)', margin: 0 }}>Heading 4 (H4) — 16px / 1.0rem (Semibold 600)</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--ds-slate-gray)' }}>Line-height: 1.4</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--ds-border-gray)', paddingBottom: '12px' }}>
                <p style={{ font: 'var(--ds-text-body)', color: 'var(--ds-dark-gray)', margin: 0 }}>Body Text — 16px / 1.0rem (Regular 400, Line-height 1.6)</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--ds-slate-gray)' }}>Default paragraphs</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--ds-border-gray)', paddingBottom: '12px' }}>
                <p style={{ font: 'var(--ds-text-body-sm)', color: 'var(--ds-dark-gray)', margin: 0 }}>Body Small — 14px / 0.875rem (Regular 400, Line-height 1.5)</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--ds-slate-gray)' }}>Inputs & tables</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <p style={{ font: 'var(--ds-text-caption)', color: 'var(--ds-slate-gray)', margin: 0 }}>Caption — 12px / 0.75rem (Regular 400, Line-height 1.4)</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--ds-slate-gray)' }}>Helper text & tags</span>
              </div>
            </div>
          </Card>
        </section>

        {/* 6. Core Components Section */}
        <section id="components" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ font: 'var(--ds-text-h2)', color: 'var(--ds-charcoal)' }}>6. Core UI Components</h2>
            <p style={{ font: 'var(--ds-text-body-sm)', color: 'var(--ds-slate-gray)' }}>
              Interactive showcase for Buttons, Input Fields, Cards, Data Tables, and Modals.
            </p>
          </div>

          {/* 6.1 Buttons Showcase */}
          <Card title="6.1 Buttons" subtitle="Height: 40px | Border-radius: 6px | Font: 14px Semibold">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <Button variant="primary" icon={Send}>
                Primary Button
              </Button>

              <Button variant="secondary" icon={Search}>
                Secondary Button
              </Button>

              <Button variant="ghost" icon={Sliders}>
                Tertiary / Ghost
              </Button>

              <Button disabled variant="disabled">
                Disabled Button
              </Button>
            </div>
          </Card>

          {/* 6.2 Input Fields Showcase */}
          <Card title="6.2 Input Fields" subtitle="Border: 1px solid #E2E8F0 | Radius: 6px | Focus: #2C5B8C | Error: #C53030">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <Input
                label="Standard Input"
                placeholder="Enter hospital or donor name..."
                helperText="Standard resting state with 1px border"
              />

              <Input
                label="Interactive Validation Input"
                placeholder="Type < 3 characters to trigger error"
                value={inputText}
                onChange={handleInputChange}
                error={inputError}
                helperText={!inputError ? "Dynamic validation active" : undefined}
              />

              <Input
                label="Disabled Field"
                value="Locked Telemetry Channel"
                disabled
                style={{ backgroundColor: 'var(--ds-light-gray)', cursor: 'not-allowed' }}
              />
            </div>
          </Card>

          {/* 6.5 Data Tables Showcase */}
          <Card title="6.5 Data Table" subtitle="Header #F5F7FA | Row border #E2E8F0 | High legibility">
            <Table columns={tableColumns} data={sampleTableData} />
          </Card>

          {/* 6.6 Modals / Dialogs Showcase */}
          <Card title="6.6 Modals & Dialogs" subtitle="Overlay: rgba(0,0,0,0.5) | Radius: 8px | Elevation Level 3">
            <div style={{ display: 'flex', gap: '16px' }}>
              <Button
                variant="primary"
                onClick={() => {
                  setModalSize('standard');
                  setModalOpen(true);
                }}
              >
                Open Standard Modal (480px)
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setModalSize('large');
                  setModalOpen(true);
                }}
              >
                Open Large Modal (720px)
              </Button>
            </div>
          </Card>
        </section>

        {/* 4 & 8. Spacing, Elevation & Accessibility */}
        <section id="spacing" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <Card title="4. Spacing System (8px Grid)" subtitle="Strict spatial tokens for consistent rhythms">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { token: 'xs', val: '4px', desc: 'Tight icon gaps' },
                { token: 'sm', val: '8px', desc: 'Input padding, badge gap' },
                { token: 'md', val: '16px', desc: 'Default component spacing' },
                { token: 'lg', val: '24px', desc: 'Section spacing & card padding' },
                { token: 'xl', val: '32px', desc: 'Large section gutters' },
                { token: '2xl', val: '48px', desc: 'Page level breaks' },
                { token: '3xl', val: '64px', desc: 'Hero headers' },
              ].map((s) => (
                <div key={s.token} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ds-border-gray)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <code style={{ fontWeight: 700, color: 'var(--ds-primary)' }}>--ds-space-{s.token}</code>
                    <span style={{ fontSize: '0.85rem', color: 'var(--ds-slate-gray)' }}>({s.desc})</span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.val}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="8. Elevation & 9. Accessibility" subtitle="WCAG AA 4.5:1 Contrast & Elevation Shadows">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--ds-white)', boxShadow: 'var(--ds-shadow-1)', borderRadius: '6px', border: '1px solid var(--ds-border-gray)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ds-charcoal)' }}>Level 1 Elevation</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ds-slate-gray)' }}>0 1px 2px rgba(0,0,0,0.05) — Used for Cards & Inputs</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--ds-white)', boxShadow: 'var(--ds-shadow-2)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ds-charcoal)' }}>Level 2 Elevation</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ds-slate-gray)' }}>0 4px 6px rgba(0,0,0,0.1) — Used for Dropdowns & Hover</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--ds-white)', boxShadow: 'var(--ds-shadow-3)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ds-charcoal)' }}>Level 3 Elevation</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ds-slate-gray)' }}>0 10px 15px rgba(0,0,0,0.1) — Used for Modals & Dialogs</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'rgba(47, 133, 90, 0.1)', color: 'var(--ds-success)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                <ShieldCheck size={18} />
                <span>WCAG AA 4.5:1 contrast compliance verified across all typography pairs</span>
              </div>
            </div>
          </Card>
        </section>

      </main>

      {/* Modal Demonstration */}
      <Modal
        isOpen={modalOpen}
        size={modalSize}
        onClose={() => setModalOpen(false)}
        title={modalSize === 'large' ? 'Large Modal Dialog (720px)' : 'Standard Modal Dialog (480px)'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Confirm Action
            </Button>
          </>
        }
      >
        <p style={{ margin: '0 0 16px', lineHeight: 1.6 }}>
          Yeh modal design system ke specs (8px border radius, rgba(0,0,0,0.5) overlay, Level 3 elevation shadow) ko accurately render karta hai.
        </p>
        <Input label="Verification Note" placeholder="Add optional dispatch comments..." />
      </Modal>
    </div>
  );
}
