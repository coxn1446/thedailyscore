import { createSlice } from '@reduxjs/toolkit';
import { AUTH_USER_KEY, cacheGet } from '../utils/sessionCache';

export const defaultAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

export const getAuthInitialState = () => {
  const cachedUser = cacheGet(AUTH_USER_KEY);
  if (!cachedUser) return { ...defaultAuthState };
  return {
    user: cachedUser,
    isAuthenticated: true,
    isLoading: false,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: defaultAuthState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.isLoading = false;
    },
    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setAuthLoading(state, action) {
      state.isLoading = action.payload;
    },
  },
});

export const { setUser, clearUser, setAuthLoading } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;

export default authSlice.reducer;
