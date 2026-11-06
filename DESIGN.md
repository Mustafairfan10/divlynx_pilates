---
name: Divlynx Pilates (public site)
description: A beginner's Pilates programme sheet, printed form, pencil figures and ballpoint notes, for the public routes only.
colors:
  paper: "#ffffff"
  desk: "#e9edf3"
  canary: "#fbf1ab"
  pink: "#f9dde5"
  print: "#15181e"
  print-2: "#3a404b"
  muted: "#57606e"
  form: "#4a6186"
  rule: "#cdd7e6"
  rule-strong: "#9aabc4"
  ballpoint: "#2340b0"
  ballpoint-soft: "#e5eafb"
  pencil: "#737985"
  hilite: "#f8ec3a"
  stamp: "#c3285f"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.85rem, 6.4vw, 5.6rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontVariation: "\"wdth\" 125"
  headline:
    fontFamily: "Archivo, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.35rem, 2.6vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontVariation: "\"wdth\" 125"
  title:
    fontFamily: "Archivo, ui-sans-serif, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible Next, Verdana, Segoe UI, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  body-lead:
    fontFamily: "Atkinson Hyperlegible Next, Verdana, Segoe UI, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Archivo, ui-sans-serif, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    letterSpacing: "0.08em"
    fontVariation: "\"wdth\" 72"
  hand:
    fontFamily: "Reenie Beanie, Segoe Print, cursive"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.01em"
rounded:
  none: "0px"
  slip: "2px"
  stamp: "6px"
spacing:
  sheet-x-sm: "20px"
  sheet-x: "40px"
  sheet-y: "48px"
  sheet-gap: "56px"
  container: "1240px"
components:
  action-primary:
    textColor: "{colors.print}"
    typography: "{typography.title}"
    padding: "8px 6px"
  action-secondary:
    textColor: "{colors.print}"
    padding: "0"
  action-secondary-hover:
    textColor: "{colors.ballpoint}"
  input-line:
    textColor: "{colors.ballpoint}"
    rounded: "{rounded.none}"
    padding: "8px 2px 4px"
  field-label:
    textColor: "{colors.form}"
    typography: "{typography.label}"
  sheet:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "48px 40px"
  sheet-canary:
    backgroundColor: "{colors.canary}"
    rounded: "{rounded.none}"
    padding: "48px 40px"
  sheet-pink:
    backgroundColor: "{colors.pink}"
    rounded: "{rounded.none}"
    padding: "48px 40px"
  stamp:
    textColor: "{colors.stamp}"
    rounded: "{rounded.stamp}"
    padding: "6px 12px"
  nav-link:
    textColor: "{colors.print-2}"
    typography: "{typography.label}"
    padding: "8px 12px"
  nav-link-hover:
    textColor: "{colors.ballpoint}"
---

# Design System: Divlynx Pilates (public site)

**Scope.** This system governs the public site: the routes under `src/app/(site)` and the components in `src/components/site`, plus the registry pieces restyled into this world (split accordion, marker text, squiggle arrow, the paper tone of the view switch). The world's tokens are scoped to the `.site` wrapper. The staff app at `/admin` keeps its own incumbent operate-mode styling (the `:root`/`.dark` tokens, Geist and Fraunces at the top of `globals.css`). This document does not govern it, and nothing here should be carried into it.

## Overview

**Creative North Star: "The Programme Sheet"**

Every public page is a printed sheet that an instructor hands a beginner at their first session. White bond paper sits on a cool grey-blue desk. The sheet carries pre-printed form furniture in form-blue: ruled lines, numbered rows, boxed header cells, condensed caps labels. The studio's printed type is near-black Archivo, stretched wide and heavy for titles and squeezed narrow for labels. The reader's own entries and the instructor's notes are ballpoint blue, and the notes are set in a quick handwriting face in the right-hand margin. Exercises are drawn as graphite stick figures. Fluorescent highlighter marks the thing to do next.

Density is that of a real form. Rows are tight and numbered, and capacity shows as rows of small boxes that get crossed off. Headings are set like printed section titles over a full-width rule. Whole sections change paper colour the way carbonless copies do: canary is the customer copy (fees, the order slip) and pink is the patient copy (what to expect before the first class). The pink stamp is the one loud mark, and it is kept for the intro offer.

