import React, { useState } from 'react';
import './PlansPage.css';
import AdminHeader from '../AdminHeader';

/* ─── SVG icon components ─────────────────────────────── */
const IconCloud = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <circle cx="26" cy="26" r="26" fill="#eef4ff" />
    <path d="M36 28c0-5.523-4.477-10-10-10S16 22.477 16 28c-2.761 0-5 2.239-5 5s2.239 5 5 5h20c2.761 0 5-2.239 5-5s-2.239-5-5-5z" fill="#c7dcff" stroke="#5b9bf8" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M22 28l4-5 4 5" stroke="#5b9bf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="26" y1="23" x2="26" y2="31" stroke="#5b9bf8" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <circle cx="26" cy="26" r="26" fill="#eff6ff" />
    <rect x="14" y="20" width="24" height="18" rx="1.5" fill="#bfdbfe" stroke="#2563eb" strokeWidth="1.6"/>
    <rect x="19" y="13" width="14" height="9" rx="1.5" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6"/>
    <rect x="18" y="26" width="5" height="5" rx="1" fill="#2563eb"/>
    <rect x="29" y="26" width="5" height="5" rx="1" fill="#2563eb"/>
    <rect x="22" y="30" width="8" height="8" rx="1" fill="#2563eb"/>
  </svg>
);

const IconEnterprise = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <circle cx="26" cy="26" r="26" fill="#fffbeb" />
    <rect x="10" y="22" width="14" height="16" rx="1.5" fill="#fde68a" stroke="#d97706" strokeWidth="1.6"/>
    <rect x="28" y="22" width="14" height="16" rx="1.5" fill="#fde68a" stroke="#d97706" strokeWidth="1.6"/>
    <rect x="17" y="15" width="18" height="23" rx="1.5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.6"/>
    <rect x="13" y="27" width="4" height="4" rx="0.5" fill="#d97706"/>
    <rect x="35" y="27" width="4" height="4" rx="0.5" fill="#d97706"/>
    <rect x="21" y="22" width="4" height="4" rx="0.5" fill="#d97706"/>
    <rect x="27" y="22" width="4" height="4" rx="0.5" fill="#d97706"/>
    <rect x="23" y="30" width="6" height="8" rx="1" fill="#d97706"/>
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="9" fill="#5b9bf8" fillOpacity="0.12"/>
    <path d="M5.5 9l2.5 2.5 4.5-5" stroke="#5b9bf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="9" fill="#e5e7eb"/>
    <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2L3 5v5c0 4.418 3.017 8.546 7 9.5C14.983 18.546 18 14.418 18 10V5l-7-3z" fill="#dbeafe" stroke="#5b9bf8" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M7 10l2 2 4-4" stroke="#5b9bf8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
/* ────────────────────────────────────────────────────── */

const PLANS = [
  {
    id: 'gratuito',
    name: 'Gratuito',
    Icon: IconCloud,
    priceLabel: 'R$ 00,00',
    period: '/mês',
    features: [
      { text: 'Até 2 usuários no domínio', included: true },
      { text: 'Até 3 dispositivos', included: true },
      { text: 'Criação de Widgets', included: true },
      { text: 'Tabela de Excedências', included: false },
      { text: 'Notificações via Telegram', included: false }
    ]
  },
  {
    id: 'comercial',
    name: 'Comercial',
    Icon: IconBuilding,
    priceLabel: 'R$ 35,00',
    period: '/mês',
    features: [
      { text: 'Até 5 usuários no domínio', included: true },
      { text: 'Até 10 dispositivos', included: true },
      { text: 'Criação de Widgets', included: true },
      { text: 'Tabela de Excedências', included: true },
      { text: 'Notificações via Telegram', included: false }
    ]
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    Icon: IconEnterprise,
    priceLabel: 'R$ 75,00',
    period: '/mês',
    features: [
      { text: 'Até 25 usuários no domínio', included: true },
      { text: 'Até 50 dispositivos', included: true },
      { text: 'Criação de Widgets', included: true },
      { text: 'Tabela de Excedências', included: true },
      { text: 'Notificações via Telegram', included: true }
    ]
  }
];

