import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import GroupGovernance from '../routes/GroupGovernance';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('../helpers/groupHelpers', () => ({
  fetchGroup: jest.fn(),
  updateGroupGames: jest.fn(),
  archiveGroup: jest.fn(),
  leaveGroup: jest.fn(),
  addGroupMember: jest.fn(),
  renameGroup: jest.fn(),
  updateGroupAlerts: jest.fn(),
  inviteUrl: (token) => `http://localhost/join/${token}`,
}));

const { fetchGroup, updateGroupGames, renameGroup, updateGroupAlerts } = require('../helpers/groupHelpers');

const games = [
  { game_id: 1, slug: 'wordle', name: 'Wordle', sort_direction: 'lower', enabled: true },
  { game_id: 2, slug: 'krillion', name: 'Krillion', sort_direction: 'lower', enabled: false },
];

const members = [
  { user_id: 4, handle: 'ada_l', display_name: 'Ada', role: 'curator' },
  { user_id: 8, handle: 'alan', display_name: 'Alan', role: 'fellow' },
];

const renderGovernance = () =>
  render(
    <MemoryRouter initialEntries={['/groups/10/governance']}>
      <Routes>
        <Route path="/groups/:groupId/governance" element={<GroupGovernance />} />
        <Route path="/groups/:groupId" element={<div>Register</div>} />
        <Route path="/groups" element={<div>Directory</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('GroupGovernance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lets a fellow read the matrix without curator controls', async () => {
    const user = userEvent.setup();
    fetchGroup.mockResolvedValue({
      group: { group_id: 10, name: 'Sunday desk', role: 'fellow', invite_token: undefined },
      games,
      members,
    });

    renderGovernance();
    expect(await screen.findByRole('heading', { name: 'Sunday desk' })).toBeInTheDocument();
    expect(screen.queryByText('Governance')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Wordle' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Krillion' })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Copy invite link' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Controls' }));
    expect(screen.queryByRole('button', { name: 'Archive group' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave group' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Messages' })).toBeInTheDocument();
  });

  test('copies the invite link and toggles a game', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    fetchGroup.mockResolvedValue({
      group: { group_id: 10, name: 'Sunday desk', role: 'curator', invite_token: 'invite-token' },
      games,
      members: [members[0]],
    });
    updateGroupGames.mockResolvedValue({
      group: { group_id: 10, name: 'Sunday desk', role: 'curator', invite_token: 'invite-token' },
      games: games.map((game) => ({ ...game, enabled: true })),
      members: [members[0]],
    });

    document.execCommand = jest.fn(() => true);
    renderGovernance();
    await user.click(await screen.findByRole('button', { name: 'Roster' }));
    await user.click(screen.getByRole('button', { name: 'Copy invite link' }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Invite link copied');
    });
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText('http://localhost/join/invite-token')).not.toBeInTheDocument();

    document.execCommand = jest.fn(() => false);
    writeText.mockRejectedValueOnce(new Error('denied'));
    await user.click(screen.getByRole('button', { name: 'Copy invite link' }));
    expect(toast.error).toHaveBeenCalledWith('Could not copy invite link');
    expect(screen.queryByText('http://localhost/join/invite-token')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Games' }));

    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Krillion' }));
    expect(updateGroupGames).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => {
      expect(updateGroupGames).toHaveBeenCalledWith('10', [{ slug: 'krillion', enabled: true }]);
    });
  });

  test('saves a renamed group only after the title changes', async () => {
    const user = userEvent.setup();
    fetchGroup.mockResolvedValue({
      group: { group_id: 10, name: 'Sunday desk', role: 'curator', invite_token: 'invite-token' },
      games,
      members: [members[0]],
    });
    renameGroup.mockResolvedValue({
      group: { group_id: 10, name: 'Monday desk', role: 'curator', invite_token: 'invite-token' },
      games,
      members: [members[0]],
    });

    renderGovernance();
    const title = await screen.findByLabelText('Group name');
    expect(title).toHaveValue('Sunday desk');
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Controls' }));
    expect(screen.getByRole('button', { name: 'Archive group' })).toBeInTheDocument();
    updateGroupAlerts.mockResolvedValue({
      group: {
        group_id: 10,
        name: 'Sunday desk',
        role: 'curator',
        invite_token: 'invite-token',
        alert_messages: false,
        alert_scores: true,
      },
      games,
      members: [members[0]],
    });
    await user.click(screen.getByRole('switch', { name: 'Messages' }));
    await waitFor(() => {
      expect(updateGroupAlerts).toHaveBeenCalledWith('10', { alert_messages: false, alert_scores: true });
    });
    await user.click(screen.getByRole('button', { name: 'Games' }));

    await user.clear(title);
    await user.type(title, 'Monday desk');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => {
      expect(renameGroup).toHaveBeenCalledWith('10', 'Monday desk');
    });
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(await screen.findByText('Register')).toBeInTheDocument();
  });
});