Motion is the motion of ink. Ticks, crosses and arrows draw themselves along their stroke, the stamp lands with a short overshoot, and the highlighter swipe widens slightly on hover. All of it stops under `prefers-reduced-motion`. Body text uses Atkinson Hyperlegible Next because the audience includes injured, pregnant and low-vision readers (PRODUCT.md, Accessibility & Inclusion). That choice holds even where a more "printed" face would look closer to a real form.

**Key Characteristics:**
- White paper sheets on a grey-blue desk, square-cornered, with a soft lifted shadow.
- Three type voices with strict jobs: wide/narrow Archivo for print, Atkinson for reading, Reenie Beanie for ink.
- Form-blue furniture: rules, boxes, numbered rows, condensed caps labels.
- Ballpoint blue for anything written: input text, ticks, notes, focus.
- Highlighter yellow behind the primary action label, never as a button fill.
- Canary and pink as whole-section paper colours, never as accents.

## Colors

The palette is stationery: one paper, two carbonless copy tints, one printing ink, one form-furniture blue, one pen, one highlighter, one stamp.

### Primary
- **Ballpoint Blue** (ballpoint): the pen. Used for text typed into fields, drawn ticks and crosses, margin notes, arrows, wavy underlines on secondary actions, the focus outline, the caret and the native accent colour. If it is blue, someone wrote it.
- **Highlighter Yellow** (hilite): the swipe behind every primary action label, and the text selection colour. Text on it is always print-black.

### Secondary
- **Clinic Stamp Pink** (stamp): the rubber stamp for the intro offer, validation errors (border and message text), and the faint margin rule (at 40%) that separates the instructor's margin from the sheet body.

### Tertiary
- **Canary Copy** (canary): the whole background of customer-copy sections (fee schedule, order slip, shop order aside).
- **Pink Copy** (pink): the whole background of patient-copy sections (before your first class).

### Neutral
- **Bond Paper** (paper): every sheet, field box and checkbox fill.
- **Desk** (desk): the page background the sheets lie on.
- **Printing Ink** (print): headings, titles, heading rules, the header's bottom rule, dialog and toast borders.
- **Printing Ink, Second Pass** (print-2): running body copy and descriptions.
- **Muted Grey** (muted): supporting notes, "n left" counts, legal lines.
- **Form Blue** (form): pre-printed labels, row numbers in lists, capacity box borders, checkbox borders.
- **Ruled Line** (rule) and **Strong Rule** (rule-strong): row dividers and ruled-paper lines; baseline input lines, the view switch border, scrollbars.
- **Graphite** (pencil): stick-figure exercise drawings only. Never used for text.
- **Ballpoint Wash** (ballpoint-soft): the active tab cell in a multi-part form.

### Named Rules
**The Who-Wrote-It Rule.** Colour says who made the mark. The studio's printing is black, the form's furniture is form-blue, the person's or instructor's writing is ballpoint, graphite is drawing, and pink is the stamp. Don't use a colour for a mark its author would not have made.

**The Highlighter Is a Verb Rule.** Yellow sits behind the label of the action to take next. It is not a fill, a badge or a section background. Canary is the paper colour for that job.

**The Carbon Copy Rule.** Canary and pink fill a whole sheet or slip. They are never chips, tints on cards, or hover states.

## Typography

**Display Font:** Archivo, width axis at 125 (with ui-sans-serif)
**Label Font:** Archivo, width axis at 72 (with ui-sans-serif)
**Body Font:** Atkinson Hyperlegible Next (with Verdana, Segoe UI, system-ui)
**Hand Font:** Reenie Beanie (with Segoe Print, cursive)

**Character:** Archivo at its two width extremes reads as the form's printing: wide black caps for titles and narrow tracked caps for the furniture. Atkinson is the form's typed, readable text. Reenie Beanie is a fast ballpoint scrawl, and the mix of the two print widths with one hand is what makes it a form someone has filled in.

### Hierarchy
- **Display** (900, wide, uppercase, `clamp(1.85rem, 6.4vw, 5.6rem)`, 0.92): the sheet title, one per page ("Your first Pilates programme", "Client intake form"). Max about 14ch.
- **Headline** (800, wide, uppercase, `clamp(1.35rem, 2.6vw, 2rem)`, 1.05): section headings, always sitting on a 2px print-black rule. Smaller wide-black titles (18 to 22px) head slips such as the order slip and totals.
- **Title** (700, Archivo regular width, 19px): row titles such as class names and product names. Primary action labels use the same voice at 16px or 19px.
- **Body** (Atkinson 400, 15.5 to 17px, relaxed leading): descriptions and running copy, held to 46 to 62ch. The lead paragraph under the sheet title is 19px at 54ch.
- **Label** (Archivo narrow 600, uppercase, 11.5 to 14px, tracking 0.06 to 0.14em, form-blue): field labels, header cells, meta lines ("45 min · all levels · max 16"), nav links, copy designations.
- **Hand** (Reenie Beanie 400, 24 to 34px, tight leading, ballpoint): margin notes, the date and instructor cells, the name typed into the hand field (28px), the cart count.

