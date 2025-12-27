# User Preferences and Coding Rules

## General Principles
1.  **Simplicity First**: Avoid over-engineering. Remove necessary state and keep React components lean.
2.  **Stateless Logic**: If a helper function (formatting, utils, etc.) does not rely on component props or state, move it **outside** the component definition.

## React Patterns
-   **State Management**: Minimize `useState`. Consolidate related data into single objects (e.g., `Legend` object) rather than multiple atomic states.
-   **Refs vs Vars**: Inside `useEffect`, if a variable like a lookup Map doesn't need to persist across renders or be accessed by other effects, just define it as a local `const` or `let` instead of `useRef`.

## TypeScript
-   **Types vs Interfaces**: Prefer `type` alias over `interface`.

## Styling (UnoCSS)
-   **Library**: Use `unocss` exclusively. Avoid `tailwind` classes or inline `style` props where possible.
-   **Attributify Mode**: Use the attributify preset (e.g., `un-text="red"`).
-   **Grouping**: Group related utilities in a single attribute value.
    -   *Good*: `un-position="absolute top-2 left-2"`
    -   *Bad*: `un-position="absolute" un-top="2" un-left="2"`
