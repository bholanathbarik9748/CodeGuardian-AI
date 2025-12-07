/**
 * Example usage of the color constants
 * This file demonstrates how to use the colors in your components
 */

import { colors, tailwindClasses, theme } from './colors';

// Example 1: Using color values directly (for inline styles)
export const ExampleComponent1 = () => {
  return (
    <div
      style={{
        background: `linear-gradient(to bottom right, ${colors.gradient.indigo[900]}, ${colors.gradient.purple[900]}, ${colors.gradient.pink[900]})`,
        color: colors.text.white,
      }}
    >
      Content with inline styles
    </div>
  );
};

// Example 2: Using Tailwind classes (recommended)
export const ExampleComponent2 = () => {
  return (
    <div className={tailwindClasses.backgroundGradientAnimated}>
      <div className={tailwindClasses.glassCard}>
        <h1 className={tailwindClasses.headingGradient}>
          CodeGuardian AI
        </h1>
        <button className={tailwindClasses.githubButton}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
};

// Example 3: Using theme object
export const ExampleComponent3 = () => {
  return (
    <div>
      {/* Access colors through theme */}
      <div style={{ backgroundColor: theme.colors.button.github.bg }}>
        GitHub Button Background
      </div>
      
      {/* Use with opacity helper */}
      <div style={{ backgroundColor: theme.withOpacity(theme.colors.gradient.purple[500], 0.2) }}>
        Purple with 20% opacity
      </div>
    </div>
  );
};

// Example 4: Destructuring specific colors
export const ExampleComponent4 = () => {
  const { gradient, text, button } = colors;
  
  return (
    <div>
      <div style={{ color: text.white }}>
        White text
      </div>
      <div style={{ color: text.purple200 }}>
        Purple text
      </div>
      <button
        style={{
          background: `linear-gradient(to right, ${button.logout.from}, ${button.logout.to})`,
          color: button.logout.text,
        }}
      >
        Logout
      </button>
    </div>
  );
};