### Named Rules
**The Three Voices Rule.** Print, reading and ink never swap jobs. Archivo is never used for paragraphs, Atkinson is never used for titles, and Reenie Beanie is never used for labels or controls.

**The Hand Is Never Alone Rule.** Handwritten notes add warmth and direction. Essential information (price, time, policy) must also appear in print or body type, because a scrawl is the least legible voice on the sheet.

**The Tabular Figures Rule.** Times, prices, quantities and every table use tabular numerals.

## Layout

Content sits in a centered container (max 1240px, 16px side padding, 32px from md). Sheets stack vertically on the desk with 40px between them, 56px from md. Each sheet pads 20px horizontally on mobile and 40px from md, and 40 to 48px vertically.

Inside a sheet the grammar is a printed form. A **header strip** of boxed cells (form number, studio, date, instructor or office use) is separated by thin rules, with a form-blue label at the top of each cell and its value below, sometimes handwritten. Below the strip, the body is a main column plus a **right margin** of about 330px on large screens, divided by a pink rule at 40% opacity. The margin holds handwritten notes, arrows, the stamp and short reassurances. On smaller screens the margin drops below the body behind a thin top rule.

Lists are **numbered programme rows**: a wide-black number, an optional pencil figure (120 × 74px), the title with a narrow-caps meta line, and the next slot with capacity boxes aligned right. Rows are divided by the light rule, and the list opens with a 2px print-black rule. The mobile menu turns the nav into a numbered, ruled list at 4.25rem line spacing. Multi-step forms use a lettered tab strip (A to E) with the active cell washed in ballpoint-soft.

## Elevation & Depth

