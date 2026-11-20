# Design
Palette: ink #140B29, plum #30145E, violet #9163E8, mist #D8C9FA. Oversized editorial typography, generous whitespace, fine rules and fluid sculptural forms. MITP informs section progression and prominent calls to action; no copied assets. CSS morphing motion pauses with reduced-motion preferences. Agency operators own assignments and approvals. Academy is Coming Soon.

## Creative refinement — November 17
The visual language now centers on a layered violet ribbon sculpture, fine orbital lines and a quiet grain field. Offset headline lines, an asymmetric gallery and sculptural team tiles bring editorial variation. The light manifesto section and violet Academy panel punctuate the dark canvas.

Motion uses CSS transforms and native Web Animations, with IntersectionObserver for one-shot artwork masks, heading lifts and service-row entrances. Content is visible by default. The hero supports pointer drift, pause/resume, offscreen suspension and hidden-tab suspension. Reduced motion disables loops, transitions and reveal animations, including live preference changes. No GSAP dependency was justified; no dependencies were added.

Dashboard layouts remain stable. Only surface, hover and focus styling changed. Motion implementation is isolated in components/motion.tsx; creative overrides are in app/creative.css.

## Founder refinement — November 20

Decorative Unicode marks/arrows have been removed in favor of the custom SVG brand form and Lucide interface icons. The palette adds plum, lilac, orchid and iris, with a restrained teal for approved delivery. The dark-purple identity, ribbon sculpture and accessible motion remain intact. Process geometry uses explicit positioning to avoid mobile label collisions.

Real workspaces use the same editorial typography and purple surfaces, with color supporting project status, not replacing text labels. Internal notes and pending/approved files are clearly distinguished. New styles are in `app/workspace.css`; no animation dependency was added.
