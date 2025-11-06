import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Widget from '../Widget';
import { ColorProvider } from '../ColorContext';

describe('Widget', () => {
  it('should render children', () => {
    render(
      <ColorProvider>
        <Widget>
          <div>Test Content</div>
        </Widget>
      </ColorProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render with a title', () => {
    render(
      <ColorProvider>
        <Widget title="Test Widget">
          <div>Content</div>
        </Widget>
      </ColorProvider>
    );

    expect(screen.getByText('Test Widget')).toBeInTheDocument();
  });

  it('should not render title when not provided', () => {
    render(
      <ColorProvider>
        <Widget>
          <div>Content</div>
        </Widget>
      </ColorProvider>
    );

    // Check that no h2 element exists (title is rendered as h2)
    const headings = screen.queryAllByRole('heading');
    expect(headings).toHaveLength(0);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ColorProvider>
        <Widget className="custom-class">
          <div>Content</div>
        </Widget>
      </ColorProvider>
    );

    const widget = container.querySelector('.custom-class');
    expect(widget).toBeInTheDocument();
  });
});

