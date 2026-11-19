import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoViewer from '../components/Home/PhotoViewer';

const points = (...pairs) => pairs.map(([x, y], index) => ({ identifier: index, clientX: x, clientY: y }));

const fire = (frame, type, touches) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  event.touches = touches;
  frame.dispatchEvent(event);
};

describe('PhotoViewer', () => {
  test('fills the screen and closes', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<PhotoViewer src="/uploads/desk.png" onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Picture' })).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Picture' });
    expect(img).toHaveAttribute('src', '/uploads/desk.png');
    expect(img).toHaveClass('max-h-full', 'max-w-full', 'object-contain');
    expect(screen.queryByRole('button', { name: 'Larger' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Smaller' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  test('pinches and drags a picture on a phone', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
      media: '',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    render(<PhotoViewer src="/uploads/desk.png" onClose={jest.fn()} />);

    const frame = document.querySelector('.photo-stage');
    const img = screen.getByRole('img', { name: 'Picture' });
    Object.defineProperty(img, 'offsetWidth', { configurable: true, value: 400 });
    Object.defineProperty(img, 'offsetHeight', { configurable: true, value: 400 });
    frame.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400,
    });

    fire(frame, 'touchstart', points([150, 200], [250, 200]));
    fire(frame, 'touchmove', points([100, 200], [300, 200]));
    expect(Number(img.style.getPropertyValue('--photo-scale'))).toBeCloseTo(2);

    fire(frame, 'touchend', []);
    fire(frame, 'touchstart', points([200, 200]));
    fire(frame, 'touchmove', points([260, 230]));
    expect(img.style.getPropertyValue('--photo-x')).toBe('60px');
    expect(img.style.getPropertyValue('--photo-y')).toBe('30px');

    fire(frame, 'touchend', []);
    fire(frame, 'touchstart', points([200, 200], [220, 200]));
    fire(frame, 'touchmove', points([200, 200], [200, 200]));
    expect(img.style.getPropertyValue('--photo-scale')).toBe('1');
    expect(img.style.getPropertyValue('--photo-x')).toBe('0px');
  });
});
