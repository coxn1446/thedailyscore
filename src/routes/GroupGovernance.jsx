import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import GovernanceDesk from '../components/Groups/GovernanceDesk';
import Loading from '../components/Loading/Loading';
import { archiveGroup, fetchGroup, leaveGroup, renameGroup, updateGroupAlerts, updateGroupGames } from '../helpers/groupHelpers';

const GroupGovernance = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchGroup(groupId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load this group.');
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const handleSave = async ({ name, games }) => {
    setPending(true);
    try {
      let next = detail;
      if (name) next = await renameGroup(groupId, name);
      if (games) next = await updateGroupGames(groupId, games);
      setDetail(next);
    } catch (err) {
      toast.error(err.message || 'Could not save changes');
    } finally {
      setPending(false);
    }
  };

  const handleAlerts = async (next) => {
    setPending(true);
    try {
      const updated = await updateGroupAlerts(groupId, next);
      setDetail(updated);
    } catch (err) {
      toast.error(err.message || 'Could not save alerts');
    } finally {
      setPending(false);
    }
  };

  const handleArchive = async () => {
    setPending(true);
    try {
      await archiveGroup(groupId);
      navigate('/groups', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not archive the group');
      setPending(false);
    }
  };

  const handleLeave = async () => {
    setPending(true);
    try {
      await leaveGroup(groupId);
      navigate('/groups', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not leave the group');
      setPending(false);
    }
  };

  if (loadError) {
    return (
      <p role="alert" className="font-sans text-body-md text-error">
        {loadError}
      </p>
    );
  }

  if (!detail) return <Loading />;

  return (
    <div className="border-t-2 border-primary pt-space-md">
      <GovernanceDesk
        detail={detail}
        onSave={handleSave}
        onArchive={handleArchive}
        onLeave={handleLeave}
        onAlerts={handleAlerts}
        pending={pending}
      />
    </div>
  );
};

export default GroupGovernance;
