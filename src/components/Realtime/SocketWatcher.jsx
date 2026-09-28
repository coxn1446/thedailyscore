import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '../../store/auth.reducer';
import { connectSocket, disconnectSocket } from '../../helpers/socketHelpers';

const SocketWatcher = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) {
      disconnectSocket();
      return undefined;
    }
    connectSocket(user.user_id);
    return () => disconnectSocket();
  }, [isAuthenticated, user?.user_id]);

  return null;
};

export default SocketWatcher;