function PlansPage({
  currentPlan = 'gratuito',
  onPlanSelected,
  onClose,
  isModal = false,
  /* AdminHeader props — only needed when isModal=false */
  username,
  domainName,
  domainUserCount,
  domainUserLimit,
  domainDeviceCount,
  domainDeviceLimit,
  onLogout,
  user,
  onUserSaved,
  onNavigateToPlans
}) {
  const [loading, setLoading] = useState(false);
  const [selectedLoading, setSelectedLoading] = useState(null);

  const handleSelect = async (planId) => {
    if (planId === currentPlan || loading) return;
    setLoading(true);
    setSelectedLoading(planId);
    try {
      if (onPlanSelected) await onPlanSelected(planId);
    } catch (err) {
      console.error('Erro ao selecionar plano:', err);
    } finally {
      setLoading(false);
      setSelectedLoading(null);
    }
  };

  const cards = (
    <div className="plans-cards">
      {PLANS.map((plan) => {
        const isCurrent = plan.id === currentPlan;
        return (
          <div key={plan.id} className={`plan-card${isCurrent ? ' current' : ''}`}>
            <div className="plan-icon-wrap">
              <plan.Icon />
            </div>
            <div className="plan-name">{plan.name}</div>
            <div className={plan.priceLabel === 'R$ 00,00' ? 'plan-price-free' : 'plan-price'}>
              {plan.priceLabel}
            </div>
            <div className="plan-period">{plan.period}</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              {plan.features.map((feat, i) => (
                <li key={i} className={!feat.included ? 'locked-feature' : ''}>
                  <span className="feature-icon">
                    {feat.included ? <IconCheck /> : <IconX />}
                  </span>
                  {feat.text}
                </li>
              ))}
            </ul>
            {isCurrent ? (
              <button className="plan-btn current-btn" disabled>
                Plano Atual
              </button>
            ) : (
              <button
                className="plan-btn select-btn"
                onClick={() => handleSelect(plan.id)}
                disabled={loading}
              >
                {selectedLoading === plan.id ? 'Aguarde...' : 'Escolher Plano'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  /* ── MODAL (first-time welcome) ───────────────────── */
  if (isModal) {
    return (
      <div className="plans-overlay">
        <div className="plans-modal-inner">
          <div className="plans-welcome-badge">
            <IconShield />
            <span>Bem-vindo ao Clean Air</span>
          </div>
          {onClose && (
            <button className="plans-close-btn" onClick={onClose} title="Fechar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          <div className="plans-header">
            <h1>Escolha seu plano</h1>
            <p>Selecione o plano que melhor atende à sua operação. Você pode alterar quando quiser.</p>
          </div>

          {cards}

          <div className="plans-footer">
            <IconShield />
            <span>Todos os planos incluem atualizações contínuas, suporte técnico e segurança de dados.</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── FULL PAGE ────────────────────────────────────── */
  return (
    <div className="plans-full-page">
      <AdminHeader
        username={username}
        domainName={domainName}
        domainUserCount={domainUserCount}
        domainUserLimit={domainUserLimit}
        domainPlan={currentPlan}
        domainDeviceCount={domainDeviceCount}
        domainDeviceLimit={domainDeviceLimit}
        onLogout={onLogout}
        onBackToDevices={onClose}
        onNavigateToPlans={onNavigateToPlans}
        isOnDevicesPage={false}
        isOnDashboard={false}
        user={user}
        onUserSaved={onUserSaved}
      />

      <main className="plans-page-content">
        <div className="plans-header">
          <h1>Planos e Preços</h1>
          <p>Escolha o plano ideal para sua necessidade</p>
        </div>

        {cards}

        <div className="plans-footer">
          <IconShield />
          <span>Todos os planos incluem atualizações contínuas, suporte técnico e segurança de dados.</span>
        </div>
      </main>
    </div>
  );
}

export default PlansPage;
