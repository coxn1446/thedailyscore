import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import JoinGroup from '../routes/JoinGroup';

jest.mock('../helpers/groupHelpers', () => ({
  joinGroup: jest.fn(),
}));

const { joinGroup } = require('../helpers/groupHelpers');

const renderJoin = () =>
  render(
    <MemoryRouter initialEntries={['/join/invite-token']}>
      <Routes>
        <Route path="/join/:token" element={<JoinGroup />} />
        <Route path="/groups/:groupId" element={<h1>Sunday desk</h1>} />
      </Routes>
    </MemoryRouter>
  );

describe('JoinGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends the signed-in reader to the group', async () => {
    joinGroup.mockResolvedValue({ group: { group_id: 10, role: 'fellow' } });
    renderJoin();
    expect(await screen.findByRole('heading', { name: 'Sunday desk' })).toBeInTheDocument();
    expect(joinGroup).toHaveBeenCalledWith('invite-token');
  });

  test('shows an archived invite error', async () => {
    joinGroup.mockRejectedValue(new Error('Archived groups are not accepting members'));
    renderJoin();
    expect(await screen.findByRole('alert')).toHaveTextContent('Archived groups are not accepting members');
  });
});