Depth is physical paper on a desk. Sheets are flat surfaces lifted by one soft, cool shadow, and nothing inside a sheet is elevated. Dialogs and toasts are separate slips of paper, so they get a deeper drop but the same character.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 1px rgb(20 30 60 / 0.06), 0 18px 40px -24px rgb(20 30 60 / 0.35)`): every sheet, the footer stub and the shop order aside.
- **Dialog slip** (`box-shadow: 0 30px 60px -30px rgb(20 30 60 / 0.45)`): reserve and other dialogs.
- **Toast slip** (`box-shadow: 0 14px 30px -18px rgb(20 30 60 / 0.5)`): toasts.

### Named Rules
**The Flat Sheet Rule.** Inside a sheet, separation comes from rules, boxes and paper colour, never shadows. The only shadows belong to paper lying on the desk.

## Shapes

Paper is cut square. Sheets, carbon-copy sections, field boxes, checkboxes, capacity boxes and the order slip have 0 radius. Dialog and toast slips round by a barely visible 2px. The focus outline is 2px dashed ballpoint, offset 3px, rounded 3px. The only clearly rounded object is the rubber stamp (6px, 2.5px border plus a 1px outline offset 2px, rotated about -7deg, inked unevenly through a noise mask).

Borders carry the form. Heading rules and the header's bottom rule are 2px print-black, table and section dividers 1.5px print-black, row dividers 1px rule. Inputs are a 1.5px baseline only. The highlighter swipe is the one organic shape: a skewed (-8deg), slightly rotated band with uneven corner radii, inset so it sits like a marker pass behind the words. The footer is a tear-off stub with a dashed perforation and scissors mark.

## Components

### Buttons
Actions look like marks on the form, not app buttons.
- **Primary (highlighter action):** Archivo bold, print-black, 16px (md) or 19px (lg), minimal padding. The label sits on a highlighter swipe and is followed by a hand-drawn ballpoint arrow. There is no fill, border or radius.
- **Hover / Focus:** the swipe widens (to -9% side inset, `cubic-bezier(0.2, 0.8, 0.2, 1)`, 0.45s) and the arrow moves 4px right. Focus is the dashed ballpoint outline. Pressed moves down 1px. Disabled drops to 50% opacity.
- **Secondary (pen action):** Archivo semibold, print-black, with a 1.5px wavy ballpoint underline offset 6px. Turns ballpoint on hover.
- **Row actions:** a whole row or slot can act as the button. On hover its time text turns ballpoint.

### Inputs / Fields
- **Style:** a printed baseline (1.5px strong rule) on transparent paper. Typed text is ballpoint at 17px, or Reenie Beanie at 28px for the hand field (the name). Placeholders are muted. Textareas follow the same baseline treatment.
- **Label:** narrow caps in form-blue above the line. Hints sit below in muted Atkinson.
- **Focus:** the baseline turns ballpoint and thickens by an extra 1.5px underline. There is no outline box.
- **Error:** the baseline turns stamp pink and a stamp-pink message appears below. Error is never shown by colour alone.
- **Checkbox:** a 22px square with a 1.5px form-blue border on paper. When checked, a ballpoint tick draws itself, overshooting the box. The border turns ballpoint on hover.

### Cards / Containers
- **Corner Style:** square (0).
- **Background:** paper, or canary/pink for carbon-copy sections.
- **Shadow Strategy:** the sheet shadow only (see Elevation & Depth).
- **Border:** none on the sheet itself. Structure comes from internal rules.
- **Internal Padding:** 20px/40px horizontal, 40 to 48px vertical.
- **Accordion (questions):** open and closed items are separated by rules, print-black when open and the light rule when closed. Titles are Atkinson semibold at 17 to 18px with a form-blue chevron.

### Navigation
- **Header:** a sticky strip of paper at 95% with a light blur, a 64px bar and a 2px print-black bottom rule. The wordmark is the first word in wide black caps followed by the rest in narrow form-blue caps.
- **Links:** narrow caps at 14px, print-2. They turn ballpoint on hover. The active link gets a 2px ballpoint underline.
- **Order:** a narrow-caps "Order" with a bag icon. The item count is handwritten in ballpoint.
- **Mobile:** a full-screen paper menu with a numbered, ruled list of wide-black links.
- **View switch:** a square bordered pair of narrow-caps cells. The current view is circled in a hand-drawn ballpoint ellipse.

### Capacity Boxes (signature)
Places in a class are shown as a row of small paper squares (11 to 12px, form-blue border at 70%, 3px gap). Taken places carry a drawn ballpoint cross, staggered 45ms apart. A label always carries the counts for assistive tech, and a printed "n left" sits beside the boxes.

### Stamp (signature)
The intro offer is a rubber stamp in narrow extra-bold caps, stacked as label, large price, then terms. It lands with a scale-in overshoot (0.45s) and is used once per surface.

### Exercise Figures (signature)
Graphite stick figures: a head circle and single-stroke limbs at 2.6px, with apparatus in a lighter 1.6px hand at 75% opacity. A slight displacement makes the lines read as pencil rather than vector.

### Ink motion
Strokes draw along their length (`cubic-bezier(0.45, 0.05, 0.25, 1)`): ticks in 0.32s, crosses in 0.2s, margin arrows in 0.7s after 500ms. The headline's highlighter mark draws once on entry. Under reduced motion, every mark appears already drawn.

## Do's and Don'ts

### Do:
- **Do** put every public surface on a square paper sheet on the desk, with the sheet shadow, and give a new page a header strip with a form number.
- **Do** mark the single next action with the highlighter swipe and ballpoint arrow, and use the wavy pen underline for every other action.
- **Do** set field entries in ballpoint on a baseline, with labels in narrow form-blue caps.
- **Do** use canary for customer-copy sections and pink for patient-copy sections, filling the whole sheet.
- **Do** put instructor reassurance in the right margin as handwritten notes, and repeat any essential fact in print.
- **Do** show limited capacity as crossed boxes plus a printed count.
- **Do** make every drawn mark respect `prefers-reduced-motion` by appearing already drawn.

### Don't:
- **Don't** use rounded app buttons, filled pills or coloured button backgrounds on the public site. Actions are highlighter and pen marks.
- **Don't** round sheets or containers. Only the stamp rounds visibly (6px), and slips round by 2px.
- **Don't** use shadows inside a sheet, or hard offset shadows anywhere.
- **Don't** set paragraphs in Archivo or labels and controls in Reenie Beanie.
- **Don't** use yellow highlighter as a background tint or badge, or canary and pink as accent colours.
- **Don't** use the stamp component for anything but the intro offer, or more than once per surface. Stamp pink beyond the stamp is for errors and the margin rule only.
- **Don't** apply this world's tokens, fonts or components to the staff app at `/admin`.
