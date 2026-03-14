import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TeamSummary, MemberBalanceSummary } from '../../types/firestore';

export interface CacheState {
  teams: TeamSummary[];
  memberBalances: MemberBalanceSummary[];
  lastFetchedAt: number | null;
}

const initialState: CacheState = {
  teams: [],
  memberBalances: [],
  lastFetchedAt: null,
};

const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    setDashboardData: (
      state,
      action: PayloadAction<{ teams: TeamSummary[]; memberBalances: MemberBalanceSummary[] }>
    ) => {
      state.teams = action.payload.teams;
      state.memberBalances = action.payload.memberBalances;
      state.lastFetchedAt = Date.now();
    },
    clearCache: state => {
      state.teams = [];
      state.memberBalances = [];
      state.lastFetchedAt = null;
    },
    invalidateCache: state => {
      state.lastFetchedAt = null;
    },
  },
});

export const { setDashboardData, clearCache, invalidateCache } = cacheSlice.actions;
export default cacheSlice.reducer;
