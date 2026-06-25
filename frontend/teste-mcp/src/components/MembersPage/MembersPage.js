import React, { useEffect, useState, useCallback } from 'react';
import './MembersPage.css';
import AdminHeader from '../AdminHeader';
import Footer from '../Footer';
import { domains as domainsApi, users as usersApi } from '../../services/api';
import { useToast } from '../ToastContext';
import logger from '../../utils/logger';

const MembersPage = ({
  username,
  domainName,
  domainUserCount,
  domainUserLimit,
  domainPlan,
  domainDeviceCount,
  domainDeviceLimit,
  user,
  onUserSaved,
  onDomainSaved,
  onLogout,
  onBackToDevices,
  onRefreshSession,
  onNavigateToPlans
}) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const toast = useToast();

  const loadMembers = useCallback(async () => {
    if (!user?.domainId) return;
    try {
      const response = await domainsApi.getUsersByDomain(user.domainId);
      setMembers(response.data || []);
    } catch (error) {
      logger.error('Erro ao carregar membros do domínio:', error.message);
      toast.error(error.message || 'Erro ao carregar membros do domínio');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.domainId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleToggleAdmin = async (member) => {
    const newRole = member.role === 'admin' ? 'user' : 'admin';
    try {
      await usersApi.updateRole(member.id, newRole);
      toast.success(
        newRole === 'admin'
          ? `${member.username} agora é administrador.`
          : `${member.username} não é mais administrador.`
      );
      await loadMembers();
      if (onRefreshSession) await onRefreshSession();
    } catch (error) {
      toast.error(error.message || 'Erro ao alterar permissão do usuário');
    }
  };

  const handleRemoveClick = (member) => {
    setMemberToRemove(member);
  };

  const cancelRemove = () => {
    setMemberToRemove(null);
  };

  const confirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      await usersApi.removeFromDomain(memberToRemove.id);
      toast.success(`${memberToRemove.username} foi removido do domínio.`);
      await loadMembers();
      if (onRefreshSession) await onRefreshSession();
    } catch (error) {
      toast.error(error.message || 'Erro ao remover usuário do domínio');
    } finally {
      setMemberToRemove(null);
    }
  };

  return (
    <div className="members-page-container">
      <AdminHeader
        username={username}
        domainName={domainName}
        domainUserCount={domainUserCount}
        domainUserLimit={domainUserLimit}
        domainPlan={domainPlan}
        domainDeviceCount={domainDeviceCount}
        domainDeviceLimit={domainDeviceLimit}
        onLogout={onLogout}
        onBackToDevices={onBackToDevices}
        onNavigateToPlans={onNavigateToPlans}
        isOnDevicesPage={false}
        isOnDashboard={false}
        user={user}
        onUserSaved={onUserSaved}
        onDomainSaved={onDomainSaved}
      />

      <main className="members-content">
        <h1 className="members-title">
          Membros do domínio
          {domainUserLimit != null && (
            <span className="members-user-count-badge">{domainUserCount}/{domainUserLimit} usuários</span>
          )}
        </h1>

        {loading ? (
          <p className="members-loading">Carregando membros...</p>
        ) : members.length === 0 ? (
          <p className="members-empty">Nenhum membro encontrado.</p>
        ) : (
          <div className="members-list">
            {members.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-info">
                  <span className="member-name">{member.username}</span>
                  <span className="member-email">{member.email}</span>
                </div>

                <div className="member-meta">
                  <span className={`member-role-badge ${member.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                    {member.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>

                  {!member.has_access && (
                    <span className="member-access-badge">Sem acesso</span>
                  )}
                </div>

                <div className="member-actions">
                  <button
                    className="member-btn role-btn"
                    onClick={() => handleToggleAdmin(member)}
                  >
                    {member.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                  </button>

                  {member.id !== user?.id && (
                    <button
                      className="member-btn remove-btn"
                      onClick={() => handleRemoveClick(member)}
                    >
                      Remover do domínio
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {memberToRemove && (
        <div className="modal-overlay" onClick={cancelRemove}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Remover usuário</h3>
            <p>
              Tem certeza que deseja remover <strong>{memberToRemove.username}</strong> do domínio?
            </p>
            <p className="modal-warning">O usuário perderá acesso a todos os dispositivos deste domínio.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={cancelRemove}>
                Cancelar
              </button>
              <button className="modal-btn confirm-btn" onClick={confirmRemove}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersPage;
